//@ts-check
/**
 * ZIP Directory Extractor Worker
 *
 * This worker streams a ZIP file, extracts the Central Directory
 * and returns entries as a JSON sequence stream.
 *
 * Usage:
 * https://your-worker.example.com/https%3A%2F%2Fexample.com%2Fmyfile.zip
 *
 * Optional Authorization header will be passed to the source.
 */
export async function streamZipFile(zipUrl, sourceAuthorization) {
  try {
    // Parse URL from pathname - it should be URL encoded

    if (!zipUrl || !zipUrl.startsWith("http")) {
      return new Response(
        "Please provide a URL-encoded ZIP file URL in the path",
        { status: 400 },
      );
    }

    const fetchOptions = sourceAuthorization
      ? {
          headers: {
            Authorization: sourceAuthorization,
            "User-Agent": "Cloudflare-Worker",
          },
        }
      : { "User-Agent": "Cloudflare-Worker" };

    // Create streaming response
    const { readable, writable } = new TransformStream();

    // Process the ZIP file in the background
    processZipFile(zipUrl, fetchOptions, writable).catch((error) => {
      console.error("Error processing ZIP:", error);
      const writer = writable.getWriter();
      writer.write(
        encoder.encode(JSON.stringify({ error: error.message }) + "\n"),
      );
      writer.close();
    });

    // Return streaming response
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain;charset=utf8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.log("ERRRRR", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const encoder = new TextEncoder();

async function processZipFile(url, fetchOptions, writable) {
  const writer = writable.getWriter();

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ZIP file: ${response.status} ${
          response.statusText
        } - ${await response.text()}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is not readable");
    }

    const reader = response.body.getReader();

    // Use a circular buffer to store the most recent data
    // 8MB buffer should be enough for most central directories
    const bufferSize = 8 * 1024 * 1024;
    const buffer = new Uint8Array(bufferSize);
    let writePos = 0;
    let totalBytesRead = 0;
    let firstChunk = true;

    // We'll use this to find the EOCD
    let eocdFound = false;
    let eocdOffset = 0;
    let centralDirOffset = 0;
    let centralDirSize = 0;
    let centralDirEntries = 0;

    // Process the file chunk by chunk
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Quick check for ZIP signature in first chunk
      if (firstChunk) {
        if (
          value.length >= 4 &&
          !(
            value[0] === 0x50 &&
            value[1] === 0x4b &&
            (value[2] === 0x03 || value[2] === 0x05 || value[2] === 0x07)
          )
        ) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                error: "File doesn't appear to be a valid ZIP",
              }) + "\n",
            ),
          );
          await writer.close();
          return;
        }
        firstChunk = false;
      }

      // Add chunk to our circular buffer
      for (let i = 0; i < value.length; i++) {
        buffer[writePos] = value[i];
        writePos = (writePos + 1) % bufferSize;
      }

      totalBytesRead += value.length;

      // If we've read more than our buffer can hold, we need to
      // scan for the EOCD signature in what we have
      if (!eocdFound && totalBytesRead >= 22) {
        // Minimum EOCD size is 22 bytes
        // Search for EOCD signature in the buffer
        eocdOffset = findEOCD(buffer, writePos, bufferSize);

        if (eocdOffset !== -1) {
          eocdFound = true;

          // Read central directory information
          const eocdView = getBufferView(buffer, eocdOffset, bufferSize);
          centralDirEntries = eocdView.getUint16(10, true); // Number of entries
          centralDirSize = eocdView.getUint32(12, true); // Size of central directory
          centralDirOffset = eocdView.getUint32(16, true); // Offset to central directory

          // Check if we have the full central directory
          if (totalBytesRead >= centralDirOffset + centralDirSize) {
            // Process the central directory entries
            await processCentralDirectory(
              buffer,
              centralDirOffset,
              centralDirSize,
              centralDirEntries,
              bufferSize,
              writePos,
              totalBytesRead,
              writer,
            );
            break;
          }
        }
      } else if (
        eocdFound &&
        totalBytesRead >= centralDirOffset + centralDirSize
      ) {
        // We have the complete central directory, process it
        await processCentralDirectory(
          buffer,
          centralDirOffset,
          centralDirSize,
          centralDirEntries,
          bufferSize,
          writePos,
          totalBytesRead,
          writer,
        );
        break;
      }
    }

    // If we've read the entire file and still haven't found the EOCD
    if (!eocdFound) {
      // Try once more with the complete buffer
      eocdOffset = findEOCD(buffer, writePos, bufferSize);

      if (eocdOffset !== -1) {
        const eocdView = getBufferView(buffer, eocdOffset, bufferSize);
        centralDirEntries = eocdView.getUint16(10, true);
        centralDirSize = eocdView.getUint32(12, true);
        centralDirOffset = eocdView.getUint32(16, true);

        await processCentralDirectory(
          buffer,
          centralDirOffset,
          centralDirSize,
          centralDirEntries,
          bufferSize,
          writePos,
          totalBytesRead,
          writer,
        );
      } else {
        await writer.write(
          encoder.encode(
            JSON.stringify({
              error: "Could not locate ZIP central directory",
            }) + "\n",
          ),
        );
      }
    }
  } catch (error) {
    await writer.write(
      encoder.encode(
        JSON.stringify({
          error: error.message,
        }) + "\n",
      ),
    );
  } finally {
    await writer.close();
  }
}

// Find the End of Central Directory record in a circular buffer
function findEOCD(buffer, writePos, bufferSize) {
  // EOCD is at least 22 bytes, and usually at the end of the file
  // Search backwards from the most recently written position

  // We need to check all possible positions where the EOCD might be
  // The maximum comment length is 65535 bytes, so we need to check
  // at most that many positions plus the 22 bytes for the EOCD itself
  const searchSize = Math.min(bufferSize, 65535 + 22);

  for (let i = 0; i < searchSize; i++) {
    // Calculate the position to check, moving backward from writePos
    const checkPos = (writePos - i - 4 + bufferSize) % bufferSize;

    // Check for the EOCD signature (0x06054b50 little-endian)
    if (
      buffer[checkPos] === 0x50 &&
      buffer[(checkPos + 1) % bufferSize] === 0x4b &&
      buffer[(checkPos + 2) % bufferSize] === 0x05 &&
      buffer[(checkPos + 3) % bufferSize] === 0x06
    ) {
      return checkPos;
    }
  }

  return -1; // Not found
}

// Get a DataView for reading from a circular buffer
function getBufferView(buffer, offset, bufferSize) {
  // Create a temporary array with contiguous data
  const tempBuffer = new Uint8Array(22); // Minimum size for EOCD

  for (let i = 0; i < 22; i++) {
    tempBuffer[i] = buffer[(offset + i) % bufferSize];
  }

  return new DataView(tempBuffer.buffer);
}

// Read a string from the circular buffer
function readString(buffer, offset, length, bufferSize) {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = buffer[(offset + i) % bufferSize];
  }
  return new TextDecoder().decode(bytes);
}

// Process all entries in the central directory
async function processCentralDirectory(
  buffer,
  centralDirOffset,
  centralDirSize,
  entryCount,
  bufferSize,
  writePos,
  totalBytesRead,
  writer,
) {
  let currentOffset = centralDirOffset;
  const endOffset = centralDirOffset + centralDirSize;

  // Temporary buffer for contiguous data reading
  const tempBuffer = new Uint8Array(46); // Fixed portion of central directory entry

  for (let i = 0; i < entryCount; i++) {
    // Check for valid CD signature
    let pos = currentOffset % bufferSize;

    if (
      buffer[pos] !== 0x50 ||
      buffer[(pos + 1) % bufferSize] !== 0x4b ||
      buffer[(pos + 2) % bufferSize] !== 0x01 ||
      buffer[(pos + 3) % bufferSize] !== 0x02
    ) {
      await writer.write(
        encoder.encode(
          JSON.stringify({
            error: `Invalid central directory entry signature at offset ${currentOffset}`,
          }) + "\n",
        ),
      );
      break;
    }

    // Copy fixed portion to temp buffer for easier reading
    for (let j = 0; j < 46; j++) {
      tempBuffer[j] = buffer[(currentOffset + j) % bufferSize];
    }

    const view = new DataView(tempBuffer.buffer);

    const filenameLength = view.getUint16(28, true);
    const filenameStart = (currentOffset + 46) % bufferSize;
    const fileName = readString(
      buffer,
      filenameStart,
      filenameLength,
      bufferSize,
    );
    // Read entry metadata
    const entry = {
      fileName,
      isDirectory: fileName.endsWith("/"),
      versionMadeBy: view.getUint16(4, true),
      versionNeeded: view.getUint16(6, true),
      generalFlag: view.getUint16(8, true),
      compressionMethod: view.getUint16(10, true),
      lastModTime: view.getUint16(12, true),
      lastModDate: view.getUint16(14, true),
      crc32: view.getUint32(16, true).toString(16).padStart(8, "0"),
      compressedSize: view.getUint32(20, true),
      uncompressedSize: view.getUint32(24, true),
      filenameLength,
      extraFieldLength: view.getUint16(30, true),
      commentLength: view.getUint16(32, true),
      diskNumberStart: view.getUint16(34, true),
      internalFileAttr: view.getUint16(36, true),
      externalFileAttr: view.getUint32(38, true),
      localHeaderOffset: view.getUint32(42, true),
    };

    // Stream the entry as JSON
    await writer.write(encoder.encode(JSON.stringify(entry) + "\n"));

    // Move to next entry
    currentOffset +=
      46 + entry.filenameLength + entry.extraFieldLength + entry.commentLength;

    // Safety check
    if (currentOffset >= endOffset) {
      break;
    }
  }

  // Send a final message with summary
  await writer.write(
    encoder.encode(
      JSON.stringify({
        status: "complete",
        entriesProcessed: entryCount,
        centralDirectorySize: centralDirSize,
      }) + "\n",
    ),
  );
}

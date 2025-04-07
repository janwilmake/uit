export default {
  async fetch(request, env) {
    const ENABLE_CACHE = true;

    // Get the URL of the ZIP file from the request path
    const url = new URL(request.url);
    const zipUrl = decodeURIComponent(url.pathname.slice(1)); // Remove leading slash

    if (!zipUrl) {
      return new Response("Please provide a ZIP URL in the path", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Handle caching logic
    let maxAge = 0;

    // Check for max-age in query parameter (highest priority)
    if (url.searchParams.has("max-age")) {
      maxAge = parseInt(url.searchParams.get("max-age"), 10) || 0;
    }
    // Check for max-age in Cache-Control header
    else {
      const cacheControl = request.headers.get("Cache-Control");
      if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch && maxAgeMatch[1]) {
          maxAge = parseInt(maxAgeMatch[1], 10) || 0;
        }
      }
    }

    // Check URL-based cache if max-age > 0 and caching is enabled
    if (ENABLE_CACHE && maxAge > 0 && env.ZIP_CACHE) {
      const urlCacheKey = `url:${zipUrl}`;
      try {
        const { value: cachedData, metadata } =
          await env.ZIP_CACHE.getWithMetadata(urlCacheKey, { type: "stream" });

        if (cachedData && metadata && metadata.createdAt) {
          const cacheAge = (Date.now() - metadata.createdAt) / 1000; // Convert to seconds

          if (cacheAge < maxAge) {
            // Cache is still valid according to max-age
            return new Response(cachedData, {
              headers: {
                "Content-Type": "text/plain;charset=utf8",
                "Cache-Control": `max-age=${maxAge}`,
                "X-Cache": "HIT",
                "X-Cache-Age": Math.floor(cacheAge),
              },
            });
          }
        }
      } catch (error) {
        console.error("Cache retrieval error:", error);
      }
    }

    // Create a transform stream to process the response
    const { readable, writable } = new TransformStream();

    // Process the ZIP file in the background
    processZip(writable, zipUrl, env, maxAge, ENABLE_CACHE).catch((err) => {
      console.error("Error processing ZIP file:", err);
    });

    // Return a streaming response
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": maxAge > 0 ? `max-age=${maxAge}` : "no-cache",
        "X-Cache": "MISS",
      },
    });
  },
};

async function processZip(writable, zipUrl, env, maxAge, enableCache) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const chunks = [];

  // Logger function that logs to both console and the writer
  const log = async (message, level = "info") => {
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    console[level](msg);

    const logObj = { [level]: msg };
    await writer.write(encoder.encode(JSON.stringify(logObj) + "\n"));
    chunks.push(encoder.encode(JSON.stringify(logObj) + "\n"));
  };

  try {
    await log(
      "Starting ZIP processing with optimized early termination strategy",
    );

    // Define buffer sizes
    const MAX_BUFFER_SIZE = 64 * 1024 * 1024; // 64MB maximum to keep in memory
    const EOCD_SEARCH_SIZE = 65536; // 64KB for EOCD search
    const EOCD_SIGNATURE = [0x50, 0x4b, 0x05, 0x06];

    // First pass: minimal fetch to try to identify file structure
    const minimumBufferSize = Math.max(EOCD_SEARCH_SIZE * 2, 1024 * 1024); // At least 1MB or 2x EOCD search size
    let buffer = new Uint8Array(0);
    let totalBytesRead = 0;
    let eocdrFound = false;
    let eocdrOffset = -1;
    let centralDirOffset = -1;
    let centralDirSize = -1;
    let centralDirEntries = -1;
    let commentLength = -1;

    // Begin fetch
    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`,
      );
    }

    // Check for etag in response headers
    const etag = response.headers.get("etag");

    // Get reader
    const reader = response.body.getReader();

    // Keep track of chunks for potential cancellation
    const chunks = [];

    // Stream reading loop with early termination strategy
    let canTerminateEarly = false;
    let needMoreBytes = true;

    while (needMoreBytes) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytesRead += value.length;
      chunks.push(value);

      // Append to buffer, potentially discarding old data if too large
      if (buffer.length + value.length > MAX_BUFFER_SIZE) {
        // Keep as much as possible, prioritizing the most recent data
        const keepAmount = MAX_BUFFER_SIZE - value.length;
        if (keepAmount > 0) {
          const tempBuffer = new Uint8Array(keepAmount + value.length);
          tempBuffer.set(buffer.slice(buffer.length - keepAmount), 0);
          tempBuffer.set(value, keepAmount);
          buffer = tempBuffer;
        } else {
          // If the new chunk is larger than our max, just keep the end of it
          buffer = value.slice(Math.max(0, value.length - MAX_BUFFER_SIZE));
        }
      } else {
        // We can just append
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;
      }

      // After we've read at least minimumBufferSize bytes, start checking for EOCD
      if (buffer.length >= minimumBufferSize && !eocdrFound) {
        // Search for EOCD in the last EOCD_SEARCH_SIZE bytes
        const searchSize = Math.min(buffer.length, EOCD_SEARCH_SIZE);
        const searchBuffer = buffer.slice(buffer.length - searchSize);

        eocdrOffset = findLastSequence(searchBuffer, EOCD_SIGNATURE);

        if (eocdrOffset !== -1) {
          // Adjust offset to be relative to the full buffer
          eocdrOffset += buffer.length - searchSize;
          eocdrFound = true;

          // If we have enough data after the EOCD signature for a basic record (22 bytes)
          if (eocdrOffset + 22 <= buffer.length) {
            const eocdr = buffer.slice(eocdrOffset);

            // Extract EOCD fields
            centralDirEntries = eocdr[10] | (eocdr[11] << 8);
            centralDirSize =
              eocdr[12] |
              (eocdr[13] << 8) |
              (eocdr[14] << 16) |
              (eocdr[15] << 24);
            centralDirOffset =
              eocdr[16] |
              (eocdr[17] << 8) |
              (eocdr[18] << 16) |
              (eocdr[19] << 24);
            commentLength = eocdr[20] | (eocdr[21] << 8);

            await log(
              `Found EOCD at buffer offset ${eocdrOffset}, CD offset=${centralDirOffset}, size=${centralDirSize}, entries=${centralDirEntries}`,
            );

            // We can now potentially terminate early if we have the complete central directory
            // Calculate the global file offset where our buffer begins
            const globalOffset = totalBytesRead - buffer.length;

            // Check if we have the full central directory in our buffer
            if (
              centralDirOffset >= globalOffset &&
              centralDirOffset + centralDirSize <= globalOffset + buffer.length
            ) {
              await log(
                "Complete Central Directory is in buffer, can terminate reading early",
              );
              canTerminateEarly = true;
              needMoreBytes = false;
            } else {
              // We need to keep reading until we have the complete central directory
              const missingStart = Math.max(0, globalOffset - centralDirOffset);
              const missingEnd = Math.max(
                0,
                centralDirOffset +
                  centralDirSize -
                  (globalOffset + buffer.length),
              );

              if (missingStart > 0) {
                await log(
                  `Need to read more data - Central Directory starts ${missingStart} bytes before our buffer`,
                );
              }

              if (missingEnd > 0) {
                await log(
                  `Need to read more data - Central Directory extends ${missingEnd} bytes beyond our buffer`,
                );
              }
            }
          }
        }
      }

      // If we've found the EOCD and read enough data to determine if CD is in buffer,
      // check if we can terminate reading
      if (eocdrFound && canTerminateEarly) {
        await log(
          `Terminating file reading early after ${totalBytesRead} bytes`,
        );
        // We have all the data we need, so we can break out of the loop
        break;
      }
    }

    // Process the buffer to extract the entries
    await processBufferedData(
      buffer,
      writer,
      encoder,
      chunks,
      log,
      totalBytesRead,
      enableCache,
      env,
      maxAge,
      etag,
      zipUrl,
    );
  } catch (error) {
    await log(`Error: ${error.message}`, "error");
    await writer.close();
  }
}

async function processBufferedData(
  buffer,
  writer,
  encoder,
  chunks,
  log,
  totalBytesRead,
  enableCache,
  env,
  maxAge,
  etag,
  zipUrl,
) {
  try {
    await log(
      `Buffered ${buffer.length} bytes of data from ${totalBytesRead} total bytes`,
    );

    // First, look for the End of Central Directory in the last 64KB
    const EOCD_SIGNATURE = [0x50, 0x4b, 0x05, 0x06];
    const searchSize = Math.min(buffer.length, 65536);
    const searchBuffer = buffer.slice(buffer.length - searchSize);

    let eocdrOffset = findLastSequence(searchBuffer, EOCD_SIGNATURE);

    if (eocdrOffset === -1) {
      throw new Error("End of Central Directory not found in the last 65KB");
    }

    // Adjust offset to be relative to the full buffer
    eocdrOffset += buffer.length - searchSize;

    await log(`Found End of Central Directory at buffer offset ${eocdrOffset}`);

    // Extract data from the EOCD record
    const eocdr = buffer.slice(eocdrOffset);

    // Check if we have enough data for minimal EOCDR (22 bytes)
    if (eocdr.length < 22) {
      throw new Error("Incomplete End of Central Directory Record");
    }

    // Extract end of central directory fields
    const centralDirTotalEntries = eocdr[10] | (eocdr[11] << 8);
    const centralDirSize =
      eocdr[12] | (eocdr[13] << 8) | (eocdr[14] << 16) | (eocdr[15] << 24);
    const centralDirOffset =
      eocdr[16] | (eocdr[17] << 8) | (eocdr[18] << 16) | (eocdr[19] << 24);
    const commentLength = eocdr[20] | (eocdr[21] << 8);

    // Extract comment if present
    let comment = "";
    if (commentLength > 0 && eocdr.length >= 22 + commentLength) {
      const commentBytes = eocdr.slice(22, 22 + commentLength);
      comment = new TextDecoder().decode(commentBytes);
    }

    await log(
      `Central Directory: offset=${centralDirOffset}, size=${centralDirSize}, entries=${centralDirTotalEntries}`,
    );

    // Calculate the global file offset where our buffer begins
    // This is the total file size minus our buffer size
    const globalOffset = totalBytesRead - buffer.length;

    // Calculate the position of the Central Directory relative to our buffer
    const bufferStartOffset = centralDirOffset - globalOffset;

    if (bufferStartOffset < 0) {
      throw new Error(
        `Central Directory is outside our buffered region (starts at file offset ${centralDirOffset}, our buffer starts at ${globalOffset})`,
      );
    }

    if (bufferStartOffset + centralDirSize > buffer.length) {
      throw new Error(
        `Central Directory (${centralDirSize} bytes) extends beyond our buffer limit (starts at buffer offset ${bufferStartOffset}, buffer size ${buffer.length})`,
      );
    }

    await log(`Central Directory starts at buffer offset ${bufferStartOffset}`);

    // Extract the Central Directory from our buffer
    const centralDirectory = buffer.slice(
      bufferStartOffset,
      bufferStartOffset + centralDirSize,
    );

    await log(
      `Processing ${centralDirTotalEntries} entries from Central Directory of size ${centralDirectory.length} bytes`,
    );

    // Process entries from the central directory
    let position = 0;
    let processedEntries = 0;

    while (
      position < centralDirectory.length &&
      processedEntries < centralDirTotalEntries
    ) {
      // Check for central directory header signature (0x50 0x4B 0x01 0x02)
      if (
        position + 46 <= centralDirectory.length &&
        centralDirectory[position] === 0x50 &&
        centralDirectory[position + 1] === 0x4b &&
        centralDirectory[position + 2] === 0x01 &&
        centralDirectory[position + 3] === 0x02
      ) {
        // Extract central directory header fields
        const compressionMethod =
          centralDirectory[position + 10] |
          (centralDirectory[position + 11] << 8);
        const crc32 =
          centralDirectory[position + 16] |
          (centralDirectory[position + 17] << 8) |
          (centralDirectory[position + 18] << 16) |
          (centralDirectory[position + 19] << 24);
        const compressedSize =
          centralDirectory[position + 20] |
          (centralDirectory[position + 21] << 8) |
          (centralDirectory[position + 22] << 16) |
          (centralDirectory[position + 23] << 24);
        const uncompressedSize =
          centralDirectory[position + 24] |
          (centralDirectory[position + 25] << 8) |
          (centralDirectory[position + 26] << 16) |
          (centralDirectory[position + 27] << 24);
        const fileNameLength =
          centralDirectory[position + 28] |
          (centralDirectory[position + 29] << 8);
        const extraFieldLength =
          centralDirectory[position + 30] |
          (centralDirectory[position + 31] << 8);
        const fileCommentLength =
          centralDirectory[position + 32] |
          (centralDirectory[position + 33] << 8);
        const dosModTime =
          centralDirectory[position + 12] |
          (centralDirectory[position + 13] << 8);
        const dosModDate =
          centralDirectory[position + 14] |
          (centralDirectory[position + 15] << 8);
        const relativeOffsetOfLocalHeader =
          centralDirectory[position + 42] |
          (centralDirectory[position + 43] << 8) |
          (centralDirectory[position + 44] << 16) |
          (centralDirectory[position + 45] << 24);

        // Check if we have enough data for filename, extra field, and comment
        const entrySize =
          46 + fileNameLength + extraFieldLength + fileCommentLength;
        if (position + entrySize > centralDirectory.length) {
          throw new Error(
            `Incomplete central directory entry at position ${position}`,
          );
        }

        // Extract filename
        const fileNameBytes = centralDirectory.slice(
          position + 46,
          position + 46 + fileNameLength,
        );
        const fileName = new TextDecoder().decode(fileNameBytes);

        // Extract comment if present
        let fileComment = "";
        if (fileCommentLength > 0) {
          const fileCommentBytes = centralDirectory.slice(
            position + 46 + fileNameLength + extraFieldLength,
            position +
              46 +
              fileNameLength +
              extraFieldLength +
              fileCommentLength,
          );
          fileComment = new TextDecoder().decode(fileCommentBytes);
        }

        // Format modification time
        const modTime = formatModTime(dosModTime, dosModDate);

        // Create entry object with only meaningful fields
        const entry = {
          fileName,
          compressedSize,
          uncompressedSize,
          compressionMethod:
            compressionMethod === 8
              ? "deflate"
              : compressionMethod === 0
              ? "store"
              : compressionMethod.toString(),
          isDirectory: fileName.endsWith("/"),
          modified: modTime,
          crc32: crc32.toString(16).padStart(8, "0"),
          offset: relativeOffsetOfLocalHeader,
        };

        // Only include comment if not empty
        if (fileComment) {
          entry.fileComment = fileComment;
        }

        // Stream the entry immediately
        const entryJson = JSON.stringify(entry) + "\n";
        const output = encoder.encode(entryJson);
        await writer.write(output);

        // Store for caching
        chunks.push(output);

        // Move to next entry
        position += entrySize;
        processedEntries++;
      } else {
        // If we didn't find a valid header, something is wrong
        // This could happen if the ZIP file is corrupt
        throw new Error(
          `Invalid central directory header at position ${position} (signature: ${centralDirectory[
            position
          ].toString(16)}${centralDirectory[position + 1].toString(
            16,
          )}${centralDirectory[position + 2].toString(16)}${centralDirectory[
            position + 3
          ].toString(16)})`,
        );
      }
    }

    await log(
      `Processed ${processedEntries} of ${centralDirTotalEntries} expected entries`,
    );

    // Create end of central directory object
    const endOfCentralDir = {
      type: "end_of_central_directory",
      totalEntries: centralDirTotalEntries,
      processedEntries,
      comment: comment || undefined,
    };

    // Stream the end of central directory record
    const endJson = JSON.stringify(endOfCentralDir) + "\n";
    const endOutput = encoder.encode(endJson);
    await writer.write(endOutput);

    // Store for caching
    chunks.push(endOutput);

    // Save to KV caches if needed
    if (enableCache && env.ZIP_CACHE) {
      await log("Saving to cache");

      // Create the combined payload for storing
      const combinedChunks = concatenateUint8Arrays(chunks);

      // Fixed expiration of 30 days (2592000 seconds)
      const expirationTtl = 2592000;

      // Save to etag-based cache
      if (etag) {
        await env.ZIP_CACHE.put(etag, combinedChunks, { expirationTtl });
      }

      // Save to URL-based cache with timestamp in metadata
      const urlCacheKey = `url:${zipUrl}`;
      const metadata = { createdAt: Date.now() };

      await env.ZIP_CACHE.put(urlCacheKey, combinedChunks, {
        expirationTtl,
        metadata,
      });

      await log("Cache saved successfully");
    }

    await writer.close();
  } catch (error) {
    await log(`Error processing buffered data: ${error.message}`, "error");
    await writer.close();
  }
}

// Helper function to format DOS date/time to ISO string
function formatModTime(dosTime, dosDate) {
  // DOS time format: bits 0-4: second/2, bits 5-10: minute, bits 11-15: hour
  // DOS date format: bits 0-4: day, bits 5-8: month, bits 9-15: year-1980
  const second = (dosTime & 0x1f) * 2;
  const minute = (dosTime >> 5) & 0x3f;
  const hour = (dosTime >> 11) & 0x1f;

  const day = dosDate & 0x1f;
  const month = ((dosDate >> 5) & 0xf) - 1; // 0-based month
  const year = ((dosDate >> 9) & 0x7f) + 1980;

  try {
    const date = new Date(year, month, day, hour, minute, second);
    return date.toISOString();
  } catch (e) {
    return null; // Return null for invalid dates
  }
}

// Function to find the last occurrence of a byte sequence in a Uint8Array
function findLastSequence(array, sequence) {
  for (let i = array.length - sequence.length; i >= 0; i--) {
    let found = true;
    for (let j = 0; j < sequence.length; j++) {
      if (array[i + j] !== sequence[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  return -1;
}

// Helper function to concatenate Uint8Arrays
function concatenateUint8Arrays(arrays) {
  // Calculate total length
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);

  // Create a new array with the total length
  const result = new Uint8Array(totalLength);

  // Copy each array into the result
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

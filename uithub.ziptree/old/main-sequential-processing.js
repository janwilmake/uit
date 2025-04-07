export default {
  async fetch(request, env) {
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

    // Check URL-based cache if max-age > 0
    if (maxAge > 0 && env.ZIP_CACHE) {
      const urlCacheKey = `url:${zipUrl}`;
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
    }

    // Create a transform stream to process the response
    const { readable, writable } = new TransformStream();

    // Process the ZIP file in the background using the optimized method
    processZipOptimized(writable, zipUrl, env, maxAge).catch((err) => {
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

async function processZipOptimized(writable, zipUrl, env, maxAge) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const chunks = [];

  try {
    // First, get content length with HEAD request
    const headResponse = await fetch(zipUrl, { method: "HEAD" });

    if (!headResponse.ok) {
      throw new Error(
        `Failed to fetch HEAD: ${headResponse.status} ${headResponse.statusText}`,
      );
    }

    // Check for etag in response headers
    const etag = headResponse.headers.get("etag");

    // If we have an etag, check the KV cache
    if (etag && env.ZIP_CACHE) {
      const cachedData = await env.ZIP_CACHE.get(etag, { type: "stream" });
      if (cachedData) {
        // We found cached data, stream it directly
        const reader = cachedData.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
        await writer.close();
        return;
      }
    }

    const contentLength = parseInt(
      headResponse.headers.get("content-length"),
      10,
    );

    if (!contentLength || isNaN(contentLength)) {
      // If content length is unknown, fall back to the original approach
      await processZipFallback(
        writer,
        encoder,
        chunks,
        zipUrl,
        env,
        maxAge,
        etag,
      );
      return;
    }

    // Start by looking for the End of Central Directory record
    // Strategy: Download chunks from the end of the file until we find the signature
    // The End of Central Directory record is at least 22 bytes, typically not much larger
    // Unless there's a large comment, it should be near the end of the file

    // Start with a larger chunk from the end of file to handle bigger ZIP archives
    // Using 64KB which should be enough for most ZIP files' end records
    const chunkSize = 65536; // 64KB
    let offset = Math.max(0, contentLength - chunkSize);
    let buffer = await fetchRange(zipUrl, offset, contentLength - 1);

    // Find the End of Central Directory signature (0x50 0x4B 0x05 0x06)
    let eocdrOffset = findLastSequence(buffer, [0x50, 0x4b, 0x05, 0x06]);

    // If not found in the last chunk, progressively try larger chunks
    // This handles ZIP files with very large comments or many entries
    if (eocdrOffset === -1) {
      // Try increasingly larger chunks, up to a reasonable limit
      // We'll try chunks of: 64KB, 256KB, 1MB, 4MB, 16MB, 64MB
      let maxChunkSize = 64 * 1024 * 1024; // 16MB max - should be enough for practically any ZIP
      let currentChunkSize = chunkSize * 4; // Start with 256KB (4x the initial)

      while (currentChunkSize <= maxChunkSize && eocdrOffset === -1) {
        // Log progress to the stream
        await writer.write(
          encoder.encode(
            JSON.stringify({
              info: `EOCDR not found in ${chunkSize / 1024}KB chunk, trying ${
                currentChunkSize / 1024
              }KB chunk`,
            }) + "\n",
          ),
        );

        // Try a larger chunk from the end
        offset = Math.max(0, contentLength - currentChunkSize);
        buffer = await fetchRange(zipUrl, offset, contentLength - 1);
        eocdrOffset = findLastSequence(buffer, [0x50, 0x4b, 0x05, 0x06]);

        currentChunkSize *= 4; // Quadruple the chunk size for next attempt
      }

      // If still not found, fall back to the original implementation
      if (eocdrOffset === -1) {
        await writer.write(
          encoder.encode(
            JSON.stringify({
              info: `EOCDR not found in chunks up to ${
                maxChunkSize / 1024 / 1024
              }MB, falling back to sequential method`,
            }) + "\n",
          ),
        );

        await processZipFallback(
          writer,
          encoder,
          chunks,
          zipUrl,
          env,
          maxAge,
          etag,
        );
        return;
      }
    }

    // We found the End of Central Directory Record
    const eocdr = buffer.slice(eocdrOffset);

    // Check if we have enough data for minimal EOCDR (22 bytes)
    if (eocdr.length < 22) {
      throw new Error("Incomplete End of Central Directory Record");
    }

    // Extract end of central directory fields
    const diskNumber = eocdr[4] | (eocdr[5] << 8);
    const centralDirDiskStart = eocdr[6] | (eocdr[7] << 8);
    const centralDirEntriesOnDisk = eocdr[8] | (eocdr[9] << 8);
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

    // Multi-volume archives are not supported
    if (diskNumber !== 0 || centralDirDiskStart !== 0) {
      throw new Error("Multi-volume ZIP archives are not supported");
    }

    // Now fetch the central directory
    const centralDirectoryStart = centralDirOffset;
    const centralDirectoryEnd = centralDirOffset + centralDirSize;

    // Fetch the central directory
    const centralDirectory = await fetchRange(
      zipUrl,
      centralDirectoryStart,
      centralDirectoryEnd - 1,
    );

    // Now process entries from the central directory
    let position = 0;
    for (let i = 0; i < centralDirTotalEntries; i++) {
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
      } else {
        throw new Error(
          `Invalid central directory header at position ${position}`,
        );
      }
    }

    // Create end of central directory object
    const endOfCentralDir = {
      type: "end_of_central_directory",
      totalEntries: centralDirTotalEntries,
      comment: comment || undefined,
    };

    // Stream the end of central directory record
    const endJson = JSON.stringify(endOfCentralDir) + "\n";
    const endOutput = encoder.encode(endJson);
    await writer.write(endOutput);

    // Store for caching
    chunks.push(endOutput);

    // Save to KV caches if needed
    if (env.ZIP_CACHE) {
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
    }

    await writer.close();
  } catch (error) {
    console.error("Error in optimized processor:", error);

    // Write error to the stream
    const errorJson =
      JSON.stringify({
        error: error.message,
        note: "Falling back to sequential processing",
      }) + "\n";
    const errorOutput = encoder.encode(errorJson);
    await writer.write(errorOutput);

    // Fall back to the original approach
    await processZipFallback(
      writer,
      encoder,
      chunks,
      zipUrl,
      env,
      maxAge,
      null,
    );
  }
}

// Helper function to fetch a specific range of a file
async function fetchRange(url, start, end) {
  try {
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(
        `Failed to fetch range: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error("Range request failed:", error);
    throw new Error(
      "Range requests not supported by the server. Use fallback method.",
    );
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

// Fallback to original sequential processing approach
async function processZipFallback(
  writer,
  encoder,
  chunks,
  zipUrl,
  env,
  maxAge,
  etag,
) {
  try {
    // Fetch the ZIP file
    const response = await fetch(zipUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`,
      );
    }

    // Check for etag in response headers if not already provided
    etag = etag || response.headers.get("etag");

    // ZIP file parsing state
    let buffer = new Uint8Array(0);
    let centralDirectoryFound = false;
    let endOfCentralDirectoryFound = false;

    const reader = response.body.getReader();

    await writer.write(
      encoder.encode(
        JSON.stringify({
          info: "Using sequential fallback method",
        }) + "\n",
      ),
    );

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Append new data to our buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Process the buffer
      while (buffer.length >= 4) {
        // Check for central directory header signature (0x50 0x4B 0x01 0x02)
        if (
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x01 &&
          buffer[3] === 0x02
        ) {
          centralDirectoryFound = true;

          // Central directory header is at least 46 bytes
          if (buffer.length < 46) break;

          // Extract central directory header fields
          const compressionMethod = buffer[10] | (buffer[11] << 8);
          const crc32 =
            buffer[16] |
            (buffer[17] << 8) |
            (buffer[18] << 16) |
            (buffer[19] << 24);
          const compressedSize =
            buffer[20] |
            (buffer[21] << 8) |
            (buffer[22] << 16) |
            (buffer[23] << 24);
          const uncompressedSize =
            buffer[24] |
            (buffer[25] << 8) |
            (buffer[26] << 16) |
            (buffer[27] << 24);
          const fileNameLength = buffer[28] | (buffer[29] << 8);
          const extraFieldLength = buffer[30] | (buffer[31] << 8);
          const fileCommentLength = buffer[32] | (buffer[33] << 8);
          const dosModTime = buffer[12] | (buffer[13] << 8);
          const dosModDate = buffer[14] | (buffer[15] << 8);
          const relativeOffsetOfLocalHeader =
            buffer[42] |
            (buffer[43] << 8) |
            (buffer[44] << 16) |
            (buffer[45] << 24);

          // Check if we have enough data for filename, extra field, and comment
          const entrySize =
            46 + fileNameLength + extraFieldLength + fileCommentLength;
          if (buffer.length < entrySize) break;

          // Extract filename
          const fileNameBytes = buffer.slice(46, 46 + fileNameLength);
          const fileName = new TextDecoder().decode(fileNameBytes);

          // Extract comment if present
          let fileComment = "";
          if (fileCommentLength > 0) {
            const fileCommentBytes = buffer.slice(
              46 + fileNameLength + extraFieldLength,
              46 + fileNameLength + extraFieldLength + fileCommentLength,
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

          // Move past this entry
          buffer = buffer.slice(entrySize);
        }
        // Check for end of central directory record (0x50 0x4B 0x05 0x06)
        else if (
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x05 &&
          buffer[3] === 0x06
        ) {
          endOfCentralDirectoryFound = true;

          // End of central directory record is at least 22 bytes
          if (buffer.length < 22) break;

          // Extract end of central directory fields
          const centralDirTotalEntries = buffer[10] | (buffer[11] << 8);
          const commentLength = buffer[20] | (buffer[21] << 8);

          // Check if we have enough data for the comment
          if (buffer.length < 22 + commentLength) break;

          // Extract comment if present
          let comment = "";
          if (commentLength > 0) {
            const commentBytes = buffer.slice(22, 22 + commentLength);
            comment = new TextDecoder().decode(commentBytes);
          }

          // Create simplified end of central directory object
          const endOfCentralDir = {
            type: "end_of_central_directory",
            totalEntries: centralDirTotalEntries,
            comment: comment || undefined,
          };

          // Stream the end of central directory record
          const endJson = JSON.stringify(endOfCentralDir) + "\n";
          const output = encoder.encode(endJson);
          await writer.write(output);

          // Store for caching
          chunks.push(output);

          // Move past this record
          buffer = buffer.slice(22 + commentLength);

          // We can stop processing after finding the end of central directory
          break;
        }
        // If no signature matched, skip a byte
        else {
          buffer = buffer.slice(1);
        }
      }

      // If we found the end of central directory, we can stop reading
      if (endOfCentralDirectoryFound) {
        break;
      }
    }

    // If we didn't find a central directory, send a message
    if (!centralDirectoryFound) {
      const errorJson =
        JSON.stringify({ error: "No central directory found in ZIP file" }) +
        "\n";
      const errorOutput = encoder.encode(errorJson);
      await writer.write(errorOutput);

      // Store for caching
      chunks.push(errorOutput);
    }

    // Save to KV caches if needed
    if (env.ZIP_CACHE) {
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
    }
  } catch (error) {
    // Write error to the stream
    const errorJson = JSON.stringify({ error: error.message }) + "\n";
    const errorOutput = encoder.encode(errorJson);
    await writer.write(errorOutput);
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

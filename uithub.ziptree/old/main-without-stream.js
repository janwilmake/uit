export default {
  async fetch(request, env) {
    // Get the URL of the ZIP file from the request path
    const url = new URL(request.url);
    const zipUrl = url.pathname.slice(1); // Remove leading slash

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
      const cachedEntry = await env.ZIP_CACHE.get(urlCacheKey, {
        type: "json",
      });

      if (cachedEntry && cachedEntry.createdAt) {
        const cacheAge = (Date.now() - cachedEntry.createdAt) / 1000; // Convert to seconds

        if (cacheAge < maxAge) {
          // Cache is still valid according to max-age
          return new Response(cachedEntry.data, {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
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

    // Process the ZIP file in the background
    processZip(writable, zipUrl, env, maxAge).catch((err) => {
      console.error("Error processing ZIP file:", err);
    });

    // Return a streaming response
    return new Response(readable, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": maxAge > 0 ? `max-age=${maxAge}` : "no-cache",
        "X-Cache": "MISS",
      },
    });
  },
};

async function processZip(writable, zipUrl, env, maxAge) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  try {
    // Fetch the ZIP file
    const response = await fetch(zipUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`,
      );
    }

    // Check for etag in response headers
    const etag = response.headers.get("etag");

    // If we have an etag, check the KV cache
    if (etag && env.ZIP_CACHE) {
      const cachedData = await env.ZIP_CACHE.get(etag);
      if (cachedData) {
        // We found cached data, return it instead
        const cachedOutput = encoder.encode(cachedData);
        await writer.write(cachedOutput);
        await writer.close();
        return;
      }
    }

    // Start KV caching in the background if we have an etag
    let cacheData = "";

    const reader = response.body.getReader();

    // ZIP file parsing state
    let buffer = new Uint8Array(0);
    let centralDirectoryFound = false;
    let endOfCentralDirectoryFound = false;

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

          // Add to cache data if we have an etag
          if (etag) {
            cacheData += entryJson;
          }

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

          // Add to cache data if we have an etag
          if (etag) {
            cacheData += endJson;
          }

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

      // Add to cache data if we have an etag
      if (etag) {
        cacheData += errorJson;
      }
    }

    // Save to KV cache if we have an etag
    if (etag && env.ZIP_CACHE && cacheData) {
      // Use put with expiration (e.g., 24 hours = 86400 seconds)
      await env.ZIP_CACHE.put(etag, cacheData, { expirationTtl: 86400 });
    }

    // Save to URL-based cache with timestamp
    if (env.ZIP_CACHE && cacheData) {
      const urlCacheEntry = {
        createdAt: Date.now(),
        data: cacheData,
      };

      const urlCacheKey = `url:${zipUrl}`;
      // Set expiration much longer than max-age to allow for stale-while-revalidate patterns
      // Default to 7 days if no max-age specified
      const expirationTtl =
        maxAge > 0 ? Math.max(maxAge * 3, 86400 * 7) : 86400 * 7;

      await env.ZIP_CACHE.put(urlCacheKey, JSON.stringify(urlCacheEntry), {
        expirationTtl,
      });
    }

    await writer.close();
  } catch (error) {
    // Write error to the stream
    const errorJson = JSON.stringify({ error: error.message }) + "\n";
    const errorOutput = encoder.encode(errorJson);
    await writer.write(errorOutput);
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

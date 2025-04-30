//@ts-ignore
import defaultGenignore from "./public/default-genignore.txt";
import { FilterOptions, ResponseOptions } from "./types";
/**
 * Processes the ZIP stream to find .genignore in the root directory.
 * Stops when it finds .genignore, or when it encounters a non-dot file,
 * indicating we've passed all potential dot files.
 *
 * @param zipStream The readable stream of the ZIP file
 * @returns The parsed exclude patterns from .genignore, or null if not found
 */
export async function findGenIgnoreInZip(
  zipStream: ReadableStream,
): Promise<string[] | null> {
  const reader = zipStream.getReader();

  // Pre-allocate a buffer
  let buffer = new Uint8Array(32768); // 32KB initial size
  let bufferSize = 0;

  const textDecoder = new TextDecoder();
  let genIgnoreContent: string | null = null;
  let foundNonDotFile = false;

  try {
    while (true) {
      // Fetch more data if buffer is getting low
      if (bufferSize < 30) {
        const { done, value } = await reader.read();
        if (done && bufferSize === 0) break; // No more data and buffer is empty
        if (done) break;

        // Resize buffer if needed
        if (bufferSize + value.length > buffer.length) {
          const newBuffer = new Uint8Array(
            Math.max(buffer.length * 2, bufferSize + value.length),
          );
          newBuffer.set(buffer.subarray(0, bufferSize));
          buffer = newBuffer;
        }

        // Append new data
        buffer.set(value, bufferSize);
        bufferSize += value.length;
        continue; // Re-evaluate with new data
      }

      let position = 0;

      // Process entries while we have enough data
      while (position + 30 <= bufferSize) {
        // Check for local file header signature (0x04034b50)
        if (
          buffer[position] === 0x50 &&
          buffer[position + 1] === 0x4b &&
          buffer[position + 2] === 0x03 &&
          buffer[position + 3] === 0x04
        ) {
          // Extract header information
          const compressionMethod =
            buffer[position + 8] | (buffer[position + 9] << 8);
          const compressedSize =
            buffer[position + 18] |
            (buffer[position + 19] << 8) |
            (buffer[position + 20] << 16) |
            (buffer[position + 21] << 24);
          const fileNameLength =
            buffer[position + 26] | (buffer[position + 27] << 8);
          const extraFieldLength =
            buffer[position + 28] | (buffer[position + 29] << 8);

          // Validate sizes to avoid overflow
          if (
            fileNameLength < 0 ||
            extraFieldLength < 0 ||
            compressedSize < 0
          ) {
            // Invalid entry, skip forward
            position++;
            continue;
          }

          // Check if we have enough data for the complete entry
          const totalEntrySize =
            30 + fileNameLength + extraFieldLength + compressedSize;
          if (position + totalEntrySize > bufferSize) {
            break; // Wait for more data
          }

          // Extract filename
          const fileNameStart = position + 30;
          const fileNameEnd = fileNameStart + fileNameLength;

          const fileName = textDecoder.decode(
            buffer.subarray(fileNameStart, fileNameEnd),
          );

          // We're only interested in files directly in the root directory
          const pathParts = fileName.split("/");

          // If not in root directory, skip
          if (pathParts.length !== 2 || pathParts[1] === "") {
            position += totalEntrySize;
            continue;
          }

          const isGenIgnore = pathParts[1] === ".genignore";
          const isDotFile = pathParts[1].startsWith(".");

          // If we found .genignore, read its content
          if (isGenIgnore) {
            // Calculate data position
            const dataPosition =
              position + 30 + fileNameLength + extraFieldLength;

            // Extract the compressed data
            const compressedData = buffer.subarray(
              dataPosition,
              dataPosition + compressedSize,
            );

            // Decompress if needed and read content
            if (compressionMethod === 8) {
              // Create a decompression stream
              const compressedStream = new ReadableStream({
                start(controller) {
                  controller.enqueue(compressedData);
                  controller.close();
                },
              });

              const decompressedStream = compressedStream.pipeThrough(
                new DecompressionStream("deflate-raw"),
              );

              // Read the decompressed content
              const reader = decompressedStream.getReader();
              const chunks: Uint8Array[] = [];

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }

              // Combine chunks
              let totalLength = 0;
              for (const chunk of chunks) {
                totalLength += chunk.length;
              }

              const content = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunk of chunks) {
                content.set(chunk, offset);
                offset += chunk.length;
              }

              genIgnoreContent = textDecoder.decode(content);
            } else {
              // No compression, read directly
              genIgnoreContent = textDecoder.decode(compressedData);
            }

            // We found .genignore, so we can stop processing
            break;
          }

          // If we found a non-dot file, we can stop looking for .genignore
          // because GitHub sorts files alphabetically, and dot files come first
          if (!isDotFile) {
            foundNonDotFile = true;
            break;
          }

          position += totalEntrySize;
        } else if (
          buffer[position] === 0x50 &&
          buffer[position + 1] === 0x4b &&
          buffer[position + 2] === 0x01 &&
          buffer[position + 3] === 0x02
        ) {
          // We've reached the central directory, so we're done
          break;
        } else {
          // Not a valid header, move forward
          position++;
        }
      }

      // If we found .genignore or a non-dot file, we're done
      if (genIgnoreContent || foundNonDotFile) {
        break;
      }

      // Compact the buffer
      if (position > 0) {
        if (position < bufferSize) {
          buffer.copyWithin(0, position, bufferSize);
        }
        bufferSize -= position;
      }

      // Get more data
      const { done, value } = await reader.read();
      if (done) break;

      // Ensure buffer is large enough
      if (bufferSize + value.length > buffer.length) {
        const newBuffer = new Uint8Array(
          Math.max(buffer.length * 2, bufferSize + value.length),
        );
        newBuffer.set(buffer.subarray(0, bufferSize));
        buffer = newBuffer;
      }

      // Append new data
      buffer.set(value, bufferSize);
      bufferSize += value.length;
    }
  } catch (error) {
    console.error("Error finding .genignore:", error);
  } finally {
    // Make sure to release the lock
    reader.releaseLock();
  }

  // Parse the .genignore content if found
  if (genIgnoreContent) {
    return parseGenIgnore(genIgnoreContent);
  }

  return null;
}

/**
 * Parse the .genignore file content into an array of exclude patterns
 *
 * @param content The content of the .genignore file
 * @returns Array of exclude patterns
 */
export function parseGenIgnore(content: string): string[] {
  // Split by lines, trim whitespace, and filter out comments and empty lines
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

/**
 * Integrates the first pass for .genignore into the current process flow.
 * Returns modified filter options with updated excludePathPatterns.
 */
export async function processWithGenIgnore(
  zipUrl: string,
  initialFilterOptions: FilterOptions,
  responseOptions: ResponseOptions,
): Promise<{
  updatedFilterOptions: FilterOptions;
  zipResponse: Response;
}> {
  // Prepare headers for fetching the ZIP
  const headers = new Headers({ "User-Agent": "Cloudflare-Worker" });
  if (responseOptions.authHeader) {
    headers.set("Authorization", responseOptions.authHeader);
  }

  // Make a clone of the initial filter options
  const updatedFilterOptions = { ...initialFilterOptions };
  // If we don't need to check for .genignore, just fetch the ZIP once
  if (!initialFilterOptions.genignore) {
    const zipResponse = await fetch(zipUrl, { headers });
    return { updatedFilterOptions, zipResponse };
  }

  // First pass: Fetch the ZIP to look for .genignore
  const firstPassResponse = await fetch(zipUrl, { headers });

  if (!firstPassResponse.ok || !firstPassResponse.body) {
    // If the first pass fails, just return the response as is
    return { updatedFilterOptions, zipResponse: firstPassResponse };
  }

  // Clone the body stream to keep the original for later use
  const [firstPassStream, zipResponseBody] = firstPassResponse.body.tee();

  // Create a response with the cloned body for returning later
  const zipResponse = new Response(zipResponseBody, {
    status: firstPassResponse.status,
    statusText: firstPassResponse.statusText,
    headers: firstPassResponse.headers,
  });

  try {
    // Look for .genignore in the ZIP
    const genIgnorePatterns =
      (await findGenIgnoreInZip(firstPassStream)) ||
      parseGenIgnore(defaultGenignore);

    updatedFilterOptions.excludePathPatterns = Array.from(
      new Set(
        genIgnorePatterns.concat(updatedFilterOptions.excludePathPatterns),
      ),
    );
  } catch (error) {
    console.error("Error during .genignore processing:", error);
    // Fall back to default genignore patterns on error
    updatedFilterOptions.excludePathPatterns = parseGenIgnore(defaultGenignore);
  }

  return { updatedFilterOptions, zipResponse };
}

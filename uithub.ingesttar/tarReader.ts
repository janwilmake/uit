/**
 * Implements a streaming TAR file parser
 * Supports reading tar.gz files using only web standard APIs
 */

// TAR header structure constants
const TAR_HEADER_SIZE = 512;
const TAR_FILENAME_SIZE = 100;
const TAR_SIZE_OFFSET = 124;
const TAR_SIZE_SIZE = 12;
const TAR_TYPEFLAG_OFFSET = 156;

/**
 * Parse an octal string from a TAR header field
 * @param buffer The buffer containing the octal string
 * @param offset The offset in the buffer
 * @param size The size of the field
 * @returns The parsed number
 */
function parseOctal(buffer: Uint8Array, offset: number, size: number): number {
  let value = 0;
  // Parse until a NUL or space is found
  for (let i = 0; i < size; i++) {
    const byte = buffer[offset + i];
    // Break on NUL or space
    if (byte === 0 || byte === 32) break;

    // Convert from ASCII to number ('0' = 48)
    const charValue = byte - 48;
    if (charValue < 0 || charValue > 7) {
      // Invalid octal digit
      continue;
    }

    value = value * 8 + charValue;
  }
  return value;
}

/**
 * Extract a null-terminated string from a TAR header field
 * @param buffer The buffer containing the string
 * @param offset The offset in the buffer
 * @param size The maximum size of the field
 * @returns The extracted string
 */
function extractString(
  buffer: Uint8Array,
  offset: number,
  size: number,
): string {
  let end = offset;
  // Find the null terminator or the end of the field
  while (end < offset + size && buffer[end] !== 0) {
    end++;
  }
  return new TextDecoder().decode(buffer.subarray(offset, end));
}

/**
 * Check if a TAR header indicates the end of the archive
 * @param buffer The buffer containing the header
 * @returns True if the header is an end marker, false otherwise
 */
function isEndOfArchive(buffer: Uint8Array): boolean {
  // Check if all bytes in the header are 0
  for (let i = 0; i < TAR_HEADER_SIZE; i++) {
    if (buffer[i] !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * Process a TAR stream (after GZIP decompression)
 * @param tarStream The decompressed TAR stream
 * @param callback Function to call for each file in the TAR
 */
export async function processTarStream(
  tarStream: ReadableStream,
  callback: (entry: {
    fileName: string;
    isDirectory: boolean;
    fileData?: ReadableStream;
    fileSize?: number;
    error?: string;
    filter?: { filter?: boolean; status?: string; message?: string };
  }) => Promise<void>,
): Promise<void> {
  const reader = tarStream.getReader();

  // Pre-allocate a buffer for header and data
  let buffer = new Uint8Array(32768); // 32KB initial size
  let bufferSize = 0;

  try {
    while (true) {
      // Make sure we have enough data for at least a header
      while (bufferSize < TAR_HEADER_SIZE) {
        const { done, value } = await reader.read();
        if (done) {
          if (bufferSize === 0) {
            // End of stream with no remaining data
            return;
          }
          // End of stream with potentially partial data
          break;
        }

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
      }

      // Check if we have a valid TAR header
      if (bufferSize >= TAR_HEADER_SIZE) {
        // Check for end of archive marker
        if (isEndOfArchive(buffer.subarray(0, TAR_HEADER_SIZE))) {
          break;
        }

        // Extract header information
        const fileName = extractString(buffer, 0, TAR_FILENAME_SIZE);
        const fileSize = parseOctal(buffer, TAR_SIZE_OFFSET, TAR_SIZE_SIZE);
        const typeFlag = buffer[TAR_TYPEFLAG_OFFSET];

        // Skip header size
        let position = TAR_HEADER_SIZE;

        // Directory entries have a trailing slash and/or specific type flag
        const isDirectory = fileName.endsWith("/") || typeFlag === 53; // '5' = directory

        // Calculate the file data size including padding
        const paddedFileSize = Math.ceil(fileSize / 512) * 512;

        // Make sure we have enough data for the file content
        while (bufferSize < position + paddedFileSize) {
          const { done, value } = await reader.read();
          if (done) {
            // Unexpected end of stream
            break;
          }

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
        }

        // If we have the full file data
        if (bufferSize >= position + paddedFileSize) {
          if (!isDirectory && fileSize > 0) {
            // Extract the file data
            const fileData = buffer.subarray(position, position + fileSize);

            // Create a stream for the file data
            const fileStream = new ReadableStream({
              start(controller) {
                controller.enqueue(fileData);
                controller.close();
              },
            });

            // Process the file
            await callback({
              fileName,
              isDirectory,
              fileData: fileStream,
              fileSize,
            });
          } else if (isDirectory) {
            // Handle directory entries
            await callback({
              fileName,
              isDirectory,
              fileSize: 0,
            });
          }

          // Move past this file in the buffer
          buffer.copyWithin(0, position + paddedFileSize, bufferSize);
          bufferSize -= position + paddedFileSize;
        } else {
          // Not enough data, wait for more
          break;
        }
      }
    }
  } catch (error) {
    console.error("Error processing TAR:", error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Find the .genignore file in a TAR stream
 * @param tarStream The TAR stream to search
 * @returns The content of the .genignore file, or null if not found
 */
export async function findGenIgnoreInTar(
  tarStream: ReadableStream,
): Promise<string[] | null> {
  const reader = tarStream.getReader();
  let buffer = new Uint8Array(32768); // 32KB initial size
  let bufferSize = 0;
  let genIgnoreContent: string | null = null;
  let foundNonDotFile = false;

  const textDecoder = new TextDecoder();

  try {
    while (true) {
      // Read more data if needed
      while (bufferSize < TAR_HEADER_SIZE) {
        const { done, value } = await reader.read();
        if (done) {
          if (bufferSize === 0) {
            return null; // No more data
          }
          break;
        }

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
      }

      if (bufferSize < TAR_HEADER_SIZE) {
        break; // Not enough data for a header
      }

      // Check for end of archive
      if (isEndOfArchive(buffer.subarray(0, TAR_HEADER_SIZE))) {
        break;
      }

      // Extract header information
      const fileName = extractString(buffer, 0, TAR_FILENAME_SIZE);
      const fileSize = parseOctal(buffer, TAR_SIZE_OFFSET, TAR_SIZE_SIZE);

      // Only process files directly in the root directory
      const pathParts = fileName.split("/");
      if (pathParts.length !== 2 || pathParts[1] === "") {
        // Skip this file and move to next header
        const paddedFileSize = Math.ceil(fileSize / 512) * 512;

        // Make sure we have enough data to skip
        while (bufferSize < TAR_HEADER_SIZE + paddedFileSize) {
          const { done, value } = await reader.read();
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
        }

        // Skip to next file
        buffer.copyWithin(0, TAR_HEADER_SIZE + paddedFileSize, bufferSize);
        bufferSize -= TAR_HEADER_SIZE + paddedFileSize;
        continue;
      }

      const isGenIgnore = pathParts[1] === ".genignore";
      const isDotFile = pathParts[1].startsWith(".");

      // If we found .genignore, read its content
      if (isGenIgnore) {
        // Make sure we have the full file data
        while (bufferSize < TAR_HEADER_SIZE + fileSize) {
          const { done, value } = await reader.read();
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
        }

        // Extract the file content
        const content = buffer.subarray(
          TAR_HEADER_SIZE,
          TAR_HEADER_SIZE + fileSize,
        );
        genIgnoreContent = textDecoder.decode(content);
        break;
      }

      // If we found a non-dot file, stop looking for .genignore
      if (!isDotFile) {
        foundNonDotFile = true;
        break;
      }

      // Skip to next file
      const paddedFileSize = Math.ceil(fileSize / 512) * 512;

      // Make sure we have enough data to skip
      while (bufferSize < TAR_HEADER_SIZE + paddedFileSize) {
        const { done, value } = await reader.read();
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
      }

      // Skip to next file
      buffer.copyWithin(0, TAR_HEADER_SIZE + paddedFileSize, bufferSize);
      bufferSize -= TAR_HEADER_SIZE + paddedFileSize;
    }
  } catch (error) {
    console.error("Error finding .genignore:", error);
  } finally {
    reader.releaseLock();
  }

  return genIgnoreContent
    ? genIgnoreContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
    : null;
}

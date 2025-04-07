export const streamZipConfigFilePaths = async (
  ctx: any,
  archiveUrl: string,
) => {
  // Create a response stream
  const responseStream = new TransformStream();
  const responseWriter = responseStream.writable.getWriter();

  // Initialize response
  const response = new Response(responseStream.readable, {
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });

  // Start fetching the Bun repository archive

  const fetchResponse = await fetch(archiveUrl);

  if (!fetchResponse.ok) {
    return new Response(
      `Failed to fetch Bun archive: ${fetchResponse.status} ${fetchResponse.statusText}`,
      { status: 500 },
    );
  }

  // Process the stream
  ctx.waitUntil(
    (async () => {
      try {
        // Write the opening of the JSON array
        await responseWriter.write(encoder.encode("[\n"));

        // Stream the repository archive
        const fileStream = fetchResponse.body!;

        // Create a DecompressionStream for gzip
        const decompressedStream = fileStream.pipeThrough(
          new DecompressionStream("gzip"),
        );

        // Create variables to track the TAR processing state
        let buffer = new Uint8Array(0);
        let shouldContinue = true;
        let processedPaths = new Set(); // Track processed paths to avoid duplicates
        let isFirstItem = true; // Track if it's the first item in the array

        // Process the decompressed stream
        const reader = decompressedStream.getReader();

        while (shouldContinue) {
          const { done, value } = await reader.read();

          if (done) break;

          // Append the new data to our buffer
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;

          // Process complete TAR entries while we have enough data
          const result = await processTarEntries(
            buffer,
            responseWriter,
            processedPaths,
            isFirstItem,
          );
          shouldContinue = result.shouldContinue;
          buffer = result.remainingBuffer;
          isFirstItem = result.isFirstItem;

          // If we should stop processing
          if (!shouldContinue) {
            // Cancel the fetch to save bandwidth
            reader.cancel();
            fileStream.cancel();
            break;
          }
        }

        // Write the closing of the JSON array
        await responseWriter.write(encoder.encode("\n]"));

        // Close the response writer
        await responseWriter.close();
      } catch (error: any) {
        // Handle any errors
        await responseWriter.write(
          encoder.encode(`\nError processing archive: ${error.message}\n]`),
        );
        await responseWriter.close();
      }
    })(),
  );

  return response;
};

// Text encoder for writing to the response stream
const encoder = new TextEncoder();

// Function to process TAR entries from the buffer
async function processTarEntries(
  buffer: Uint8Array<ArrayBuffer>,
  writer: WritableStreamDefaultWriter<any>,
  processedPaths: Set<unknown>,
  isFirstItem: boolean,
) {
  let position = 0;
  let shouldStop = false;
  let foundNonDotFolder = false;
  let nonDotFolderName = "";

  // Process TAR entries as long as we have at least 512 bytes (TAR header size)
  while (position + 512 <= buffer.length) {
    // Extract the file name from the TAR header
    const nameBuffer = buffer.slice(position, position + 100);
    let fileName = "";

    // TAR filenames are null-terminated ASCII strings
    for (let i = 0; i < nameBuffer.length; i++) {
      if (nameBuffer[i] === 0) break;
      fileName += String.fromCharCode(nameBuffer[i]);
    }

    // Skip empty blocks
    if (fileName.trim() === "") {
      position += 512;
      continue;
    }

    // Check if the file is a valid file (not directory)
    const typeFlag = buffer[position + 156];
    const isFile = typeFlag === 0 || typeFlag === 48; // '0' in ASCII

    // Extract the file size from the TAR header (octal string)
    const sizeBuffer = buffer.slice(position + 124, position + 136);
    let sizeStr = "";

    for (let i = 0; i < sizeBuffer.length; i++) {
      if (sizeBuffer[i] === 0) break;
      sizeStr += String.fromCharCode(sizeBuffer[i]);
    }

    // Parse the octal size
    const fileSize = parseInt(sizeStr.trim(), 8) || 0;

    // Calculate the number of 512-byte blocks needed for the file content
    const contentBlocks = Math.ceil(fileSize / 512);

    // Check if we have the complete entry (header + content)
    if (position + 512 + contentBlocks * 512 > buffer.length) {
      // Not enough data yet, return the remaining buffer and wait for more
      return {
        shouldContinue: true,
        remainingBuffer: buffer,
        isFirstItem,
      };
    }

    // Process the file entry
    if (!processedPaths.has(fileName)) {
      // Add path to processed set to avoid duplicates
      processedPaths.add(fileName);

      // Check if this is a non-dot folder containing a file
      if (isFile) {
        const pathParts = fileName.split("/");
        // Remove the top-level "bun-main" folder for analyzing
        if (pathParts.length > 1) {
          const folderName = pathParts[1];

          // If this is a folder that doesn't start with a dot
          // if (
          //   folderName &&
          //   !folderName.startsWith(".") &&
          //   pathParts.length > 2
          // ) {
          //   console.log({ fileName });
          //   foundNonDotFolder = true;
          //   nonDotFolderName = folderName;
          //   shouldStop = true;
          // }
        }

        if (!shouldStop) {
          // Output file path in the array format with proper JSON formatting
          const prefix = isFirstItem ? "" : ",";
          await writer.write(encoder.encode(`${prefix}\n  "${fileName}"`));
          isFirstItem = false;
        }
      }
    }

    // Move to the next entry
    position += 512 + contentBlocks * 512;

    // If we found a non-dot folder with a file, exit after processing this entry
    if (shouldStop) {
      break;
    }
  }

  // Return the unprocessed remainder in the buffer
  return {
    shouldContinue: !shouldStop,
    remainingBuffer: buffer.slice(position),
    isFirstItem,
  };
}

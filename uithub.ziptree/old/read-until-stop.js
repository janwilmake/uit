export default {
  async fetch() {
    // Create a transform stream to process the response
    const { readable, writable } = new TransformStream();

    // Process the ZIP file in the background
    processZip(writable).catch((err) => {
      console.error("Error processing ZIP file:", err);
    });

    // Return a streaming response
    return new Response(readable, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  },
};

async function processZip(writable) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  try {
    // Fetch the ZIP file
    const response = await fetch(
      "https://github.com/threepointone/llm-scraper-worker/archive/refs/heads/main.zip",
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`,
      );
    }

    const reader = response.body.getReader();

    // ZIP file parsing state
    let buffer = new Uint8Array(0);
    let fileCount = 0;

    // For tracking the current file being processed
    let currentFileName = null;
    let fileDataRemaining = 0;
    let centralDirectoryStarted = false;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Append new data to our buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Process the buffer as much as possible
      while (buffer.length >= 30) {
        // Minimum size for a ZIP local file header

        // Stop after 1000 files
        if (fileCount >= 1000) {
          await writer.close();
          return;
        }

        // Check if we're dealing with a local file header
        if (
          !centralDirectoryStarted &&
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x03 &&
          buffer[3] === 0x04
        ) {
          // Check if we have enough data to read the header
          if (buffer.length < 30) break;

          // Get file name length and extra field length
          const fileNameLength = buffer[26] | (buffer[27] << 8);
          const extraFieldLength = buffer[28] | (buffer[29] << 8);

          // Check if we have enough data for the complete header
          const headerSize = 30 + fileNameLength + extraFieldLength;
          if (buffer.length < headerSize) break;

          // Extract file name
          const fileNameBytes = buffer.slice(30, 30 + fileNameLength);
          currentFileName = new TextDecoder().decode(fileNameBytes);

          // Determine compressed size of file data
          const compressedSize =
            buffer[18] |
            (buffer[19] << 8) |
            (buffer[20] << 16) |
            (buffer[21] << 24);

          fileDataRemaining = compressedSize;

          // Skip the header and move to the file data
          buffer = buffer.slice(headerSize);

          // If this is an actual file (not a directory), output it
          if (!currentFileName.endsWith("/") && currentFileName !== "") {
            fileCount++;

            // Output the file path in the requested format
            const output = encoder.encode(
              JSON.stringify({ path: currentFileName }) + "\n",
            );
            await writer.write(output);
          }

          // Skip the file data
          if (fileDataRemaining > 0) {
            const toSkip = Math.min(fileDataRemaining, buffer.length);
            buffer = buffer.slice(toSkip);
            fileDataRemaining -= toSkip;
          }
        }
        // Check if we've reached the central directory
        else if (
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x01 &&
          buffer[3] === 0x02
        ) {
          centralDirectoryStarted = true;
          // Skip the central directory - we don't need to process it
          // Just move forward in the buffer
          buffer = buffer.slice(4);
        }
        // If we're in the central directory or didn't find a valid signature, skip a byte
        else {
          buffer = buffer.slice(1);
        }
      }
    }

    await writer.close();
  } catch (error) {
    // Write error to the stream
    const errorOutput = encoder.encode(
      JSON.stringify({ error: error.message }) + "\n",
    );
    await writer.write(errorOutput);
    await writer.close();
  }
}

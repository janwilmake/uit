import map from "./public/ext-to-mime.json";

type Env = { CREDENTIALS: string };
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Check for authentication
    if (!isAuthenticated(request, env.CREDENTIALS)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Archive Access"',
        },
      });
    }

    // Parse URL and query parameters
    const url = new URL(request.url);
    const zipUrl = url.pathname.slice(1);
    if (!zipUrl) {
      return new Response("No ZIP URL provided", { status: 400 });
    }

    // Get query parameters
    const omitFirstSegment =
      url.searchParams.get("omitFirstSegment") === "true";
    const rawUrlPrefix = url.searchParams.get("rawUrlPrefix");

    try {
      // Fetch the ZIP file as a stream
      const archiveResponse = await fetchZipWithAuth(request, zipUrl);
      if (!archiveResponse.ok || !archiveResponse.body) {
        return new Response(
          `Failed to fetch ZIP: ${archiveResponse.statusText}`,
          {
            status: archiveResponse.status,
          },
        );
      }

      // Generate a unique boundary for the multipart form data
      const boundary = `----WebKitFormBoundary${generateRandomString(16)}`;

      // Determine if request is from a browser
      const isBrowser = isBrowserRequest(request);
      const contentType = isBrowser
        ? `text/plain; boundary=${boundary}; charset=utf-8`
        : `multipart/form-data; boundary=${boundary}`;

      // Process ZIP and create multipart stream
      const { readable, writable } = new TransformStream();

      processZipToMultipart(
        archiveResponse.body,
        writable,
        boundary,
        omitFirstSegment,
        rawUrlPrefix,
        zipUrl,
      );

      // Return the multipart stream response
      return new Response(readable, {
        headers: {
          "Content-Type": contentType,
          "Transfer-Encoding": "chunked",
        },
      });
    } catch (error) {
      return new Response(`Error processing ZIP: ${error.message}`, {
        status: 500,
      });
    }
  },
};

// Check if the request is authenticated
function isAuthenticated(request: Request, credentials: string): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  if (authHeader.startsWith("Basic ")) {
    const base64Credentials = authHeader.slice(6);
    return base64Credentials === btoa(credentials);
  }

  return false;
}

// Fetch ZIP with authorization if header is present
async function fetchZipWithAuth(
  request: Request,
  zipUrl: string,
): Promise<Response> {
  const headers = new Headers();
  const authHeader = request.headers.get("x-archive-authorization");

  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  return fetch(zipUrl, { headers });
}

// Check if request is from a browser
function isBrowserRequest(request: Request): boolean {
  const userAgent = request.headers.get("User-Agent") || "";
  return /Mozilla|Chrome|Safari|Firefox|Edge/.test(userAgent);
}

// Generate a random string for the boundary
function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Process file path for omitFirstSegment option
function processFilePath(fileName: string, omitFirstSegment: boolean): string {
  if (!omitFirstSegment) return fileName;

  const parts = fileName.split("/");
  if (parts.length <= 1) return fileName;

  return "/" + parts.slice(1).join("/");
}

// Process the ZIP archive and convert it to multipart/form-data stream
async function processZipToMultipart(
  zipStream: ReadableStream,
  output: WritableStream,
  boundary: string,
  omitFirstSegment: boolean,
  rawUrlPrefix: string | null,
  zipUrl: string,
): Promise<void> {
  const writer = output.getWriter();
  const zipReader = new ZipStreamReader(zipStream);

  try {
    // Process the ZIP entries
    await zipReader.readEntries(async (entry) => {
      if (entry.isDirectory) return; // Skip directories

      try {
        // Process file path if needed
        const processedPath = processFilePath(entry.fileName, omitFirstSegment);

        const ext = entry.fileName.split("/").pop()?.split(".").pop() || "";

        // Detect content type
        const contentType = (map[ext] || "application/octet-stream") as string;

        // Start multipart section
        await writer.write(encoder.encode(`--${boundary}\r\n`));
        await writer.write(
          encoder.encode(
            `Content-Disposition: form-data; name="${processedPath}"; filename="${processedPath}"\r\n`,
          ),
        );

        // Add content type header
        await writer.write(encoder.encode(`Content-Type: ${contentType}\r\n`));

        // Calculate content length if available
        if (entry.uncompressedSize !== undefined) {
          await writer.write(
            encoder.encode(`Content-Length: ${entry.uncompressedSize}\r\n`),
          );
        }

        // Get content and hash
        const { content, hash } = await getContentAndHash(entry.fileData);
        await writer.write(encoder.encode(`x-file-hash: ${hash}\r\n`));

        // Determine if content is binary
        const isBinary = !isUtf8(content);

        // Check if we should use raw URL for binary content
        if (rawUrlPrefix && isBinary && isBinary) {
          // For binary files with rawUrlPrefix, add x-url header instead of content
          const rawUrl = `${rawUrlPrefix}${processedPath}`;
          await writer.write(encoder.encode(`x-url: ${rawUrl}\r\n`));
          await writer.write(
            encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
          );
          // Omit content for binary files when rawUrlPrefix is specified
          await writer.write(encoder.encode("\r\n"));
        } else {
          // Regular handling: include content
          await writer.write(
            encoder.encode(
              `Content-Transfer-Encoding: ${
                isBinary ? "binary" : "8bit"
              }\r\n\r\n`,
            ),
          );

          // Write the file content
          await writer.write(content);
          await writer.write(encoder.encode("\r\n"));
        }
      } catch (error) {
        console.error(`Error processing file ${entry.fileName}:`, error);
      }
    });

    // End the multipart form data
    await writer.write(encoder.encode(`--${boundary}--\r\n`));
  } catch (error) {
    console.error("Error processing ZIP:", error);
  } finally {
    await writer.close();
  }
}

// TextEncoder for string to Uint8Array conversion
const encoder = new TextEncoder();

// Check if content is valid UTF-8
function isUtf8(data: Uint8Array): boolean {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
    decoder.decode(data);
    return true;
  } catch {
    return false;
  }
}

// Get content and generate hash
async function getContentAndHash(
  stream: ReadableStream,
): Promise<{ content: Uint8Array; hash: string }> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array());

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate chunks
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

  // Calculate hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { content, hash: hashHex };
}

// ZipStreamReader class to process ZIP files
class ZipStreamReader {
  private stream: ReadableStream;

  constructor(stream: ReadableStream) {
    this.stream = stream;
  }

  async readEntries(
    callback: (entry: {
      fileName: string;
      isDirectory: boolean;
      fileData: ReadableStream;
      uncompressedSize?: number;
    }) => Promise<void>,
  ): Promise<void> {
    // Create a reader for the input stream
    const reader = this.stream.getReader();

    // Buffer for collecting bytes
    let buffer = new Uint8Array(0);

    // Process the ZIP file
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append new data to buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Process entries in the buffer
      let position = 0;

      while (position + 30 <= buffer.length) {
        // Minimum local file header size
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
          const uncompressedSize =
            buffer[position + 22] |
            (buffer[position + 23] << 8) |
            (buffer[position + 24] << 16) |
            (buffer[position + 25] << 24);
          const fileNameLength =
            buffer[position + 26] | (buffer[position + 27] << 8);
          const extraFieldLength =
            buffer[position + 28] | (buffer[position + 29] << 8);

          // Check if we have enough data to read the filename
          if (
            position + 30 + fileNameLength + extraFieldLength >
            buffer.length
          ) {
            break; // Wait for more data
          }

          // Extract filename
          const fileNameBytes = buffer.slice(
            position + 30,
            position + 30 + fileNameLength,
          );
          const fileName = new TextDecoder().decode(fileNameBytes);

          // Determine if it's a directory (ends with /)
          const isDirectory = fileName.endsWith("/");

          // Calculate data position and size
          const dataPosition =
            position + 30 + fileNameLength + extraFieldLength;

          // Check if we have the complete file data
          if (dataPosition + compressedSize > buffer.length) {
            break; // Wait for more data
          }

          // Extract and process file data
          const compressedData = buffer.slice(
            dataPosition,
            dataPosition + compressedSize,
          );

          // Create a ReadableStream from the compressed data
          const compressedStream = new ReadableStream({
            start(controller) {
              controller.enqueue(compressedData);
              controller.close();
            },
          });

          // Decompress if needed
          let fileDataStream;
          if (compressionMethod === 8) {
            // DEFLATE
            fileDataStream = compressedStream.pipeThrough(
              new DecompressionStream("deflate-raw"),
            );
          } else {
            fileDataStream = compressedStream;
          }

          // Pass entry to callback
          await callback({
            fileName,
            isDirectory,
            fileData: fileDataStream,
            uncompressedSize,
          });

          // Move position past this entry
          position = dataPosition + compressedSize;
        } else {
          // Not at a local file header, move forward and keep looking
          position++;
        }
      }

      // Keep any remaining data for next iteration
      buffer = buffer.slice(position);
    }
  }
}

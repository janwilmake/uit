// Import picomatch for glob pattern matching
import picomatch from "picomatch";
import map from "./public/ext-to-mime.json";
import binaryExtensions from "binary-extensions";

type Env = { CREDENTIALS: string };

interface FilterOptions {
  omitFirstSegment: boolean;
  omitBinary: boolean;
  enableFuzzyMatching: boolean;
  rawUrlPrefix: string | null;
  basePath: string[];
  pathPatterns: string[];
  excludePathPatterns: string[];
  maxFileSize: number | undefined;
}

interface ResponseOptions {
  boundary: string;
  isBrowser: boolean;
  authHeader: string | null;
}

interface RequestParams {
  zipUrl: string;
  filterOptions: FilterOptions;
  responseOptions: ResponseOptions;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Parse the request parameters
    const params = parseRequest(request);
    const { zipUrl, filterOptions, responseOptions } = params;
    // Validate the ZIP URL
    if (!zipUrl) {
      return new Response("No ZIP URL provided", { status: 400 });
    }

    // Check authentication
    if (!isAuthenticated(request, env.CREDENTIALS)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Archive Access"',
        },
      });
    }

    try {
      // Fetch the ZIP file with proper headers
      const zipResponse = await fetchZipFile(params);

      if (!zipResponse.ok || !zipResponse.body) {
        return createErrorResponse(zipResponse, params.zipUrl);
      }

      // Process and stream the ZIP contents
      const { readable, writable } = new TransformStream();

      // Start processing the ZIP file in the background
      processZipToMultipart(
        zipResponse.body,
        writable,
        params.filterOptions,
        params.responseOptions,
      );

      // Return the streaming response
      const contentType = responseOptions.isBrowser
        ? `text/plain; boundary=${responseOptions.boundary}; charset=utf-8`
        : `multipart/form-data; boundary=${responseOptions.boundary}`;

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

function parseRequest(request: Request): RequestParams {
  const url = new URL(request.url);

  // Extract the ZIP URL from the path
  const zipUrl = decodeURIComponent(url.pathname.slice(1));

  // Parse filter options
  const filterOptions: FilterOptions = {
    omitFirstSegment: url.searchParams.get("omitFirstSegment") === "true",
    omitBinary: url.searchParams.get("omitBinary") === "true",
    enableFuzzyMatching: url.searchParams.get("enableFuzzyMatching") === "true",
    rawUrlPrefix: url.searchParams.get("rawUrlPrefix"),
    basePath: url.searchParams.getAll("basePath"),
    pathPatterns: url.searchParams.getAll("pathPatterns"),
    excludePathPatterns: url.searchParams.getAll("excludePathPatterns"),
    maxFileSize: parseMaxFileSize(url.searchParams.get("maxFileSize")),
  };

  // Prepare response options
  const responseOptions: ResponseOptions = {
    boundary: `----WebKitFormBoundary${generateRandomString(16)}`,
    isBrowser: isBrowserRequest(request),
    authHeader: request.headers.get("x-source-authorization"),
  };

  return { zipUrl, filterOptions, responseOptions };
}

async function fetchZipFile(params: RequestParams): Promise<Response> {
  const headers = new Headers({ "User-Agent": "Cloudflare-Worker" });

  if (params.responseOptions.authHeader) {
    headers.set("Authorization", params.responseOptions.authHeader);
  }

  return fetch(params.zipUrl, { headers });
}

function createErrorResponse(response: Response, zipUrl: string): Response {
  return new Response(
    `----\nIngestzip: Failed to fetch ZIP: URL=${zipUrl}\n\n${
      response.status
    } ${response.statusText}\n\n${response.text()}\n\n-----`,
    { status: response.status },
  );
}

// Helper functions for path normalization
const prependSlash = (path: string) =>
  path.startsWith("/") ? path : "/" + path;
const surroundSlash = (path: string) =>
  path.endsWith("/") ? prependSlash(path) : prependSlash(path) + "/";
const withoutSlash = (path: string) =>
  path.startsWith("/") ? path.slice(1) : path;

/**
 * Simple fuzzy matching function that works similarly to VS Code's fuzzy search
 */
function fuzzyMatch(pattern: string, str: string): boolean {
  // Convert both strings to lowercase for case-insensitive matching
  const lowerPattern = pattern.toLowerCase();
  const lowerStr = str.toLowerCase();

  let patternIdx = 0;
  let strIdx = 0;

  // Try to match all characters in the pattern in sequence
  while (patternIdx < lowerPattern.length && strIdx < lowerStr.length) {
    // If characters match, advance pattern index
    if (lowerPattern[patternIdx] === lowerStr[strIdx]) {
      patternIdx++;
    }
    // Always advance string index
    strIdx++;
  }

  // If we've gone through the entire pattern, it's a match
  return patternIdx === lowerPattern.length;
}

function parseMaxFileSize(maxFileSizeParam: string | null): number | undefined {
  if (!maxFileSizeParam) {
    return undefined;
  }

  const parsedSize = Number(maxFileSizeParam);
  return !isNaN(parsedSize) ? parsedSize : undefined;
}

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

/**
 * Precompile picomatch patterns for faster matching
 */
function compileMatchers(options: FilterOptions): CompiledMatchers {
  // Common picomatch options
  const picoOptions = {
    dot: true, // Match dotfiles
    windows: false, // Use forward slashes (POSIX style)
  };

  // For each category, create separate matchers for normal patterns and basename patterns
  const inclusionMatchers = {
    normal: [] as Array<(path: string) => boolean>,
    basename: [] as Array<(basename: string) => boolean>,
  };

  const exclusionMatchers = {
    normal: [] as Array<(path: string) => boolean>,
    basename: [] as Array<(basename: string) => boolean>,
  };

  // Process inclusion patterns
  if (options.pathPatterns && options.pathPatterns.length > 0) {
    for (const pattern of options.pathPatterns) {
      if (pattern.startsWith("*")) {
        // Compile basename matchers
        inclusionMatchers.basename.push(picomatch(pattern, picoOptions));
      } else if (!pattern.includes("*") && !pattern.includes("?")) {
        // VSCode-like behavior for non-glob patterns
        inclusionMatchers.normal.push(picomatch(`${pattern}/**`, picoOptions));
      } else {
        // Standard pattern matching
        inclusionMatchers.normal.push(picomatch(pattern, picoOptions));
      }
    }
  }

  // Process exclusion patterns
  if (options.excludePathPatterns && options.excludePathPatterns.length > 0) {
    for (const pattern of options.excludePathPatterns) {
      if (pattern.startsWith("*")) {
        // Compile basename matchers
        exclusionMatchers.basename.push(picomatch(pattern, picoOptions));
      } else if (!pattern.includes("*") && !pattern.includes("?")) {
        // VSCode-like behavior for non-glob patterns
        exclusionMatchers.normal.push(picomatch(`${pattern}/**`, picoOptions));
      } else {
        // Standard pattern matching
        exclusionMatchers.normal.push(picomatch(pattern, picoOptions));
      }
    }
  }

  return {
    inclusionMatchers,
    exclusionMatchers,
    hasInclusion:
      inclusionMatchers.normal.length > 0 ||
      inclusionMatchers.basename.length > 0,
    hasExclusion:
      exclusionMatchers.normal.length > 0 ||
      exclusionMatchers.basename.length > 0,
  };
}

// Updated CompiledMatchers interface
interface CompiledMatchers {
  inclusionMatchers: {
    normal: Array<(path: string) => boolean>;
    basename: Array<(basename: string) => boolean>;
  };
  exclusionMatchers: {
    normal: Array<(path: string) => boolean>;
    basename: Array<(basename: string) => boolean>;
  };
  hasInclusion: boolean;
  hasExclusion: boolean;
}

/**
 * Process the ZIP archive and convert it to multipart/form-data stream,
 * with optimized filtering at the ZIP reader level.
 */
async function processZipToMultipart(
  zipStream: ReadableStream,
  output: WritableStream,
  filterOptions: FilterOptions,
  responseOptions: ResponseOptions,
): Promise<void> {
  const {
    omitFirstSegment,
    rawUrlPrefix,
    basePath,
    enableFuzzyMatching,
    excludePathPatterns,
    omitBinary,
    pathPatterns,
    maxFileSize,
  } = filterOptions;
  const { boundary } = responseOptions;
  const writer = output.getWriter();

  // Pass filter options to ZipStreamReader for early filtering
  const zipReader = new ZipStreamReader(zipStream, {
    omitFirstSegment,
    basePath,
    rawUrlPrefix,
    pathPatterns,
    excludePathPatterns,
    maxFileSize,
    omitBinary,
    enableFuzzyMatching,
  });

  try {
    // Process the ZIP entries
    await zipReader.readEntries(async (entry) => {
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

        const writeWithUrl = async () => {
          // For binary files with rawUrlPrefix, add x-url header instead of content
          const rawUrl = `${rawUrlPrefix}${processedPath}`;
          await writer.write(encoder.encode(`x-url: ${rawUrl}\r\n`));
          await writer.write(
            encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
          );
          // Omit content for binary files when rawUrlPrefix is specified
          await writer.write(encoder.encode("\r\n"));
        };

        if (omitBinary && binaryExtensions.includes(ext)) {
          // Second, more efficient way, to filter out binary files, while still responding with raw url but not with content.
          await writeWithUrl();
          // NB: started the entry.fileData so also need to cancel it.
          await entry.fileData.cancel();
        }

        // Get content and hash
        const { content, hash } = await getContentAndHash(entry.fileData);
        await writer.write(encoder.encode(`x-file-hash: ${hash}\r\n`));

        // Determine if content is binary
        const isBinaryContent = !isUtf8(content);

        // Skip binary files if omitBinary is true
        if (omitBinary && isBinaryContent && !rawUrlPrefix) {
          return;
        }

        // Check if we should use raw URL for binary content
        if (rawUrlPrefix && isBinaryContent) {
          await writeWithUrl();
        } else {
          // Regular handling: include content
          await writer.write(
            encoder.encode(
              `Content-Transfer-Encoding: ${
                isBinaryContent ? "binary" : "8bit"
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

// ZipStreamReader class to process ZIP files with early filtering
class ZipStreamReader {
  private stream: ReadableStream;
  private filterOptions: FilterOptions;
  private matchers: CompiledMatchers;

  constructor(stream: ReadableStream, filterOptions: FilterOptions) {
    this.stream = stream;
    this.filterOptions = filterOptions;

    // Precompile all matchers once during initialization
    this.matchers = compileMatchers(this.filterOptions);
  }

  async readEntries(
    callback: (entry: {
      fileName: string;
      isDirectory: boolean;
      fileData: ReadableStream;
      uncompressedSize?: number;
    }) => Promise<void>,
  ): Promise<void> {
    const reader = this.stream.getReader();

    // Pre-allocate a buffer but more conservatively
    let buffer = new Uint8Array(32768); // 32KB initial size
    let bufferSize = 0;
    let foundCentralDirectory = false;

    const textDecoder = new TextDecoder();

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
        let processedEntries = false;

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
            const uncompressedSize =
              buffer[position + 22] |
              (buffer[position + 23] << 8) |
              (buffer[position + 24] << 16) |
              (buffer[position + 25] << 24);
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
            if (fileNameEnd > bufferSize) {
              break; // Not enough data, wait for more
            }

            const fileName = textDecoder.decode(
              buffer.subarray(fileNameStart, fileNameEnd),
            );
            const isDirectory = fileName.endsWith("/");

            // Apply filtering
            if (
              !this.shouldProcessFile(fileName, isDirectory, uncompressedSize)
            ) {
              position += totalEntrySize;
              processedEntries = true;
              continue;
            }

            // Calculate data position
            const dataPosition =
              position + 30 + fileNameLength + extraFieldLength;
            if (dataPosition + compressedSize > bufferSize) {
              break; // Not enough data, wait for more
            }

            // Extract the compressed data - we need to copy here to ensure data safety
            const compressedData = new Uint8Array(compressedSize);
            compressedData.set(
              buffer.subarray(dataPosition, dataPosition + compressedSize),
            );

            // Create stream from the data
            const compressedStream = new ReadableStream({
              start(controller) {
                controller.enqueue(compressedData);
                controller.close();
              },
            });

            // Determine final stream (decompress if needed)
            let fileDataStream;
            if (compressionMethod === 8) {
              fileDataStream = compressedStream.pipeThrough(
                new DecompressionStream("deflate-raw"),
              );
            } else {
              fileDataStream = compressedStream;
            }

            // Process the entry
            await callback({
              fileName,
              isDirectory,
              fileData: fileDataStream,
              uncompressedSize,
            });

            position += totalEntrySize;
            processedEntries = true;
          } else if (
            buffer[position] === 0x50 &&
            buffer[position + 1] === 0x4b &&
            buffer[position + 2] === 0x01 &&
            buffer[position + 3] === 0x02
          ) {
            foundCentralDirectory = true;
            // We've reached the central directory, which means we're done with file data
            // You might want to break out of the processing loop or handle accordingly
            break;
          } else {
            // Not a valid header, move forward
            position++;
          }
        }

        if (foundCentralDirectory) {
          // Explicitly cancel the reader before releasing lock
          try {
            await reader.cancel();
          } catch (e) {
            console.log("Error canceling reader:", e);
          }
          reader.releaseLock();
          break;
        }

        // Compact the buffer if we processed any entries
        if (position > 0) {
          // Only copy remaining data if there's anything left
          if (position < bufferSize) {
            buffer.copyWithin(0, position, bufferSize);
          }
          bufferSize -= position;
        }

        // If we didn't process any entries and couldn't find a header,
        // we might have incomplete data at the start, so get more data
        if (!processedEntries && bufferSize >= 30) {
          const { done, value } = await reader.read();
          if (done) break;

          // Ensure buffer is large enough
          if (bufferSize + value.length > buffer.length) {
            const newSize = Math.max(
              buffer.length * 2,
              bufferSize + value.length,
            );
            console.log({ newSize });
            const newBuffer = new Uint8Array(newSize);
            newBuffer.set(buffer.subarray(0, bufferSize));
            buffer = newBuffer;
          }

          // Append new data
          buffer.set(value, bufferSize);
          bufferSize += value.length;
        }
      }
    } catch (error) {
      console.error("Error in readEntries:", error);
      reader.releaseLock();
      throw error;
    } finally {
      // Make sure to release the lock in all cases
      reader.releaseLock();
    }
  }

  private shouldProcessFile(
    fileName: string,
    isDirectory: boolean,
    size?: number,
  ): boolean {
    if (isDirectory) return false; // Skip directories

    const {
      omitFirstSegment,
      basePath,
      maxFileSize,
      omitBinary,
      rawUrlPrefix,
      enableFuzzyMatching,
      pathPatterns,
      excludePathPatterns,
    } = this.filterOptions;

    // Process the path with omitFirstSegment if needed
    const processedPath = omitFirstSegment
      ? processFilePath(fileName, true)
      : fileName;

    // Check maxFileSize filter
    if (maxFileSize !== undefined && size !== undefined && size > maxFileSize) {
      return false;
    }

    const ext = processedPath.split(".").pop()!;

    if (omitBinary && !rawUrlPrefix && binaryExtensions.includes(ext)) {
      // First, most efficient way, to exclude binaries
      return false;
    }

    // Check base path filter
    if (basePath && basePath.length > 0) {
      const matchesBasePath = basePath.some((base) => {
        // Normalize base path and filename for directory matching
        const normalizedBase = surroundSlash(base);
        const normalizedFilename = surroundSlash(processedPath);
        return normalizedFilename.startsWith(normalizedBase);
      });

      if (!matchesBasePath) {
        return false;
      }
    }

    // Extract basename once for potential basename pattern matching
    const basename = processedPath.split("/").pop() || "";
    const normalizedPath = withoutSlash(processedPath);

    // Apply inclusion patterns if defined
    let included = true;
    if (
      this.matchers.hasInclusion ||
      (enableFuzzyMatching && pathPatterns && pathPatterns.length > 0)
    ) {
      // Check normal patterns from picomatch
      const matchesNormalPattern = this.matchers.inclusionMatchers.normal.some(
        (matcher) => matcher(normalizedPath),
      );

      // Check basename patterns from picomatch
      const matchesBasenamePattern =
        this.matchers.inclusionMatchers.basename.some((matcher) =>
          matcher(basename),
        );

      // Apply fuzzy matching directly to path patterns if enabled
      const matchesFuzzyPattern =
        enableFuzzyMatching && pathPatterns
          ? pathPatterns.some((pattern) => {
              // Only apply fuzzy matching to non-glob patterns
              if (!pattern.includes("*") && !pattern.includes("?")) {
                return fuzzyMatch(pattern, normalizedPath);
              }
              return false;
            })
          : false;

      // File is included if it matches any pattern
      included =
        matchesNormalPattern || matchesBasenamePattern || matchesFuzzyPattern;
    }

    // If not included, no need to check exclusion
    if (!included) {
      return false;
    }

    // Apply exclusion patterns
    if (
      this.matchers.hasExclusion ||
      (enableFuzzyMatching &&
        excludePathPatterns &&
        excludePathPatterns.length > 0)
    ) {
      // Check normal patterns from picomatch
      const matchesNormalExcludePattern =
        this.matchers.exclusionMatchers.normal.some((matcher) =>
          matcher(normalizedPath),
        );

      // Check basename patterns from picomatch
      const matchesBasenameExcludePattern =
        this.matchers.exclusionMatchers.basename.some((matcher) =>
          matcher(basename),
        );

      // Apply fuzzy matching directly to exclude path patterns if enabled
      const matchesFuzzyExcludePattern =
        enableFuzzyMatching && excludePathPatterns
          ? excludePathPatterns.some((pattern) => {
              // Only apply fuzzy matching to non-glob patterns
              if (!pattern.includes("*") && !pattern.includes("?")) {
                return fuzzyMatch(pattern, normalizedPath);
              }
              return false;
            })
          : false;

      // File is excluded if it matches any exclusion pattern
      const excluded =
        matchesNormalExcludePattern ||
        matchesBasenameExcludePattern ||
        matchesFuzzyExcludePattern;

      // If excluded, it takes precedence over inclusion
      if (excluded) {
        return false;
      }
    }

    // If we reach this point, the file should be processed
    return true;
  }
}

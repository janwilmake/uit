// Import picomatch for glob pattern matching
import picomatch from "picomatch";
import map from "./public/ext-to-mime.json";
import binaryExtensions from "binary-extensions";
import { Env, FilterOptions, RequestParams, ResponseOptions } from "./types";
import { processWithGenIgnore } from "./genignore";
import { processTarStream } from "./tarReader";

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Parse the request parameters
    const requestStartTime = Date.now();

    const params = parseRequest(request);
    const {
      tarUrl,
      filterOptions: initialFilterOptions,
      responseOptions,
    } = params;

    // Include timing info in response headers
    const responseHeaders = new Headers({
      "Content-Type": responseOptions.isBrowser
        ? `text/plain; boundary=${responseOptions.boundary}; charset=utf-8`
        : `multipart/form-data; boundary=${responseOptions.boundary}`,
      "Transfer-Encoding": "chunked",
    });

    // Validate the TAR URL
    if (!tarUrl) {
      return new Response("No TAR URL provided", { status: 400 });
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
      // Process with GenIgnore - this does the first pass if needed
      const { updatedFilterOptions, tarResponse } = await processWithGenIgnore(
        tarUrl,
        initialFilterOptions,
        responseOptions,
      );

      console.log({ genignore: updatedFilterOptions.excludePathPatterns });
      const initialResponseTime = Date.now() - requestStartTime;
      console.log({ initialResponseTime });

      responseHeaders.set(
        "X-Initial-Response-Time-Ms",
        initialResponseTime.toString(),
      );

      if (!tarResponse.ok || !tarResponse.body) {
        return createErrorResponse(tarResponse, params.tarUrl);
      }

      // Process and stream the TAR contents
      const { readable, writable } = new TransformStream();

      console.log({ updatedFilterOptions });
      // Start processing the TAR file in the background with updated filter options
      processTarToMultipart(
        tarResponse.body,
        writable,
        updatedFilterOptions, // Use the updated filter options with .genignore patterns
        params.responseOptions,
        requestStartTime,
      );

      return new Response(readable, { headers: responseHeaders });
    } catch (error) {
      return new Response(`Error processing TAR: ${error.message}`, {
        status: 500,
      });
    }
  },
};

function parseRequest(request: Request): RequestParams {
  const url = new URL(request.url);

  // Extract the TAR URL from the path
  const tarUrl = decodeURIComponent(url.pathname.slice(1));

  // Parse filter options
  const filterOptions: FilterOptions = {
    genignore: url.searchParams.get("genignore") !== "false",
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

  return { tarUrl, filterOptions, responseOptions };
}

function createErrorResponse(response: Response, tarUrl: string): Response {
  return new Response(
    `----\nIngesttar: Failed to fetch TAR: URL=${tarUrl}\n\n${
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
 * Process the TAR archive and convert it to multipart/form-data stream,
 * with optimized filtering at the TAR reader level.
 */
async function processTarToMultipart(
  tarStream: ReadableStream,
  output: WritableStream,
  filterOptions: FilterOptions,
  responseOptions: ResponseOptions,
  requestStartTime: number,
): Promise<void> {
  const { omitFirstSegment, rawUrlPrefix, omitBinary } = filterOptions;
  const { boundary } = responseOptions;
  const writer = output.getWriter();

  try {
    // First decompress the gzip stream
    const decompressedStream = tarStream.pipeThrough(
      new DecompressionStream("gzip"),
    );

    // Process the TAR entries
    await processTarStream(decompressedStream, async (entry) => {
      try {
        // Skip directories
        if (entry.isDirectory) {
          return;
        }

        // Apply filtering
        const filter = shouldFilter(
          filterOptions,
          compileMatchers(filterOptions),
          entry.fileName,
          entry.isDirectory,
          entry.fileSize,
        );

        if (filter?.filter) {
          if (filter?.noCallback) {
            return;
          }

          // Process the file with filter info but without content
          const processedPath = processFilePath(
            entry.fileName,
            omitFirstSegment,
          );

          // Start multipart section
          await writer.write(encoder.encode(`--${boundary}\r\n`));
          await writer.write(
            encoder.encode(
              `Content-Disposition: form-data; name="${processedPath}"; filename="${processedPath}"\r\n`,
            ),
          );

          // Add headers without content
          const ext = entry.fileName.split(".").pop() || "";
          const contentType = (map[ext] ||
            "application/octet-stream") as string;
          await writer.write(
            encoder.encode(`Content-Type: ${contentType}\r\n`),
          );

          if (rawUrlPrefix) {
            const rawUrl = `${rawUrlPrefix}${processedPath}`;
            await writer.write(encoder.encode(`x-url: ${rawUrl}\r\n`));
          }

          const PLUGIN_NAME = "ingesttar";
          await writer.write(
            encoder.encode(
              `x-filter: ${PLUGIN_NAME};${filter.status || "404"};${
                filter.message || ""
              }\r\n`,
            ),
          );

          await writer.write(
            encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n\r\n`),
          );
          return;
        }

        const processedPath = processFilePath(entry.fileName, omitFirstSegment);
        const ext = entry.fileName.split(".").pop() || "";
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
        if (entry.fileSize !== undefined) {
          await writer.write(
            encoder.encode(`Content-Length: ${entry.fileSize}\r\n`),
          );
        }

        if (rawUrlPrefix) {
          const rawUrl = `${rawUrlPrefix}${processedPath}`;
          await writer.write(encoder.encode(`x-url: ${rawUrl}\r\n`));
        }

        const writeEmptyBinary = async () => {
          // For binary files with rawUrlPrefix, add x-url header instead of content
          await writer.write(
            encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
          );
          // Omit content for binary files when rawUrlPrefix is specified
          await writer.write(encoder.encode("\r\n"));
        };

        if (omitBinary && binaryExtensions.includes(ext)) {
          // Filter out binary files, while still responding with raw url but not with content
          await writeEmptyBinary();
          // Cancel the streaming if needed
          await entry.fileData?.cancel();
          return;
        }

        // Get content and hash
        const { content, hash } = await getContentAndHash(entry.fileData);

        if (hash) {
          await writer.write(encoder.encode(`x-file-hash: ${hash}\r\n`));
        }

        // Determine if content is binary
        const isBinaryContent = !isUtf8(content);

        // Skip binary files if omitBinary is true
        if (content && omitBinary && isBinaryContent) {
          await writeEmptyBinary();
          return;
        }

        // Regular handling: include content
        await writer.write(
          encoder.encode(
            `Content-Transfer-Encoding: ${
              isBinaryContent ? "binary" : "8bit"
            }\r\n\r\n`,
          ),
        );

        // Write the file content
        if (content) {
          await writer.write(content);
        }

        await writer.write(encoder.encode("\r\n"));
      } catch (error) {
        console.error(`Error processing file ${entry.fileName}:`, error);
      }
    });

    // End the multipart form data
    await writer.write(encoder.encode(`--${boundary}--\r\n`));

    const totalProcessingTime = Date.now() - requestStartTime;
    console.log({ totalProcessingTime });
  } catch (error) {
    console.error("Error processing TAR:", error);
  } finally {
    await writer.close();
  }
}

// TextEncoder for string to Uint8Array conversion
const encoder = new TextEncoder();

// Check if content is valid UTF-8
function isUtf8(data: Uint8Array | undefined): boolean {
  if (!data) {
    return false;
  }
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
  stream?: ReadableStream,
): Promise<{ content?: Uint8Array; hash?: string }> {
  if (!stream) {
    return { content: undefined, hash: undefined };
  }
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

const shouldFilter = (
  filterOptions: FilterOptions,
  matchers: CompiledMatchers,
  fileName: string,
  isDirectory: boolean,
  size?: number,
): {
  filter: boolean;
  noCallback?: boolean;
  status?: string;
  message?: string;
} => {
  if (isDirectory) return { filter: true, noCallback: true }; // Skip directories

  const {
    omitFirstSegment,
    basePath,
    maxFileSize,
    omitBinary,
    rawUrlPrefix,
    enableFuzzyMatching,
    pathPatterns,
    excludePathPatterns,
  } = filterOptions;

  // Process the path with omitFirstSegment if needed
  const processedPath = omitFirstSegment
    ? processFilePath(fileName, true)
    : fileName;

  // Check maxFileSize filter
  if (maxFileSize !== undefined && size !== undefined && size > maxFileSize) {
    return { filter: true, status: "413", message: "Content too large" };
  }

  const ext = processedPath.split(".").pop()!;

  if (omitBinary && !rawUrlPrefix && binaryExtensions.includes(ext)) {
    // First, most efficient way, to exclude binaries
    return {
      filter: true,
      status: "415",
      message: "File has binary extension",
    };
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
      return { filter: true, status: "404", message: "No basePath matched" };
    }
  }

  // Extract basename once for potential basename pattern matching
  const basename = processedPath.split("/").pop() || "";
  const normalizedPath = withoutSlash(processedPath);

  // Apply inclusion patterns if defined
  let included = true;
  if (
    matchers.hasInclusion ||
    (enableFuzzyMatching && pathPatterns && pathPatterns.length > 0)
  ) {
    // Check normal patterns from picomatch
    const matchesNormalPattern = matchers.inclusionMatchers.normal.some(
      (matcher) => matcher(normalizedPath),
    );

    // Check basename patterns from picomatch
    const matchesBasenamePattern = matchers.inclusionMatchers.basename.some(
      (matcher) => matcher(basename),
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
    return {
      filter: true,
      status: "404",
      message: "Not included in path patterns",
    };
  }

  // Apply exclusion patterns
  if (
    matchers.hasExclusion ||
    (enableFuzzyMatching &&
      excludePathPatterns &&
      excludePathPatterns.length > 0)
  ) {
    // Check normal patterns from picomatch
    const matchesNormalExcludePattern = matchers.exclusionMatchers.normal.some(
      (matcher) => matcher(normalizedPath),
    );

    // Check basename patterns from picomatch
    const matchesBasenameExcludePattern =
      matchers.exclusionMatchers.basename.some((matcher) => matcher(basename));

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
      return {
        filter: true,
        status: "404",
        message: "Excluded by excludePathPatterns",
      };
    }
  }

  // If we reach this point, the file should be processed
  return { filter: false };
};

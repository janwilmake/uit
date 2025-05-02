// Import picomatch for glob pattern matching
import picomatch from "picomatch";
import map from "./public/ext-to-mime.json";
import binaryExtensions from "binary-extensions";
import { Env, FilterOptions, RequestParams, ResponseOptions } from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Parse the request parameters
    const requestStartTime = Date.now();

    const params = parseRequest(request);
    const { jsonUrl, filterOptions, responseOptions } = params;

    // Include timing info in response headers
    const responseHeaders = new Headers({
      "Content-Type": responseOptions.isBrowser
        ? `text/plain; boundary=${responseOptions.boundary}; charset=utf-8`
        : `multipart/form-data; boundary=${responseOptions.boundary}`,
      "Transfer-Encoding": "chunked",
    });

    // Validate the JSON URL
    if (!jsonUrl) {
      return new Response("No JSON URL provided", { status: 400 });
    }

    // Check authentication
    if (!isAuthenticated(request, env.CREDENTIALS)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="JSON Access"',
        },
      });
    }

    try {
      // Prepare headers for fetching the JSON
      const headers = new Headers({ "User-Agent": "Cloudflare-Worker" });
      if (responseOptions.authHeader) {
        headers.set("Authorization", responseOptions.authHeader);
      }

      // Fetch the JSON
      const jsonResponse = await fetch(jsonUrl, { headers });

      if (!jsonResponse.ok) {
        return createErrorResponse(jsonResponse, params.jsonUrl);
      }

      const initialResponseTime = Date.now() - requestStartTime;
      responseHeaders.set(
        "X-Initial-Response-Time-Ms",
        initialResponseTime.toString(),
      );

      // Parse the JSON data
      const jsonData = await jsonResponse.json();

      // Process and stream the JSON as files
      const { readable, writable } = new TransformStream();

      // Start processing the JSON in the background
      processJsonToMultipart(
        jsonData,
        writable,
        filterOptions,
        responseOptions,
        requestStartTime,
      );

      return new Response(readable, { headers: responseHeaders });
    } catch (error) {
      return new Response(`Error processing JSON: ${error.message}`, {
        status: 500,
      });
    }
  },
};

function parseRequest(request: Request): RequestParams {
  const url = new URL(request.url);

  // Extract the JSON URL from the path
  const jsonUrl = decodeURIComponent(url.pathname.slice(1));

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

  return { jsonUrl, filterOptions, responseOptions };
}

function createErrorResponse(response: Response, jsonUrl: string): Response {
  return new Response(
    `----\nIngestjson: Failed to fetch JSON: URL=${jsonUrl}\n\n${
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
 * Process the JSON data and convert it to multipart/form-data stream
 */
async function processJsonToMultipart(
  jsonData: any,
  output: WritableStream,
  filterOptions: FilterOptions,
  responseOptions: ResponseOptions,
  requestStartTime: number,
): Promise<void> {
  const { omitFirstSegment, rawUrlPrefix, omitBinary } = filterOptions;
  const { boundary } = responseOptions;
  const writer = output.getWriter();
  const encoder = new TextEncoder();

  try {
    // Determine file structure based on JSON shape
    const fileEntries = extractFileEntries(jsonData);

    // Compile matchers once
    const matchers = compileMatchers(filterOptions);

    // Process each file entry
    for (const { path, content, contentType, isUrl, size } of fileEntries) {
      try {
        // Apply filtering
        const filter = shouldFilter(
          filterOptions,
          matchers,
          path,
          false, // isDirectory
          size,
        );

        if (filter?.filter) {
          // If filtered out, decide whether to include in response with filter info
          if (filter.noCallback) {
            continue;
          }

          // Start multipart section
          await writer.write(encoder.encode(`--${boundary}\r\n`));
          await writer.write(
            encoder.encode(
              `Content-Disposition: form-data; name="${path}"; filename="${path}"\r\n`,
            ),
          );
          await writer.write(
            encoder.encode(`Content-Type: application/json\r\n`),
          );
          await writer.write(
            encoder.encode(
              `x-filter: ingestjson;${filter.status || "404"};${
                filter.message || ""
              }\r\n\r\n`,
            ),
          );
          await writer.write(encoder.encode("\r\n"));
          continue;
        }

        // Process path according to options
        const processedPath = processFilePath(path, omitFirstSegment);
        const ext = processedPath.split(".").pop() || "json";
        const finalContentType =
          contentType || ((map[ext] || "application/json") as string);

        // Check if it's a binary file
        const isBinary = binaryExtensions.includes(ext);

        if (omitBinary && isBinary && !isUrl) {
          continue;
        }

        // Start multipart section
        await writer.write(encoder.encode(`--${boundary}\r\n`));
        await writer.write(
          encoder.encode(
            `Content-Disposition: form-data; name="${processedPath}"; filename="${processedPath}"\r\n`,
          ),
        );
        await writer.write(
          encoder.encode(`Content-Type: ${finalContentType}\r\n`),
        );

        if (size !== undefined) {
          await writer.write(encoder.encode(`Content-Length: ${size}\r\n`));
        }

        // Handle binary content with raw URL prefix
        if ((isBinary || isUrl) && rawUrlPrefix) {
          const rawUrl = isUrl ? content : `${rawUrlPrefix}${processedPath}`;

          await writer.write(encoder.encode(`x-url: ${rawUrl}\r\n`));
          await writer.write(
            encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
          );
          await writer.write(encoder.encode("\r\n"));
          continue;
        }

        // For binary content without rawUrlPrefix but with omitBinary
        if (omitBinary && isBinary) {
          await writer.write(
            encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
          );
          await writer.write(encoder.encode("\r\n"));
          continue;
        }

        // For content that needs to be streamed
        if (isUrl && !rawUrlPrefix) {
          try {
            // Fetch the content from the URL
            const contentResponse = await fetch(content);
            if (!contentResponse.ok) {
              throw new Error(
                `Failed to fetch content: ${contentResponse.status}`,
              );
            }

            const contentData = await contentResponse.arrayBuffer();
            const contentUint8 = new Uint8Array(contentData);

            // Calculate hash
            const hashBuffer = await crypto.subtle.digest(
              "SHA-256",
              contentUint8,
            );
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

            await writer.write(encoder.encode(`x-file-hash: ${hashHex}\r\n`));
            await writer.write(
              encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
            );

            // Write the content
            await writer.write(contentUint8);
            await writer.write(encoder.encode("\r\n"));
          } catch (error) {
            // If there's an error fetching content, include error info
            await writer.write(
              encoder.encode(`x-error: ${error.message}\r\n\r\n`),
            );
            await writer.write(encoder.encode("\r\n"));
          }
          continue;
        }

        // For direct content (not URL)
        let contentBuffer: Uint8Array;
        let hash: string | undefined;

        if (typeof content === "string") {
          contentBuffer = encoder.encode(content);
        } else if (content instanceof Uint8Array) {
          contentBuffer = content;
        } else {
          // For JSON data, stringify it
          contentBuffer = encoder.encode(
            typeof content === "object"
              ? JSON.stringify(content, null, 2)
              : String(content),
          );
        }

        // Calculate hash
        if (contentBuffer) {
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            contentBuffer,
          );
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        }

        if (hash) {
          await writer.write(encoder.encode(`x-file-hash: ${hash}\r\n`));
        }

        const contentIsBinary = !isUtf8(contentBuffer);
        await writer.write(
          encoder.encode(
            `Content-Transfer-Encoding: ${
              contentIsBinary ? "binary" : "8bit"
            }\r\n\r\n`,
          ),
        );

        // Write the content
        await writer.write(contentBuffer);
        await writer.write(encoder.encode("\r\n"));
      } catch (error) {
        console.error(`Error processing file ${path}:`, error);
      }
    }

    // End the multipart form data
    await writer.write(encoder.encode(`--${boundary}--\r\n`));

    const totalProcessingTime = Date.now() - requestStartTime;
    console.log({ totalProcessingTime });
  } catch (error) {
    console.error("Error processing JSON:", error);
  } finally {
    await writer.close();
  }
}

// Extract file entries from JSON data based on its shape
function extractFileEntries(jsonData: any): Array<{
  path: string;
  content: any;
  contentType?: string;
  isUrl: boolean;
  size?: number;
}> {
  const entries: Array<{
    path: string;
    content: any;
    contentType?: string;
    isUrl: boolean;
    size?: number;
  }> = [];

  // Check if the JSON has the specified shape
  if (
    jsonData &&
    typeof jsonData === "object" &&
    jsonData.files &&
    typeof jsonData.files === "object"
  ) {
    // Process files according to the specified schema
    for (const [path, fileInfo] of Object.entries(jsonData.files)) {
      if (typeof fileInfo !== "object") continue;

      const { type, content, url, contentType, size } = fileInfo as any;

      if (type === "binary" && url) {
        entries.push({
          path,
          content: url,
          contentType,
          isUrl: true,
          size,
        });
      } else if (type === "content" && content !== undefined) {
        entries.push({
          path,
          content,
          contentType,
          isUrl: false,
          size: typeof content === "string" ? content.length : undefined,
        });
      }
    }
  } else if (jsonData && typeof jsonData === "object") {
    // For other JSON objects, create files based on first-level entries
    if (Array.isArray(jsonData)) {
      // For arrays, use indices as filenames
      jsonData.forEach((item, index) => {
        const content = JSON.stringify(item, null, 2);
        entries.push({
          path: `/${index}.json`,
          content,
          contentType: "application/json",
          isUrl: false,
          size: content.length,
        });
      });
    } else {
      // For objects, use keys as filenames
      for (const [key, value] of Object.entries(jsonData)) {
        const content = JSON.stringify(value, null, 2);
        let filename = key;

        // Use id or slug if available
        if (typeof value === "object" && value !== null) {
          if ("id" in value) {
            filename = (value as any).id;
          } else if ("slug" in value) {
            filename = (value as any).slug;
          }
        }
        console.log("file found", filename);
        entries.push({
          path: `/${filename}.json`,
          content,
          contentType: "application/json",
          isUrl: false,
          size: content.length,
        });
      }
    }
  }

  return entries;
}

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

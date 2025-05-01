import picomatch from "picomatch";
import { Env, FilterOptions, RequestParams, ResponseOptions } from "./types";

// Known file extensions to detect in JSON keys
const KNOWN_EXTENSIONS = [
  "json",
  "yaml",
  "yml",
  "ts",
  "js",
  "html",
  "css",
  "md",
  "txt",
  "jsx",
  "tsx",
  "scss",
  "less",
  "xml",
  "svg",
  "csv",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "sh",
  "rb",
];

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
          "WWW-Authenticate": 'Basic realm="Archive Access"',
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

      const initialResponseTime = Date.now() - requestStartTime;
      responseHeaders.set(
        "X-Initial-Response-Time-Ms",
        initialResponseTime.toString(),
      );

      if (!jsonResponse.ok) {
        return createErrorResponse(jsonResponse, jsonUrl);
      }

      // Get JSON content
      const jsonData = await jsonResponse.json();

      // Process and stream the JSON contents to multipart form data
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

  // Parse filter options (adapted from ingestzip, removing irrelevant options)
  const filterOptions: FilterOptions = {
    enableFuzzyMatching: url.searchParams.get("enableFuzzyMatching") === "true",
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

// TextEncoder for string to Uint8Array conversion
const encoder = new TextEncoder();

// Helper functions for path normalization - mirroring ingestzip
const prependSlash = (path: string) =>
  path.startsWith("/") ? path : "/" + path;
const surroundSlash = (path: string) =>
  path.endsWith("/") ? prependSlash(path) : prependSlash(path) + "/";
const withoutSlash = (path: string) =>
  path.startsWith("/") ? path.slice(1) : path;

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
  const { boundary } = responseOptions;
  const writer = output.getWriter();

  try {
    // Initialize path trackers and file collections
    const files: {
      path: string;
      content: string;
      contentType: string;
    }[] = [];

    // Process the JSON data recursively
    processJsonRecursively(jsonData, "", files);

    // Apply filters if needed
    const filteredFiles = applyFilters(files, filterOptions);

    // Write each file to the multipart form data
    for (const file of filteredFiles) {
      // Start multipart section
      await writer.write(encoder.encode(`--${boundary}\r\n`));
      await writer.write(
        encoder.encode(
          `Content-Disposition: form-data; name="${file.path}"; filename="${file.path}"\r\n`,
        ),
      );

      // Add content type header
      await writer.write(
        encoder.encode(`Content-Type: ${file.contentType}\r\n`),
      );

      // Add content length if available
      const contentBytes = encoder.encode(file.content);
      await writer.write(
        encoder.encode(`Content-Length: ${contentBytes.length}\r\n`),
      );

      // Hash the content
      const hashBuffer = await crypto.subtle.digest("SHA-256", contentBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await writer.write(encoder.encode(`x-file-hash: ${hashHex}\r\n`));

      // Transfer encoding - assuming text content
      await writer.write(
        encoder.encode(`Content-Transfer-Encoding: 8bit\r\n\r\n`),
      );

      // Write the file content
      await writer.write(contentBytes);
      await writer.write(encoder.encode("\r\n"));
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

/**
 * Recursively process JSON data, extracting files based on keys and structure
 */
function processJsonRecursively(
  data: any,
  currentPath: string,
  files: { path: string; content: string; contentType: string }[],
): void {
  // Base case: null or undefined
  if (data === null || data === undefined) {
    return;
  }

  // Handle different data types
  if (typeof data === "object") {
    if (Array.isArray(data)) {
      // Process arrays
      let removed = false;

      // Look for any array items to extract as files
      for (let i = 0; i < data.length; i++) {
        processJsonRecursively(data[i], `${currentPath}/${i}`, files);
      }

      // If the array wasn't completely processed as files, save the remaining array
      if (!removed && data.length > 0) {
        const arrayPath = `${currentPath}/index.json`;
        files.push({
          path: arrayPath.startsWith("/") ? arrayPath.substring(1) : arrayPath,
          content: JSON.stringify(data, null, 2),
          contentType: "application/json",
        });
      }
    } else {
      // Create a copy of the object to modify
      const objectCopy = { ...data };
      let hasRemainingProperties = false;

      // First pass: identify and extract keys with extensions
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];

          // Check if key contains a file extension
          const keyParts = key.split(".");
          if (keyParts.length > 1) {
            const extension = keyParts[keyParts.length - 1].toLowerCase();
            if (KNOWN_EXTENSIONS.includes(extension)) {
              const filePath = `${currentPath}/${key}`;

              // Extract as a file with the extension
              if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
              ) {
                files.push({
                  path: filePath.startsWith("/")
                    ? filePath.substring(1)
                    : filePath,
                  content: String(value),
                  contentType: getContentType(extension),
                });

                // Remove from the object copy
                delete objectCopy[key];
              } else {
                // If it's an object/array but has a file extension in the key
                files.push({
                  path: filePath.startsWith("/")
                    ? filePath.substring(1)
                    : filePath,
                  content: JSON.stringify(value, null, 2),
                  contentType: getContentType(extension),
                });

                // Remove from the object copy
                delete objectCopy[key];
              }
              continue;
            }
          }

          // Check if key is numeric (should be treated as a file)
          if (!isNaN(Number(key))) {
            const itemPath = `${currentPath}/${key}`;
            processJsonRecursively(value, itemPath, files);
            delete objectCopy[key];
            continue;
          }

          // Recursively process nested objects and arrays
          processJsonRecursively(value, `${currentPath}/${key}`, files);
          delete objectCopy[key];
        }
      }

      // Check if we have any properties left
      for (const key in objectCopy) {
        if (Object.prototype.hasOwnProperty.call(objectCopy, key)) {
          hasRemainingProperties = true;
          break;
        }
      }

      // If there are remaining properties, save as index.json
      if (hasRemainingProperties) {
        const objectPath = `${currentPath}/index.json`;
        files.push({
          path: objectPath.startsWith("/")
            ? objectPath.substring(1)
            : objectPath,
          content: JSON.stringify(objectCopy, null, 2),
          contentType: "application/json",
        });
      }
    }
  } else {
    // Handle primitive values (string, number, boolean)
    const extension = typeof data === "string" ? guessExtension(data) : "txt";
    const filePath = `${currentPath}.${extension}`;

    files.push({
      path: filePath.startsWith("/") ? filePath.substring(1) : filePath,
      content: String(data),
      contentType: getContentType(extension),
    });
  }
}

/**
 * Try to guess the file extension based on content
 */
function guessExtension(content: string): string {
  // Simple heuristics for file type detection
  if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
    try {
      JSON.parse(content);
      return "json";
    } catch {
      // Not valid JSON
    }
  }

  if (content.trim().startsWith("<") && content.trim().endsWith(">")) {
    return "html";
  }

  if (
    content.includes("function ") ||
    content.includes("const ") ||
    content.includes("let ") ||
    content.includes("var ")
  ) {
    return "js";
  }

  // Default to txt for plain text
  return "txt";
}

/**
 * Get the content type based on file extension
 */
function getContentType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    json: "application/json",
    yaml: "application/yaml",
    yml: "application/yaml",
    ts: "application/typescript",
    js: "application/javascript",
    html: "text/html",
    css: "text/css",
    md: "text/markdown",
    txt: "text/plain",
    jsx: "application/javascript",
    tsx: "application/typescript",
    scss: "text/x-scss",
    less: "text/x-less",
    xml: "application/xml",
    svg: "image/svg+xml",
    csv: "text/csv",
    py: "text/x-python",
    go: "text/x-go",
    rs: "text/x-rust",
    java: "text/x-java",
    c: "text/x-c",
    cpp: "text/x-c++",
    h: "text/x-c",
    hpp: "text/x-c++",
    sh: "text/x-sh",
    rb: "text/x-ruby",
  };

  return mimeTypes[extension] || "text/plain";
}

/**
 * Precompile picomatch patterns for faster matching - similar to ingestzip approach
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

// CompiledMatchers interface
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
 * Apply filters to the extracted files based on filter options
 */
function applyFilters(
  files: { path: string; content: string; contentType: string }[],
  filterOptions: FilterOptions,
): { path: string; content: string; contentType: string }[] {
  const { basePath, maxFileSize, enableFuzzyMatching } = filterOptions;
  const matchers = compileMatchers(filterOptions);

  return files.filter((file) => {
    // Check maxFileSize filter
    if (maxFileSize !== undefined) {
      const contentSize = encoder.encode(file.content).length;
      if (contentSize > maxFileSize) {
        return false;
      }
    }

    // Check base path filter
    if (basePath && basePath.length > 0) {
      const matchesBasePath = basePath.some((base) => {
        const normalizedBase = surroundSlash(base);
        const normalizedFilename = surroundSlash(file.path);
        return normalizedFilename.startsWith(normalizedBase);
      });

      if (!matchesBasePath) {
        return false;
      }
    }

    // Extract basename for pattern matching
    const normalizedPath = withoutSlash(file.path);
    const basename = file.path.split("/").pop() || "";

    // Apply inclusion patterns if defined
    let included = true;
    if (matchers.hasInclusion) {
      // Check normal patterns from picomatch
      const matchesNormalPattern = matchers.inclusionMatchers.normal.some(
        (matcher) => matcher(normalizedPath),
      );

      // Check basename patterns from picomatch
      const matchesBasenamePattern = matchers.inclusionMatchers.basename.some(
        (matcher) => matcher(basename),
      );

      // Apply fuzzy matching if enabled
      const matchesFuzzyPattern = enableFuzzyMatching
        ? filterOptions.pathPatterns.some((pattern) => {
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
    if (matchers.hasExclusion) {
      // Check normal patterns from picomatch
      const matchesNormalExcludePattern =
        matchers.exclusionMatchers.normal.some((matcher) =>
          matcher(normalizedPath),
        );

      // Check basename patterns from picomatch
      const matchesBasenameExcludePattern =
        matchers.exclusionMatchers.basename.some((matcher) =>
          matcher(basename),
        );

      // Apply fuzzy matching if enabled
      const matchesFuzzyExcludePattern = enableFuzzyMatching
        ? filterOptions.excludePathPatterns.some((pattern) => {
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

    return true;
  });
}

/**
 * Simple fuzzy matching function (similar to the one in ingestzip)
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

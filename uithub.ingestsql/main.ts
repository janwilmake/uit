import picomatch from "picomatch";
import map from "./public/ext-to-mime.json";
import binaryExtensions from "binary-extensions";
import {
  Env,
  FilterOptions,
  RequestParams,
  ResponseOptions,
  StreamRecord,
  ColumnTemplate,
  ProcessedRow,
} from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Parse the request parameters
    const requestStartTime = Date.now();

    const params = parseRequest(request);
    const { sqlUrl, filterOptions, responseOptions } = params;

    // Include timing info in response headers
    const responseHeaders = new Headers({
      "Content-Type": responseOptions.isBrowser
        ? `text/plain; boundary=${responseOptions.boundary}; charset=utf-8`
        : `multipart/form-data; boundary=${responseOptions.boundary}`,
      "Transfer-Encoding": "chunked",
    });

    // Validate the SQL URL
    if (!sqlUrl) {
      return new Response("No SQL URL provided", { status: 400 });
    }

    // Check authentication
    if (!isAuthenticated(request, env.CREDENTIALS)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="SQL Access"',
        },
      });
    }

    try {
      // Prepare headers for fetching SQL data
      const headers = new Headers({
        "User-Agent": "Cloudflare-Worker",
        Accept: "application/x-ndjson",
      });

      if (responseOptions.authHeader) {
        headers.set("Authorization", responseOptions.authHeader);
      }

      // Fetch the SQL data
      const sqlResponse = await fetch(sqlUrl, { headers });

      const initialResponseTime = Date.now() - requestStartTime;
      responseHeaders.set(
        "X-Initial-Response-Time-Ms",
        initialResponseTime.toString(),
      );

      if (!sqlResponse.ok || !sqlResponse.body) {
        return createErrorResponse(sqlResponse, params.sqlUrl);
      }

      // Process and stream the SQL contents
      const { readable, writable } = new TransformStream();

      // Start processing the SQL data in the background
      processSqlToMultipart(
        sqlResponse.body,
        writable,
        filterOptions,
        params.responseOptions,
        requestStartTime,
      );

      return new Response(readable, { headers: responseHeaders });
    } catch (error) {
      return new Response(`Error processing SQL: ${error.message}`, {
        status: 500,
      });
    }
  },
};

function parseRequest(request: Request): RequestParams {
  const url = new URL(request.url);

  // Extract the SQL URL from the path
  const sqlUrl = decodeURIComponent(url.pathname.slice(1));

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
    itemTemplate: url.searchParams.getAll("itemTemplate"),
    columnTemplate: url.searchParams.getAll("columnTemplate"),
  };

  // Prepare response options
  const responseOptions: ResponseOptions = {
    boundary: `----WebKitFormBoundary${generateRandomString(16)}`,
    isBrowser: isBrowserRequest(request),
    authHeader: request.headers.get("x-source-authorization"),
  };

  return { sqlUrl, filterOptions, responseOptions };
}

function createErrorResponse(response: Response, sqlUrl: string): Response {
  return new Response(
    `----\nIngestSQL: Failed to fetch SQL data: URL=${sqlUrl}\n\n${
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

/**
 * Parse column templates from the format "columnName:pathTemplate"
 */
function parseColumnTemplates(templates: string[]): ColumnTemplate[] {
  const result: ColumnTemplate[] = [];

  for (const template of templates) {
    const colonIndex = template.indexOf(":");
    if (colonIndex > 0) {
      const columnName = template.substring(0, colonIndex);
      const pathTemplate = template.substring(colonIndex + 1);
      result.push({ columnName, pathTemplate });
    }
  }

  return result;
}

/**
 * Apply template to a row of data to create a filename
 * Replaces {property} with the corresponding property value
 */
function applyTemplate(template: string, row: ProcessedRow): string {
  let result = template;

  // Replace column references
  for (let i = 0; i < row.columns.length; i++) {
    const columnName = row.columns[i];
    const value = row.data[i];

    if (value !== null && value !== undefined) {
      // Replace both {columnName} and {index} patterns
      result = result.replace(
        new RegExp(`\\{${columnName}\\}`, "g"),
        String(value),
      );
    }
  }

  // Replace row index
  result = result.replace(/\{index\}/g, String(row.index));

  return result;
}

/**
 * Check if a path should be filtered based on the filter options
 */
function shouldFilter(
  filterOptions: FilterOptions,
  matchers: CompiledMatchers,
  filePath: string,
  fileSize?: number,
): {
  filter: boolean;
  status?: string;
  message?: string;
} {
  const {
    omitFirstSegment,
    basePath,
    maxFileSize,
    pathPatterns,
    excludePathPatterns,
    enableFuzzyMatching,
  } = filterOptions;

  // Process the path with omitFirstSegment if needed
  const processedPath = omitFirstSegment
    ? processFilePath(filePath, true)
    : filePath;

  // Check maxFileSize filter
  if (
    maxFileSize !== undefined &&
    fileSize !== undefined &&
    fileSize > maxFileSize
  ) {
    return { filter: true, status: "413", message: "Content too large" };
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
}

/**
 * Process file path for omitFirstSegment option
 */
function processFilePath(fileName: string, omitFirstSegment: boolean): string {
  if (!omitFirstSegment) return fileName;

  const parts = fileName.split("/");
  if (parts.length <= 1) return fileName;

  return "/" + parts.slice(1).join("/");
}

/**
 * Helper functions for path normalization
 */
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

/**
 * Determine if content is likely to be a URL
 */
function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get file extension from path
 */
function getExtension(path: string): string {
  return path.split(".").pop()?.toLowerCase() || "";
}

/**
 * Get content type from file extension
 */
function getContentType(ext: string): string {
  return (map[ext] || "application/octet-stream") as string;
}

/**
 * Check if content is valid UTF-8
 */
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

// TextEncoder for string to Uint8Array conversion
const encoder = new TextEncoder();

/**
 * Generate SHA-256 hash for content
 */
async function generateHash(content: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Process SQL data stream to multipart/form-data
 */
async function processSqlToMultipart(
  sqlStream: ReadableStream,
  output: WritableStream,
  filterOptions: FilterOptions,
  responseOptions: ResponseOptions,
  requestStartTime: number,
): Promise<void> {
  const { boundary } = responseOptions;
  const writer = output.getWriter();
  const reader = sqlStream.getReader();
  const matchers = compileMatchers(filterOptions);

  // Parse item and column templates
  const itemTemplates = filterOptions.itemTemplate || [];
  const columnTemplates = parseColumnTemplates(
    filterOptions.columnTemplate || [],
  );

  let columns: string[] = [];
  let rowCount = 0;
  const textDecoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in the buffer
        if (buffer.trim()) {
          await processRecord(JSON.parse(buffer.trim()));
        }
        break;
      }

      const chunk = textDecoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last (potentially incomplete) line in the buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const record: StreamRecord = JSON.parse(line);
            await processRecord(record);
          } catch (e) {
            console.error("Error parsing JSON line:", e);
          }
        }
      }
    }

    // End the multipart form data
    await writer.write(encoder.encode(`--${boundary}--\r\n`));

    const totalProcessingTime = Date.now() - requestStartTime;
    console.log({ totalProcessingTime, rowsProcessed: rowCount });
  } catch (error) {
    console.error("Error processing SQL data:", error);
  } finally {
    await writer.close();
  }

  async function processRecord(record: StreamRecord): Promise<void> {
    if (record.type === "columns" && Array.isArray(record.data)) {
      columns = record.data as string[];
    } else if (record.type === "row" && Array.isArray(record.data)) {
      const rowData = record.data as any[];
      const row: ProcessedRow = {
        index: rowCount++,
        data: rowData,
        columns: columns,
      };

      // Process item templates
      for (const template of itemTemplates) {
        if (template) {
          const filePath = applyTemplate(template, row);
          await writeFile(filePath, row);
        }
      }

      // Process column templates
      for (const template of columnTemplates) {
        const columnIndex = columns.indexOf(template.columnName);
        if (columnIndex >= 0 && columnIndex < rowData.length) {
          const value = rowData[columnIndex];
          if (value !== null && value !== undefined) {
            const filePath = applyTemplate(template.pathTemplate, row);
            await writeColumnFile(filePath, value);
          }
        }
      }
    }
  }

  /**
   * Write a file from row data
   */
  async function writeFile(filePath: string, row: ProcessedRow): Promise<void> {
    // Check if this file should be filtered
    const filterResult = shouldFilter(filterOptions, matchers, filePath);
    if (filterResult.filter) {
      // Write filtered file with empty content and filter header
      await writeFilteredFile(filePath, filterResult);
      return;
    }

    // Convert row to JSON
    const content = JSON.stringify(
      Object.fromEntries(row.columns.map((col, i) => [col, row.data[i]])),
      null,
      2,
    );
    const contentBytes = encoder.encode(content);

    // Calculate hash
    const hash = await generateHash(contentBytes);

    // Get file extension and content type
    const ext = getExtension(filePath);
    const contentType = getContentType(ext);

    // Start multipart section
    await writer.write(encoder.encode(`--${boundary}\r\n`));
    await writer.write(
      encoder.encode(
        `Content-Disposition: form-data; name="${filePath}"; filename="${filePath}"\r\n`,
      ),
    );
    await writer.write(encoder.encode(`Content-Type: ${contentType}\r\n`));
    await writer.write(
      encoder.encode(`Content-Length: ${contentBytes.length}\r\n`),
    );
    await writer.write(encoder.encode(`x-file-hash: ${hash}\r\n`));
    await writer.write(
      encoder.encode(`Content-Transfer-Encoding: 8bit\r\n\r\n`),
    );
    await writer.write(contentBytes);
    await writer.write(encoder.encode("\r\n"));
  }

  /**
   * Write a file from a single column value
   */
  async function writeColumnFile(filePath: string, value: any): Promise<void> {
    // Check if this file should be filtered
    const filterResult = shouldFilter(filterOptions, matchers, filePath);
    if (filterResult.filter) {
      // Write filtered file with empty content and filter header
      await writeFilteredFile(filePath, filterResult);
      return;
    }

    // Check if the value is a URL
    const isUrlValue = typeof value === "string" && isUrl(value);

    // Get file extension and content type
    const ext = getExtension(filePath);
    const contentType = getContentType(ext);
    const isBinaryExt = binaryExtensions.includes(ext);

    // Handle binary files with rawUrlPrefix or URL values
    if (
      (filterOptions.omitBinary && isBinaryExt) ||
      (isUrlValue && filterOptions.rawUrlPrefix)
    ) {
      await writeEmptyFile(
        filePath,
        contentType,
        isUrlValue ? value : `${filterOptions.rawUrlPrefix}${filePath}`,
      );
      return;
    }

    // Convert value to string or JSON if object
    let content: string;
    if (typeof value === "object") {
      content = JSON.stringify(value, null, 2);
    } else {
      content = String(value);
    }

    const contentBytes = encoder.encode(content);

    // Calculate hash
    const hash = await generateHash(contentBytes);

    // Start multipart section
    await writer.write(encoder.encode(`--${boundary}\r\n`));
    await writer.write(
      encoder.encode(
        `Content-Disposition: form-data; name="${filePath}"; filename="${filePath}"\r\n`,
      ),
    );
    await writer.write(encoder.encode(`Content-Type: ${contentType}\r\n`));
    await writer.write(
      encoder.encode(`Content-Length: ${contentBytes.length}\r\n`),
    );
    await writer.write(encoder.encode(`x-file-hash: ${hash}\r\n`));

    if (isUrlValue) {
      await writer.write(encoder.encode(`x-url: ${value}\r\n`));
    }

    await writer.write(
      encoder.encode(`Content-Transfer-Encoding: 8bit\r\n\r\n`),
    );
    await writer.write(contentBytes);
    await writer.write(encoder.encode("\r\n"));
  }

  /**
   * Write a filtered file with status and message
   */
  async function writeFilteredFile(
    filePath: string,
    filterResult: { filter: boolean; status?: string; message?: string },
  ): Promise<void> {
    const ext = getExtension(filePath);
    const contentType = getContentType(ext);

    await writer.write(encoder.encode(`--${boundary}\r\n`));
    await writer.write(
      encoder.encode(
        `Content-Disposition: form-data; name="${filePath}"; filename="${filePath}"\r\n`,
      ),
    );
    await writer.write(encoder.encode(`Content-Type: ${contentType}\r\n`));
    await writer.write(
      encoder.encode(
        `x-filter: ingestsql;${filterResult.status || "404"};${
          filterResult.message || ""
        }\r\n`,
      ),
    );
    await writer.write(
      encoder.encode(`Content-Transfer-Encoding: 8bit\r\n\r\n`),
    );
    await writer.write(encoder.encode("\r\n"));
  }

  /**
   * Write an empty file with URL reference
   */
  async function writeEmptyFile(
    filePath: string,
    contentType: string,
    url: string,
  ): Promise<void> {
    await writer.write(encoder.encode(`--${boundary}\r\n`));
    await writer.write(
      encoder.encode(
        `Content-Disposition: form-data; name="${filePath}"; filename="${filePath}"\r\n`,
      ),
    );
    await writer.write(encoder.encode(`Content-Type: ${contentType}\r\n`));
    await writer.write(encoder.encode(`x-url: ${url}\r\n`));
    await writer.write(
      encoder.encode(`Content-Transfer-Encoding: binary\r\n\r\n`),
    );
    await writer.write(encoder.encode("\r\n"));
  }
}

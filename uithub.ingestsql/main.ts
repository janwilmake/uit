// Import picomatch for glob pattern matching
import picomatch from "picomatch";
import {
  Env,
  FilterOptions,
  RequestParams,
  ResponseOptions,
  SqlTable,
  SqlQueryResult,
  SqlRecord,
  SqlResponse,
  TableStats,
  CompiledMatchers,
} from "./types";

const BATCH_SIZE = 200; // Process rows in batches to manage memory

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
      return new Response("No SQL server URL provided", { status: 400 });
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
      // Process and stream the SQL contents
      const { readable, writable } = new TransformStream();

      // Start processing SQL data in the background
      ctx.waitUntil(
        processSqlToMultipart(
          sqlUrl,
          writable,
          filterOptions,
          responseOptions,
          requestStartTime,
        ),
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
  };

  // Prepare response options
  const responseOptions: ResponseOptions = {
    boundary: `----WebKitFormBoundary${generateRandomString(16)}`,
    isBrowser: isBrowserRequest(request),
    authHeader: request.headers.get("x-source-authorization"),
  };

  return { sqlUrl, filterOptions, responseOptions };
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
 * Process the SQL data and convert it to multipart/form-data stream
 */
async function processSqlToMultipart(
  sqlUrl: string,
  output: WritableStream,
  filterOptions: FilterOptions,
  responseOptions: ResponseOptions,
  requestStartTime: number,
): Promise<void> {
  const writer = output.getWriter();
  const encoder = new TextEncoder();
  const { boundary } = responseOptions;

  try {
    // Fetch tables and their schema
    const tables = await fetchTables(sqlUrl, responseOptions.authHeader);
    const matchers = compileMatchers(filterOptions);

    // Process each table
    const tableStats: TableStats[] = [];

    for (const table of tables) {
      const tableStartTime = Date.now();
      let offset = 0;
      let hasMoreRows = true;
      let totalProcessed = 0;

      // Process the table in batches to manage memory
      while (hasMoreRows) {
        // Build SQL query with filters applied at SQL level
        const query = buildFilteredQuery(
          table,
          filterOptions,
          BATCH_SIZE,
          offset,
        );

        // Execute query
        const records = await executeQuery(
          sqlUrl,
          query,
          responseOptions.authHeader,
        );

        // Check if we've processed all rows
        hasMoreRows = records.length === BATCH_SIZE;
        offset += BATCH_SIZE;

        // Process and filter records
        for (const record of records) {
          // Apply client-side filtering if needed
          const filter = shouldFilter(record.path, filterOptions, matchers);

          if (filter.filter) {
            // If filtered out, we can optionally include a header with filter info
            if (!filter.noCallback) {
              await writeFilteredRecord(
                writer,
                encoder,
                boundary,
                record,
                filter,
              );
            }
            continue;
          }

          // Write the record to the FormData stream
          await writeRecord(writer, encoder, boundary, record);
          totalProcessed++;
        }

        // If no more rows, break the loop
        if (!hasMoreRows || records.length === 0) break;
      }

      tableStats.push({
        name: table.name,
        totalRows: await countTableRows(
          sqlUrl,
          table.name,
          responseOptions.authHeader,
        ),
        processedRows: totalProcessed,
      });

      console.log(
        `Processed table ${table.name} in ${Date.now() - tableStartTime}ms`,
      );
    }

    // End the multipart form data
    await writer.write(encoder.encode(`--${boundary}--\r\n`));

    // Create and write a metadata file
    const metadataRecord: SqlRecord = {
      table: "_metadata",
      data: {
        tables: tableStats,
        processingTime: Date.now() - requestStartTime,
        totalProcessedRows: tableStats.reduce(
          (sum, t) => sum + t.processedRows,
          0,
        ),
        totalRows: tableStats.reduce((sum, t) => sum + t.totalRows, 0),
        filterOptions,
      },
      path: "/_metadata.json",
    };

    await writeRecord(writer, encoder, boundary, metadataRecord);

    const totalProcessingTime = Date.now() - requestStartTime;
    console.log({ totalProcessingTime, tableStats });
  } catch (error) {
    console.error("Error processing SQL:", error);

    // Write error information to the stream
    try {
      const errorRecord: SqlRecord = {
        table: "_error",
        data: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
        path: "/_error.json",
      };

      await writeRecord(writer, encoder, boundary, errorRecord);
      await writer.write(encoder.encode(`--${boundary}--\r\n`));
    } catch (writeError) {
      console.error("Error writing error information:", writeError);
    }
  } finally {
    await writer.close();
  }
}

async function writeRecord(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  boundary: string,
  record: SqlRecord,
): Promise<void> {
  const jsonContent = JSON.stringify(record.data, null, 2);
  const contentBytes = encoder.encode(jsonContent);

  // Start multipart section
  await writer.write(encoder.encode(`--${boundary}\r\n`));
  await writer.write(
    encoder.encode(
      `Content-Disposition: form-data; name="${record.path}"; filename="${record.path}"\r\n`,
    ),
  );

  // Add content type header
  await writer.write(encoder.encode(`Content-Type: application/json\r\n`));

  // Calculate content length
  await writer.write(
    encoder.encode(`Content-Length: ${contentBytes.length}\r\n`),
  );

  // Add source table header
  await writer.write(encoder.encode(`x-source-table: ${record.table}\r\n`));

  // Content encoding
  await writer.write(encoder.encode(`Content-Transfer-Encoding: 8bit\r\n\r\n`));

  // Write the content
  await writer.write(contentBytes);
  await writer.write(encoder.encode("\r\n"));
}

async function writeFilteredRecord(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  boundary: string,
  record: SqlRecord,
  filter: {
    filter: boolean;
    status?: string;
    message?: string;
    noCallback?: boolean;
  },
): Promise<void> {
  // Start multipart section
  await writer.write(encoder.encode(`--${boundary}\r\n`));
  await writer.write(
    encoder.encode(
      `Content-Disposition: form-data; name="${record.path}"; filename="${record.path}"\r\n`,
    ),
  );

  // Add content type header
  await writer.write(encoder.encode(`Content-Type: application/json\r\n`));

  // Add source table header
  await writer.write(encoder.encode(`x-source-table: ${record.table}\r\n`));

  // Add filter header
  const PLUGIN_NAME = "ingestsql";
  await writer.write(
    encoder.encode(
      `x-filter: ${PLUGIN_NAME};${filter.status || "404"};${
        filter.message || ""
      }\r\n`,
    ),
  );

  // Content encoding (empty content)
  await writer.write(
    encoder.encode(`Content-Transfer-Encoding: 8bit\r\n\r\n\r\n`),
  );
}

async function fetchTables(
  sqlUrl: string,
  authHeader: string | null,
): Promise<SqlTable[]> {
  try {
    // Get all table names using a query
    const tablesQuery = buildTablesListQuery();
    const tables = await executeRawQuery(sqlUrl, tablesQuery, authHeader);

    if (
      !tables.result ||
      !tables.result.rows ||
      tables.result.rows.length === 0
    ) {
      throw new Error("No tables found in the database");
    }

    // Process each table to get its columns
    const tableStructures: SqlTable[] = [];

    for (const row of tables.result.rows) {
      const tableName = row[0]; // Assuming first column is table name

      // Get columns for this table
      const columnsQuery = buildTableColumnsQuery(tableName);
      const columnsResult = await executeRawQuery(
        sqlUrl,
        columnsQuery,
        authHeader,
      );

      if (
        columnsResult.result &&
        columnsResult.result.rows &&
        columnsResult.result.rows.length > 0
      ) {
        // Extract column names
        const columns = columnsResult.result.rows.map((row) => row[1]); // Assuming column name is in second position

        // Determine path column (first column, usually 'id')
        const pathColumn = columns[0];

        tableStructures.push({
          name: tableName,
          columns,
          pathColumn,
        });
      }
    }

    return tableStructures;
  } catch (error) {
    console.error("Error fetching tables:", error);
    throw error;
  }
}

function buildTablesListQuery(): string {
  // Query to get all user tables
  return "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
}

function buildTableColumnsQuery(tableName: string): string {
  // Query to get all columns for a specific table
  return `PRAGMA table_info('${tableName}')`;
}

async function countTableRows(
  sqlUrl: string,
  tableName: string,
  authHeader: string | null,
): Promise<number> {
  try {
    const countQuery = `SELECT COUNT(*) FROM '${tableName}'`;
    const countResult = await executeRawQuery(sqlUrl, countQuery, authHeader);

    if (
      countResult.result &&
      countResult.result.rows &&
      countResult.result.rows.length > 0
    ) {
      return parseInt(countResult.result.rows[0][0], 10);
    }

    return 0;
  } catch (error) {
    console.error(`Error counting rows in table ${tableName}:`, error);
    return 0;
  }
}

function buildFilteredQuery(
  table: SqlTable,
  filterOptions: FilterOptions,
  limit: number,
  offset: number,
): string {
  const { basePath, pathPatterns } = filterOptions;
  let query = `SELECT * FROM '${table.name}'`;
  const whereConditions: string[] = [];

  // Apply basePath filtering if specified
  if (basePath && basePath.length > 0) {
    const pathConditions = basePath.map(
      (path) => `${table.pathColumn} LIKE '${path}%'`,
    );

    if (pathConditions.length > 0) {
      whereConditions.push(`(${pathConditions.join(" OR ")})`);
    }
  }

  // Apply simple pathPatterns (non-glob patterns only)
  if (pathPatterns && pathPatterns.length > 0) {
    const simplePatterns = pathPatterns.filter(
      (p) => !p.includes("*") && !p.includes("?"),
    );

    if (simplePatterns.length > 0) {
      const pathConditions = simplePatterns.map(
        (pattern) => `${table.pathColumn} LIKE '${pattern}%'`,
      );

      if (pathConditions.length > 0) {
        whereConditions.push(`(${pathConditions.join(" OR ")})`);
      }
    }
  }

  // Apply WHERE conditions if any
  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(" AND ")}`;
  }

  // Add pagination
  query += ` LIMIT ${limit} OFFSET ${offset}`;

  return query;
}

async function executeQuery(
  sqlUrl: string,
  query: string,
  authHeader: string | null,
): Promise<SqlRecord[]> {
  try {
    const result = await executeRawQuery(sqlUrl, query, authHeader);

    if (!result.result || !result.result.columns || !result.result.rows) {
      return [];
    }

    const { columns, rows } = result.result;
    const records: SqlRecord[] = [];

    // Extract table name from query
    const tableNameMatch =
      query.match(/FROM\s+'([^']+)'/i) || query.match(/FROM\s+([^\s]+)/i);
    const tableName = tableNameMatch ? tableNameMatch[1] : "unknown";

    // Convert rows to records
    for (const row of rows) {
      const data: Record<string, any> = {};

      columns.forEach((column, index) => {
        data[column] = row[index];
      });

      // Determine the path for this record
      const pathValue = data[columns[0]]; // Use first column as path key
      let path = `/${tableName}/${pathValue}`;

      // Ensure path ends with .json
      if (!path.endsWith(".json")) {
        path += ".json";
      }

      records.push({
        table: tableName,
        data,
        path,
      });
    }

    return records;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}

async function executeRawQuery(
  sqlUrl: string,
  query: string,
  authHeader: string | null,
): Promise<SqlResponse> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(`${sqlUrl}/query/raw`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sql: query,
      isRaw: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL server error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

function shouldFilter(
  path: string,
  filterOptions: FilterOptions,
  matchers: CompiledMatchers,
): {
  filter: boolean;
  noCallback?: boolean;
  status?: string;
  message?: string;
} {
  const {
    omitFirstSegment,
    basePath,
    enableFuzzyMatching,
    pathPatterns,
    excludePathPatterns,
  } = filterOptions;

  // Process the path with omitFirstSegment if needed
  const processedPath = omitFirstSegment ? processFilePath(path, true) : path;

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

  // Extract basename for potential basename pattern matching
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

// Process file path for omitFirstSegment option
function processFilePath(fileName: string, omitFirstSegment: boolean): string {
  if (!omitFirstSegment) return fileName;

  const parts = fileName.split("/");
  if (parts.length <= 1) return fileName;

  return "/" + parts.slice(1).join("/");
}

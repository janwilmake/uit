import { getReadableFormDataStream, Part } from "multipart-formdata-stream-js";

interface Env {
  CREDENTIALS: string;
  API: {
    fetch: typeof fetch;
  };
}

interface RequestParams {
  omitFirstSegment?: boolean;
  rawUrlPrefix?: string;
  disableGenignore?: boolean;
  maxFileSize?: number;
  search?: string;
  isRegex?: boolean;
  isCaseSensitive?: boolean;
  isMatchWholeWord?: boolean;
  isFirstHitOnly?: boolean;
  maxTokens?: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Parse the URL and extract parameters
    const url = new URL(request.url);
    const params: RequestParams = {};

    // Process query parameters
    url.searchParams.forEach((value, key) => {
      switch (key) {
        case "omitFirstSegment":
          params.omitFirstSegment = value === "true";
          break;
        case "rawUrlPrefix":
          params.rawUrlPrefix = value;
          break;
        case "disableGenignore":
          params.disableGenignore = value === "true";
          break;
        case "maxFileSize":
          params.maxFileSize = parseInt(value, 10);
          break;
        case "search":
          params.search = value;
          break;
        case "isRegex":
          params.isRegex = value === "true";
          break;
        case "isCaseSensitive":
          params.isCaseSensitive = value === "true";
          break;
        case "isMatchWholeWord":
          params.isMatchWholeWord = value === "true";
          break;
        case "isFirstHitOnly":
          params.isFirstHitOnly = value === "true";
          break;
        case "maxTokens":
          params.maxTokens = parseInt(value, 10);
          break;
      }
    });

    console.log({ params });
    // Validate authentication
    const authHeader = request.headers.get("Authorization");
    if (!validateAuth(authHeader, env.CREDENTIALS)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Archive Access"',
        },
      });
    }

    try {
      // Create search pattern if needed
      const searchPattern = createSearchPattern(params);

      // Prepare headers for the API request
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      const sourceAuthorization = request.headers.get("x-source-authorization");
      if (sourceAuthorization) {
        headers["x-source-authorization"] = sourceAuthorization;
      }

      // Token tracking
      let totalTokens = 0;
      let hitFound = false;

      // Fetch from API

      let body = request.body;
      let streamContentType = request.headers.get("content-type");

      if (!request.body) {
        // No body. Build API URL
        const apiUrl = url.pathname.slice(1) + url.search;
        if (!apiUrl) {
          return new Response("No ZIP URL provided", { status: 400 });
        }
        const apiResponse = await fetch(apiUrl, { headers });

        if (!apiResponse.ok || !apiResponse.body) {
          return new Response(
            `UITHUB Search API Error: ${apiUrl} - ${apiResponse.status}  ${
              apiResponse.statusText
            }\n\n${await apiResponse.text()}`,
            { status: apiResponse.status },
          );
        }

        //ok. overwite that
        streamContentType = apiResponse.headers.get("content-type");
        body = apiResponse.body;
      }

      // Process the multipart form data
      const { readable, boundary } = await getReadableFormDataStream({
        body,
        contentType: streamContentType,
        filterPart: (part: Part) => {
          return filterPart(part, params, totalTokens, hitFound);
        },
        transformPart: async (part: Part) => {
          const result = await transformPart(part, searchPattern);

          // Update token tracking
          if (
            result.part &&
            params.maxTokens &&
            typeof result.part.data === "object" &&
            "byteLength" in result.part.data
          ) {
            const byteLength = result.part.data.byteLength;
            const estimatedTokens = Math.ceil(byteLength / 5);
            totalTokens += estimatedTokens;

            if (totalTokens > params.maxTokens) {
              return { part: null, stop: true }; // Exclude this part to stay under token limit
            }
          }

          // Track if hit found (for isFirstHitOnly)
          if (result.part && params.isFirstHitOnly) {
            hitFound = true;
          }

          return result;
        },
      });

      const resultContentType = request.headers
        .get("accept")
        ?.includes("text/html")
        ? "text/plain"
        : "multipart/form-data";

      return new Response(readable, {
        headers: {
          "Content-Type": `${resultContentType}; boundary=${boundary}; charset=utf8`,
        },
      });
    } catch (error) {
      console.error("Error processing request:", error);
      return new Response(`Error processing ZIP: ${error.message}`, {
        status: 500,
      });
    }
  },
};

/**
 * Validate Basic Authentication
 */
function validateAuth(
  authHeader: string | null,
  validCredentials: string,
): boolean {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.slice(6); // Remove 'Basic '
  const credentials = atob(base64Credentials);

  return credentials === validCredentials;
}

/**
 * Create a search pattern from the search parameters
 */
function createSearchPattern(params: RequestParams): RegExp | null {
  if (!params.search) {
    return null;
  }

  try {
    // Decode the base64 and URL encoded search string
    const decodedSearch = atob(decodeURIComponent(params.search));

    if (params.isRegex) {
      // Create regex with appropriate flags
      const flags = params.isCaseSensitive ? "g" : "gi";
      return new RegExp(decodedSearch, flags);
    } else {
      // Escape regex special characters for literal search
      const escapedSearch = decodedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      // Create pattern based on search options
      let pattern = escapedSearch;

      if (params.isMatchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = params.isCaseSensitive ? "g" : "gi";
      return new RegExp(pattern, flags);
    }
  } catch (error) {
    console.error("Error creating search pattern:", error);
    return null;
  }
}

/**
 * Filter function for multipart parts
 */
function filterPart(
  part: Part,
  params: RequestParams,
  totalTokens: number,
  hitFound: boolean,
): { ok: boolean; stop?: boolean } {
  // Skip if we've already found a hit with isFirstHitOnly
  if (params.isFirstHitOnly && hitFound) {
    return { ok: false, stop: true };
  }

  // Skip if we're over the token limit
  if (params.maxTokens && totalTokens > params.maxTokens) {
    return { ok: false, stop: true };
  }

  // Check file size limit
  if (params.maxFileSize && part["content-length"]) {
    const size = parseInt(part["content-length"], 10);
    if (size > params.maxFileSize) {
      return { ok: false };
    }
  }

  // if files are included but also excluded, they must be excluded
  return { ok: true };
}

/**
 * Transform function for multipart parts
 */
async function transformPart(
  part: Part,
  searchPattern: RegExp | null,
): Promise<{ part: Part | null; stop?: boolean }> {
  // If there's a search pattern, check content (for text files only)
  if (searchPattern && part["content-transfer-encoding"] !== "binary") {
    try {
      // Convert to text for searching
      const data =
        part.data instanceof Uint8Array
          ? part.data
          : await collectAsyncIterator(part.data);
      const text = new TextDecoder().decode(data);

      // Search for pattern
      if (!searchPattern.test(text)) {
        return { part: null }; // No match, exclude this part
      }

      // Put the data back
      part.data = data;
    } catch (error) {
      console.error("Error searching content:", error);
      // On error, default to keeping the file
    }
  }

  return { part };
}

/**
 * Helper to collect an async iterator of Uint8Array into a single Uint8Array
 */
async function collectAsyncIterator(
  iterator: AsyncIterableIterator<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of iterator) {
    chunks.push(chunk);
    totalLength += chunk.byteLength;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

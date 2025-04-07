export interface Env {
  CREDENTIALS: string;
}

export interface RequestBody {
  url: string;
  Authorization?: string;
  pathPrefix?: string;
}

export interface ZipEntry {
  type: "content" | "binary";
  path: string;
  size: number;
  content: string | null;
  hash: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !isValidAuth(authHeader, env.CREDENTIALS)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="ZIP Stream API"',
          "Content-Type": "application/json",
        },
      });
    }

    const url = new URL(request.url);
    const collisionStrategy =
      url.searchParams.get("collisionStrategy") || "ignore";

    let sourceUrls: RequestBody[] = [];

    if (request.method === "GET") {
      const urls = url.searchParams.getAll("url");
      if (!urls || urls.length < 2) {
        return new Response(
          JSON.stringify({ error: "At least two URLs are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      sourceUrls = urls.map((url) => ({
        url,
        Authorization: authHeader,
      }));
    } else if (request.method === "POST") {
      try {
        const body = (await request.json()) as RequestBody[];
        if (!Array.isArray(body) || body.length < 2) {
          return new Response(
            JSON.stringify({ error: "At least two source URLs are required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        sourceUrls = body;
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine content type based on user agent
    const isBrowser = request.headers.get("User-Agent")?.includes("Mozilla");
    const contentType = isBrowser ? "text/plain" : "application/x-ndjson";

    // Create a TransformStream to handle the combined output
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Track paths to handle collisions
    const pathCounts = new Map<string, number>();

    // Process all sources in parallel
    ctx.waitUntil(
      (async () => {
        try {
          const encoder = new TextEncoder();

          await Promise.all(
            sourceUrls.map(async (source) => {
              try {
                const response = await fetch(source.url, {
                  headers: {
                    Authorization: source.Authorization || authHeader || "",
                  },
                });

                if (!response.ok || !response.body) {
                  console.error(
                    `Failed to fetch from ${source.url}: ${response.status}`,
                  );
                  return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });

                  // Process complete lines in the buffer
                  let lineEnd = buffer.indexOf("\n");
                  while (lineEnd >= 0) {
                    const line = buffer.substring(0, lineEnd).trim();
                    buffer = buffer.substring(lineEnd + 1);

                    if (line) {
                      try {
                        const entry = JSON.parse(line) as ZipEntry;

                        // Apply path prefix if provided
                        if (source.pathPrefix) {
                          entry.path = `${source.pathPrefix}/${entry.path}`;
                        }

                        // Handle path collisions
                        const originalPath = entry.path;
                        if (pathCounts.has(entry.path)) {
                          if (collisionStrategy === "ignore") {
                            // Skip this entry
                            continue;
                          } else if (collisionStrategy === "number") {
                            let count = pathCounts.get(entry.path) || 1;
                            count++;

                            // Get file name parts
                            const lastSlashIndex = entry.path.lastIndexOf("/");
                            const dirPart =
                              lastSlashIndex >= 0
                                ? entry.path.substring(0, lastSlashIndex + 1)
                                : "";
                            const filePart =
                              lastSlashIndex >= 0
                                ? entry.path.substring(lastSlashIndex + 1)
                                : entry.path;

                            // Get name and extension parts
                            const lastDotIndex = filePart.lastIndexOf(".");
                            const namePart =
                              lastDotIndex >= 0
                                ? filePart.substring(0, lastDotIndex)
                                : filePart;
                            const extPart =
                              lastDotIndex >= 0
                                ? filePart.substring(lastDotIndex)
                                : "";

                            // Create new path with number suffix
                            entry.path = `${dirPart}${namePart}${count}${extPart}`;
                            pathCounts.set(originalPath, count);
                          }
                          // For 'keep' strategy, we don't modify the path
                        }

                        // Update the path count
                        pathCounts.set(
                          entry.path,
                          (pathCounts.get(entry.path) || 0) + 1,
                        );

                        // Write the modified entry to the output stream
                        await writer.write(
                          encoder.encode(JSON.stringify(entry) + "\n"),
                        );
                      } catch (e) {
                        console.error("Error processing line:", e);
                      }
                    }

                    lineEnd = buffer.indexOf("\n");
                  }
                }

                // Process any remaining content in the buffer
                if (buffer.trim()) {
                  try {
                    const entry = JSON.parse(buffer.trim()) as ZipEntry;

                    // Apply path prefix if provided
                    if (source.pathPrefix) {
                      entry.path = `${source.pathPrefix}/${entry.path}`;
                    }

                    // Handle path collisions (same logic as above)
                    const originalPath = entry.path;
                    if (pathCounts.has(entry.path)) {
                      if (collisionStrategy === "ignore") {
                        return;
                      } else if (collisionStrategy === "number") {
                        let count = pathCounts.get(entry.path) || 1;
                        count++;

                        const lastSlashIndex = entry.path.lastIndexOf("/");
                        const dirPart =
                          lastSlashIndex >= 0
                            ? entry.path.substring(0, lastSlashIndex + 1)
                            : "";
                        const filePart =
                          lastSlashIndex >= 0
                            ? entry.path.substring(lastSlashIndex + 1)
                            : entry.path;

                        const lastDotIndex = filePart.lastIndexOf(".");
                        const namePart =
                          lastDotIndex >= 0
                            ? filePart.substring(0, lastDotIndex)
                            : filePart;
                        const extPart =
                          lastDotIndex >= 0
                            ? filePart.substring(lastDotIndex)
                            : "";

                        entry.path = `${dirPart}${namePart}${count}${extPart}`;
                        pathCounts.set(originalPath, count);
                      }
                    }

                    pathCounts.set(
                      entry.path,
                      (pathCounts.get(entry.path) || 0) + 1,
                    );
                    await writer.write(
                      encoder.encode(JSON.stringify(entry) + "\n"),
                    );
                  } catch (e) {
                    console.error("Error processing final buffer:", e);
                  }
                }
              } catch (error) {
                console.error(`Error fetching from ${source.url}:`, error);
              }
            }),
          );

          await writer.close();
        } catch (error) {
          console.error("Error in stream processing:", error);
          writer.abort(error as Error);
        }
      })(),
    );

    return new Response(readable, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
      },
    });
  },
};

function isValidAuth(authHeader: string, credentials: string): boolean {
  if (!authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.slice(6);
  let decodedCredentials;

  try {
    decodedCredentials = atob(base64Credentials);
  } catch (e) {
    return false;
  }

  return decodedCredentials === credentials;
}

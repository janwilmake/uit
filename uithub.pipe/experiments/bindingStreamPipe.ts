export async function streamPipe(
  requests: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  }[],
  env: Record<string, any> = {},
): Promise<{ response: Response; errors: any[] }> {
  const errors: any[] = [];

  if (!requests || requests.length === 0) {
    return {
      response: new Response("No requests provided", { status: 400 }),
      errors: [new Error("No requests provided")],
    };
  }

  // Handle single request case
  if (requests.length === 1) {
    return await makeSingleRequest(requests[0], env, errors);
  }

  // For multiple requests, create transform streams to connect them
  const streams = requests
    .map((_, i) => (i < requests.length - 1 ? new TransformStream() : null))
    .filter(Boolean) as TransformStream[];

  let previousReadable: ReadableStream | null = null;

  try {
    // Process each request in the chain
    for (let i = 0; i < requests.length; i++) {
      const isLast = i === requests.length - 1;
      const req = requests[i];

      // Get the appropriate fetch function
      const fetchFn = getFetchFunction(req.url, env);

      // Set up request options
      const options: RequestInit = {
        method: req.method || "GET",
        headers: {
          ...req.headers,
        },
      };

      // Add the previous stream's readable as this request's body (except for first request)
      if (previousReadable) {
        options.body = previousReadable;
      }

      // Make the request
      const response = await fetchFn(req.url, options);

      if (!response.ok) {
        throw new Error(
          `Request ${i + 1} failed with status: ${response.status}`,
        );
      }

      // If this is the last request, return its response
      if (isLast) {
        return { response, errors };
      }

      // Otherwise, pipe this response to the next transform stream
      const currentStream = streams[i];
      previousReadable = currentStream.readable;

      response.body?.pipeTo(currentStream.writable).catch((err) => {
        errors.push(err);
        console.error(`Pipe error in request ${i + 1}:`, err);
      });
    }

    // This shouldn't happen if the loop completes
    throw new Error("Unexpected end of pipeline");
  } catch (error) {
    errors.push(error);
    return {
      response: new Response(`Chain request error: ${error.message}`, {
        status: 500,
      }),
      errors,
    };
  }
}

// Helper function to make a single request
async function makeSingleRequest(
  request: { url: string; method?: string; headers?: Record<string, string> },
  env: Record<string, any>,
  errors: any[],
): Promise<{ response: Response; errors: any[] }> {
  try {
    const fetchFn = getFetchFunction(request.url, env);
    const response = await fetchFn(request.url, {
      method: request.method || "GET",
      headers: request.headers || {},
    });
    return { response, errors };
  } catch (error) {
    errors.push(error);
    return {
      response: new Response("Error making request", { status: 500 }),
      errors,
    };
  }
}

// Helper function to get the appropriate fetch function based on hostname
function getFetchFunction(url: string, env: Record<string, any>) {
  try {
    const hostname = new URL(url).hostname;

    // Check if we have a binding for this hostname
    // Convention: Convert hostname to uppercase and replace dots/hyphens with underscores
    const bindingKey =
      hostname.toUpperCase().replace(/[.-]/g, "_") + "_FETCHER";

    if (env[bindingKey] && typeof env[bindingKey].fetch === "function") {
      return (requestUrl: string, options: RequestInit) => {
        // For service bindings, we only need the path portion of the URL
        const urlObj = new URL(requestUrl);
        const path = urlObj.pathname + urlObj.search;
        return env[bindingKey].fetch(path, options);
      };
    }
  } catch (error) {
    console.error("Error parsing URL or finding binding:", error);
  }

  // Fall back to regular fetch if no binding was found
  return fetch;
}

// Example usage

export default {
  async fetch(request, env, ctx) {
    const { response, errors } = await streamPipe(
      [
        {
          url: "https://api.example.com/data",
          headers: { Accept: "application/json" },
        },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.transform.com/process", method: "POST" },
        { url: "https://api.final.com/complete", method: "POST" },
      ],
      env,
    );

    if (errors.length > 0) {
      console.error("Pipeline errors:", errors);
    }

    return response;
  },
};

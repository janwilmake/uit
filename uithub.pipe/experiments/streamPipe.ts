export async function streamPipe(
  requests: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  }[],
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
    try {
      const response = await fetch(requests[0].url, {
        method: requests[0].method || "GET",
        headers: requests[0].headers || {},
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

  // For multiple requests, create transform streams to connect them
  const transformStreams = Array(requests.length - 1)
    .fill(null)
    .map(() => new TransformStream());

  try {
    // First request
    const firstRequest = requests[0];
    const firstResponse = await fetch(firstRequest.url, {
      method: firstRequest.method || "GET",
      headers: firstRequest.headers || {},
    });

    if (!firstResponse.ok) {
      throw new Error(
        `First request failed with status: ${firstResponse.status}`,
      );
    }

    // Start piping the first response to the first transform stream
    firstResponse.body?.pipeTo(transformStreams[0].writable).catch((err) => {
      errors.push(err);
      console.error("Pipe error in request 1:", err);
    });

    // Middle requests (if any)
    for (let i = 1; i < requests.length - 1; i++) {
      const currentRequest = requests[i];
      const response = await fetch(currentRequest.url, {
        method: currentRequest.method,
        headers: {
          ...currentRequest.headers,
          "Content-Type":
            currentRequest.headers?.["Content-Type"] || "application/json",
        },
        body: transformStreams[i - 1].readable,
      });

      if (!response.ok) {
        throw new Error(
          `Request ${i + 1} failed with status: ${response.status}`,
        );
      }

      // Pipe this response to the next transform stream
      response.body?.pipeTo(transformStreams[i].writable).catch((err) => {
        errors.push(err);
        console.error(`Pipe error in request ${i + 1}:`, err);
      });
    }

    // Final request
    const lastIndex = requests.length - 1;
    const lastRequest = requests[lastIndex];
    const finalResponse = await fetch(lastRequest.url, {
      method: lastRequest.method,
      headers: {
        ...lastRequest.headers,
        "Content-Type":
          lastRequest.headers?.["Content-Type"] || "application/json",
      },
      body: transformStreams[lastIndex - 1].readable,
    });

    if (!finalResponse.ok) {
      throw new Error(
        `Final request failed with status: ${finalResponse.status}`,
      );
    }

    return { response: finalResponse, errors };
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

export default {
  async fetch(request, env, ctx) {
    // Example usage of streamPipe function
    const { response, errors } = await streamPipe([
      {
        url: "https://api.example.com/data",
        method: "GET",
        headers: { Accept: "application/json" },
      },
      {
        url: "https://api.example.com/transform",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        url: "https://api.example.com/final-process",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    ]);

    // If there were errors in the pipeline, you might want to log them
    if (errors.length > 0) {
      console.error("Errors occurred during request pipeline:", errors);
    }

    // Return the final response to the client
    return response;
  },
};

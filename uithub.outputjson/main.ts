/// <reference types="@cloudflare/workers-types" />
//@ts-check

import { iterateMultipart } from "multipart-formdata-stream-js";

const DEFAULT_MAX_TOKENS = 50000;
const TOKEN_ESTIMATION_FACTOR = 5;

/**
 * Token counter that approximates the number of tokens in a string
 * @param {string} text - The text to count tokens for
 * @returns {number} - Estimated token count
 */
function countTokens(text) {
  return Math.ceil(text.length / TOKEN_ESTIMATION_FACTOR);
}

/**
 * Gets file extension from a filename
 * @param {string} filename - The filename to extract extension from
 * @returns {string} - The file extension
 */
function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * Determines MIME type based on file extension
 * @param {string} filename - The filename to check
 * @returns {string} - The MIME type
 */
function getMimeType(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  const mimeTypes = {
    txt: "text/plain",
    md: "text/markdown",
    mdx: "text/markdown",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    // Add more as needed
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Creates a tree node structure
 * @returns {Object} - Empty tree node
 */
function createTreeNode(isFile = false, name = "") {
  return {
    name,
    isFile,
    children: {},
  };
}

/**
 * Process multipart form data into JSON format
 * @param {ReadableStream<Uint8Array>} body - The form data body
 * @param {string} boundary - The form data boundary
 * @param {WritableStreamDefaultWriter<Uint8Array>} writer - Stream writer
 * @param {number} maxTokens - Maximum tokens to process
 * @param {number} maxFileSize - Maximum file size in bytes
 */
async function processPartsToJson(
  body,
  boundary,
  writer,
  maxTokens,
  maxFileSize,
) {
  try {
    const encoder = new TextEncoder();
    let totalTokens = 0;
    let totalLines = 0;
    let fileCount = 0;
    let isCapped = false;

    // Initialize the JSON structure
    const result = {
      files: {},
      tree: createTreeNode(false, "root"),
      size: {
        files: 0,
        tokens: 0,
        lines: 0,
      },
    };

    // Function to write JSON to the stream
    const writeJson = async (json) => {
      await writer.write(encoder.encode(JSON.stringify(json)));
    };

    // Add file to tree structure
    const addToTree = (path, isFile) => {
      const pathParts = path.split("/").filter((p) => p.trim() !== "");
      let currentNode = result.tree;

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const isLastPart = i === pathParts.length - 1;

        if (!currentNode.children[part]) {
          currentNode.children[part] = createTreeNode(
            isLastPart && isFile,
            part,
          );
        }

        currentNode = currentNode.children[part];
      }

      return currentNode;
    };

    // Iterate through parts
    for await (const part of iterateMultipart(body, boundary)) {
      if (!part.name) continue;

      const isBinary = part["content-transfer-encoding"] === "binary";
      const filename = part.filename || part.name;
      const fileContent =
        part.data instanceof Uint8Array
          ? new TextDecoder().decode(part.data)
          : "";

      const fileSize = fileContent.length;
      const isFileTooLarge = fileSize > maxFileSize;

      // Skip if the file is too large or binary
      if (!isFileTooLarge && !isBinary) {
        const fileTokens = countTokens(fileContent);
        const fileLines = fileContent.split("\n").length;

        // Check if adding this file would exceed token limit
        if (totalTokens + fileTokens <= maxTokens) {
          // Add file to the files object
          result.files[filename] = {
            content: fileContent,
            url: part["x-url"] || "",
            type: getMimeType(filename),
          };

          // Add file to tree structure
          addToTree(filename, true);

          // Update counters
          totalTokens += fileTokens;
          totalLines += fileLines;
          fileCount++;
        } else {
          isCapped = true;
          break;
        }
      } else if (isBinary && part["x-url"]) {
        // For binary files with URL, add reference without content
        result.files[filename] = {
          content: "",
          url: part["x-url"],
          type: getMimeType(filename),
        };

        // Add file to tree structure
        addToTree(filename, true);
        fileCount++;
      } else if (isFileTooLarge) {
        // For too large files, add reference without content
        result.files[filename] = {
          content: "File too large",
          url: "",
          type: getMimeType(filename),
        };

        // Add file to tree structure
        addToTree(filename, true);
        fileCount++;
      }
    }

    // Update size information
    result.size = {
      files: fileCount,
      tokens: totalTokens,
      lines: totalLines,
    };

    // Add capped message if needed
    if (isCapped) {
      //@ts-ignore
      result.capped = true;
      //@ts-ignore
      result.cappedMessage = `The content has been capped at ${maxTokens} tokens, and files over ${maxFileSize} bytes have been omitted.`;
    }

    // Write the JSON to the stream
    await writeJson(result);

    // Close the writer
    await writer.close();
  } catch (error) {
    await writer.abort(error);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const formDataUrl = url.pathname.substring(1) + url.search; // Remove leading slash

    if (!formDataUrl) {
      return new Response(
        JSON.stringify({ error: "No form data URL provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse query parameters
    const maxTokens =
      parseInt(url.searchParams.get("maxTokens") || "", 10) ||
      DEFAULT_MAX_TOKENS;
    const maxFileSize = parseInt(url.searchParams.get("maxFileSize") || "", 10);

    try {
      const headers = { Authorization: `Basic ${btoa(env.CREDENTIALS)}` };

      const sourceAuthorization = request.headers.get("x-source-authorization");
      if (sourceAuthorization) {
        headers["x-source-authorization"] = sourceAuthorization;
      }

      // Fetch the form data
      const response = await fetch(formDataUrl, { headers });
      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: `outputjson - Failed to fetch form data: ${response.status} ${response.statusText}`,
            details: await response.text(),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("multipart/form-data")) {
        return new Response(
          JSON.stringify({
            error: "The provided URL does not contain multipart form data",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Extract boundary from content-type
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
      if (!boundaryMatch) {
        return new Response(
          JSON.stringify({
            error: "Could not find boundary in content-type header",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const boundary = boundaryMatch[1] || boundaryMatch[2];
      const body = response.body;

      if (!body) {
        return new Response(JSON.stringify({ error: "Empty response body" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create a transform stream for processing parts
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Process the parts in a separate task
      processPartsToJson(body, boundary, writer, maxTokens, maxFileSize);

      // Return the readable stream as the response
      return new Response(readable, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: `Error processing form data: ${error.message}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};

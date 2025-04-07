/// <reference types="@cloudflare/workers-types" />
//@ts-check

import { iterateMultipart } from "multipart-formdata-stream-js";

const DEFAULT_MAX_TOKENS = 50000;
const DEFAULT_MAX_FILE_SIZE = 25 * 1024; // ±5k tokens
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
 * Determines if a file is a text file based on its extension
 * @param {string} filename - The filename to check
 * @returns {boolean} - Whether the file is a code file
 */
function isTextFile(filename) {
  const codeExtensions = ["md", "mdx", "txt"];
  const ext = getFileExtension(filename).toLowerCase();
  return codeExtensions.includes(ext);
}

/**
 * Processes a ZIP archive and returns its contents as markdown
 * @param {Request} request - The incoming request
 * @param {*} env -
 * @returns {Response} - The response with markdown content
 */
async function processZipArchive(request, env) {
  const url = new URL(request.url);
  const formDataUrl = url.pathname.substring(1) + url.search; // Remove leading slash

  if (!formDataUrl) {
    return new Response("No form data URL provided", { status: 400 });
  }

  // Parse query parameters
  const maxTokens =
    parseInt(url.searchParams.get("maxTokens") || "", 10) || DEFAULT_MAX_TOKENS;
  const maxFileSize =
    parseInt(url.searchParams.get("maxFileSize") || "", 10) ||
    DEFAULT_MAX_FILE_SIZE;

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
        `Failed to fetch form data: ${response.status} ${response.statusText}`,
        { status: 500 },
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return new Response(
        "The provided URL does not contain multipart form data",
        { status: 400 },
      );
    }

    // Extract boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return new Response("Could not find boundary in content-type header", {
        status: 400,
      });
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const body = response.body;

    if (!body) {
      return new Response("Empty response body", { status: 500 });
    }

    // Create a transform stream for processing parts
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Process the parts in a separate task
    processPartsToMarkdown(body, boundary, writer, maxTokens, maxFileSize);

    // Return the readable stream as the response
    return new Response(readable, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(`Error processing form data: ${error.message}`, {
      status: 500,
    });
  }
}

/**
 * Process multipart form data into markdown format
 * @param {ReadableStream<Uint8Array>} body - The form data body
 * @param {string} boundary - The form data boundary
 * @param {WritableStreamDefaultWriter<Uint8Array>} writer - Stream writer
 * @param {number} maxTokens - Maximum tokens to process
 * @param {number} maxFileSize - Maximum file size in bytes
 */
async function processPartsToMarkdown(
  body,
  boundary,
  writer,
  maxTokens,
  maxFileSize,
) {
  try {
    const encoder = new TextEncoder();
    let totalTokens = 0;
    let treeStructure = "```\n";
    let fileContents = "";
    let depth = 0;
    let isCapped = false;
    let lastPath: string[] = [];

    // Function to write text to the stream
    const writeText = async (text) => {
      await writer.write(encoder.encode(text));
    };

    // Iterate through parts
    for await (const part of iterateMultipart(body, boundary)) {
      if (!part.name) continue;

      const isBinary = part["content-transfer-encoding"] === "binary";
      const filename = part.filename || part.name;
      const fileContent =
        part.data instanceof Uint8Array
          ? new TextDecoder().decode(part.data)
          : ""; // Handle case where data might be AsyncIterableIterator

      const fileSize = fileContent.length;
      const isFileTooLarge = fileSize > maxFileSize;
      // Process file path for tree view
      const pathParts = filename.split("/").filter((p) => p.trim() !== "");
      const currentFilename = pathParts.pop();

      // Update tree structure
      let commonPrefixLength = 0;
      while (
        commonPrefixLength < Math.min(lastPath.length, pathParts.length) &&
        lastPath[commonPrefixLength] === pathParts[commonPrefixLength]
      ) {
        commonPrefixLength++;
      }

      // Close previous directories
      for (let i = lastPath.length; i > commonPrefixLength; i--) {
        depth--;
      }

      // Open new directories
      for (let i = commonPrefixLength; i < pathParts.length; i++) {
        treeStructure += `${" ".repeat(depth * 2)}└── ${pathParts[i]}/\n`;
        depth++;
      }

      // Add file to tree
      const tooLargeText = isFileTooLarge ? ` (omited due to size)` : "";
      treeStructure += `${" ".repeat(
        depth * 2,
      )}└── ${currentFilename}${tooLargeText}\n`;

      // Update last path
      lastPath = [...pathParts];

      // Prepare file content section
      let fileMarkdown = `\n## ${filename}\n\n`;

      if (isBinary) {
        if (part["x-url"]) {
          fileMarkdown += `Binary file available at ${part["x-url"]}\n`;
        } else {
          fileMarkdown += "Binary file omitted\n";
        }
      } else if (isFileTooLarge) {
        fileMarkdown += "File too large\n";
      } else if (isTextFile(filename)) {
        fileMarkdown += fileContent + "\n";
      } else {
        const extension = getFileExtension(filename);
        fileMarkdown += `\`\`\`${extension} path="${filename}" \n${fileContent.replaceAll(
          "```",
          "\\`\\`\\`",
        )}\n\`\`\`\n`;
      }

      // Add to content if not exceeding token limit
      const fileTokens = countTokens(fileMarkdown);
      if (totalTokens + fileTokens <= maxTokens) {
        fileContents += fileMarkdown;
        totalTokens += fileTokens;
      } else {
        isCapped = true;
        // Stop processing if token limit reached
        break;
      }
    }

    // Close the tree structure
    treeStructure += "```\n\n";

    // Write the complete markdown to the stream
    await writeText(treeStructure);
    await writeText(fileContents);

    if (isCapped) {
      await writeText(
        `\nThe content has been capped at ${maxTokens} tokens. Please apply other filters to refine your result.`,
      );
    }

    // Close the writer
    await writer.close();
  } catch (error) {
    await writer.abort(error);
  }
}

export default {
  async fetch(request, env, ctx) {
    return processZipArchive(request, env);
  },
};

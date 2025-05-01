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
    let count = 0;

    // Function to write text to the stream
    const writeText = async (text) => {
      await writer.write(encoder.encode(text));
    };

    const INDENTATION_PER_LEVEL = 3;
    // Iterate through parts
    for await (const part of iterateMultipart(body, boundary)) {
      if (!part.name) continue;

      if (part["x-error"]) {
        // Error should be somehow visible
        continue;
      }

      const isFiltered = !!part["x-filter"];

      count++;

      const isBinary = part["content-transfer-encoding"] === "binary";
      const filename = part.filename || part.name;
      const fileContent =
        part.data instanceof Uint8Array
          ? new TextDecoder().decode(part.data)
          : ""; // Handle case where data might be AsyncIterableIterator

      const fileSize = fileContent.length;

      const tokenCount = Math.round(fileSize / 5 / 100) * 100;

      const tokenCountText =
        tokenCount === 0
          ? ""
          : fileSize < 10000
          ? ` (${tokenCount} tokens)`
          : ` (${tokenCount / 1000}k tokens)`;

      const isFileTooLarge = fileSize > maxFileSize;
      // Process file path for tree view
      const pathParts = filename.split("/").filter((p) => p.trim() !== "");
      const currentFilename = pathParts.pop();

      let isLastEntry = false;

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
        const treeString = isLastEntry ? "└── " : "├── ";
        treeStructure += `${" ".repeat(
          depth * INDENTATION_PER_LEVEL,
        )}${treeString}${pathParts[i]}/\n`;
        depth++;
      }

      // Add file to tree
      const treeString = isLastEntry ? "└── " : "├── ";

      const filteredText = isFiltered
        ? ` (omitted)`
        : isFileTooLarge
        ? ` (omited due to size)`
        : "";

      const tokenText = (treeStructure += `${" ".repeat(
        depth * INDENTATION_PER_LEVEL,
      )}${treeString}${currentFilename}${tokenCountText}${filteredText}\n`);

      // Update last path
      lastPath = [...pathParts];

      // Prepare file content section

      if (part["x-filter"]) {
        // if filtered, don't add the markdown for the file itself
        const [plugin, status, message] = part["x-filter"]
          .split(";")
          .map((x) => x.trim());

        continue;
      }
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
        // break;
      }
    }

    // Close the tree structure
    treeStructure += "```\n\n";

    // Write the complete markdown to the stream

    if (count === 0) {
      await writeText(`No results. Please check your filters`);
    } else {
      await writeText(treeStructure);
      await writeText(fileContents);

      if (isCapped) {
        const maxFileSizeText = maxFileSize
          ? `, and files over ${maxFileSize} bytes have been omitted`
          : "";
        await writeText(
          `\n\nThe content has been capped at ${maxTokens} tokens${maxFileSizeText}. The user could consider applying other filters to refine the result. `,
        );
      } else {
        await writeText(`\n\n`);
      }

      await writeText(
        `The better and more specific the context, the better the LLM can follow instructions. If the context seems verbose, the user can refine the filter using uithub. Thank you for using https://uithub.com - Perfect LLM context for any GitHub repo.`,
      );
    }
    // Close the writer
    await writer.close();
  } catch (error) {
    await writer.abort(error);
  }
}

const getResponse = async (request: Request, env: any) => {
  const url = new URL(request.url);
  const formDataUrl = url.pathname.substring(1) + url.search; // Remove leading slash

  if (!formDataUrl) {
    return new Response("No form data URL provided", { status: 400 });
  }

  // Parse query parameters

  const headers = { Authorization: `Basic ${btoa(env.CREDENTIALS)}` };

  const sourceAuthorization = request.headers.get("x-source-authorization");
  if (sourceAuthorization) {
    headers["x-source-authorization"] = sourceAuthorization;
  }
  // Fetch the form data
  const response = await fetch(formDataUrl, { headers });
  if (!response.ok) {
    return new Response(
      `outputmd - Failed to fetch form data: ${response.status} ${
        response.statusText
      }\n${await response.text()}`,
      { status: 500 },
    );
  }

  return response;
};

export default {
  async fetch(request: Request, env: any, ctx) {
    const url = new URL(request.url);
    const maxTokens =
      parseInt(url.searchParams.get("maxTokens") || "", 10) ||
      DEFAULT_MAX_TOKENS;
    const maxFileSize = parseInt(url.searchParams.get("maxFileSize") || "", 10);

    const req = request.body ? request : await getResponse(request, env);

    const body = req.body;

    if (!body) {
      return new Response("Empty response body", { status: 500 });
    }

    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return new Response(`No formdata content-type`, { status: 400 });
    }

    // Extract boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return new Response("Could not find boundary in content-type header", {
        status: 400,
      });
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];

    try {
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
  },
};

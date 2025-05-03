import { iterateMultipart } from "multipart-formdata-stream-js";

export type TreeObject = {
  [path: string]: { tokens: number; filtered: boolean };
};

type TreeItem = {
  path: string;
  tokens: number;
  filtered: boolean;
};

/**
 * Buildtree takes a readable stream that contains multipart/form-data, and builds a TreeObject
 *
 * - path comes from content-disposition filename
 * - tokens is calculated by looking at files Content-Length header:
 *   - content-length divided by 5 (rounded) if Content-Transfer-Encoding is 8bit
 *   - 0 otherwise
 * - filter is true if x-filter header is present
 * - the formdata only contains files, no folders. all paths start with '/'.
 *
 * Perform these steps to build the tree object:
 * - first iterate over the formdata and for each
 *   - add the path to the Set with each filepath, value is {tokens,filtered}
 *   - calculate all parent folders for the path
 *   - add each folder to the Set (or sum if existed)
 * - sort the set alphabetically and turn it into a TreeObject
 */
export const buildTree = async (
  body: ReadableStream<Uint8Array>,
  contentType: string,
): Promise<TreeObject> => {
  // Extract boundary from contentType
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    throw new Error("Invalid content type: boundary not found");
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  // Use Map instead of Set to store path and its metadata
  const treeItems = new Map<string, TreeItem>();

  // Process each file in the form data
  for await (const part of iterateMultipart(body, boundary)) {
    // Skip parts without filename (not files)
    if (!part.filename) continue;

    // Ensure path starts with '/'
    const path = part.filename.startsWith("/")
      ? part.filename
      : `/${part.filename}`;

    // Calculate tokens based on Content-Length and Content-Transfer-Encoding
    let tokens = 0;
    if (
      part["content-transfer-encoding"] === "8bit" &&
      part["content-length"]
    ) {
      tokens = Math.round(parseInt(part["content-length"], 10) / 5);
    }

    // Check if filtered
    const filtered = part["x-filter"] !== undefined;

    // Add the file to the map
    treeItems.set(path, { path, tokens, filtered });

    // Create parent folders
    let currentPath = path;
    while (currentPath !== "/") {
      // Get parent folder path
      const currentPathWithoutLastSlash = currentPath.endsWith("/")
        ? currentPath.slice(0, currentPath.length - 2)
        : currentPath;
      currentPath = currentPath.substring(
        0,
        currentPathWithoutLastSlash.lastIndexOf("/") + 1,
      );
      if (currentPath === "") currentPath = "/";

      // Add or update folder in the map
      const existingFolder = treeItems.get(currentPath);
      if (existingFolder) {
        // Sum tokens if folder already exists
        existingFolder.tokens += tokens;
        // If any child is filtered, mark folder as filtered
        existingFolder.filtered = existingFolder.filtered && filtered;
      } else {
        // Create new folder entry
        treeItems.set(currentPath, { path: currentPath, tokens, filtered });
      }
    }
  }

  // Sort the paths alphabetically
  const sortedItems = Array.from(treeItems.entries()).sort(([pathA], [pathB]) =>
    pathA.localeCompare(pathB),
  );

  // Convert to TreeObject
  const treeObject: TreeObject = {};
  for (const [path, { tokens, filtered }] of sortedItems) {
    treeObject[path] = { tokens, filtered };
  }

  return treeObject;
};

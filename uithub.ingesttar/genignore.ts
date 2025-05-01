//@ts-ignore
import defaultGenignore from "./public/default-genignore.txt";
import { FilterOptions, ResponseOptions } from "./types";
import { findGenIgnoreInTar } from "./tarReader";

/**
 * Parse the .genignore file content into an array of exclude patterns
 *
 * @param content The content of the .genignore file
 * @returns Array of exclude patterns
 */
export function parseGenIgnore(content: string): string[] {
  // Split by lines, trim whitespace, and filter out comments and empty lines
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

/**
 * Integrates the first pass for .genignore into the current process flow.
 * Returns modified filter options with updated excludePathPatterns.
 */
export async function processWithGenIgnore(
  tarUrl: string,
  initialFilterOptions: FilterOptions,
  responseOptions: ResponseOptions,
): Promise<{
  updatedFilterOptions: FilterOptions;
  tarResponse: Response;
}> {
  // Prepare headers for fetching the TAR
  const headers = new Headers({ "User-Agent": "Cloudflare-Worker" });
  if (responseOptions.authHeader) {
    headers.set("Authorization", responseOptions.authHeader);
  }

  // Make a clone of the initial filter options
  const updatedFilterOptions = { ...initialFilterOptions };

  // If we don't need to check for .genignore, just fetch the TAR once
  if (!initialFilterOptions.genignore) {
    console.log("Genignore not desired");
    const tarResponse = await fetch(tarUrl, { headers });
    return { updatedFilterOptions, tarResponse };
  }

  // First pass: Fetch the TAR to look for .genignore
  const firstPassResponse = await fetch(tarUrl, { headers });

  if (!firstPassResponse.ok || !firstPassResponse.body) {
    // If the first pass fails, just return the response as is
    return { updatedFilterOptions, tarResponse: firstPassResponse };
  }

  // Clone the body stream to keep the original for later use
  const [firstPassStream, tarResponseBody] = firstPassResponse.body.tee();

  // Create a response with the cloned body for returning later
  const tarResponse = new Response(tarResponseBody, {
    status: firstPassResponse.status,
    statusText: firstPassResponse.statusText,
    headers: firstPassResponse.headers,
  });

  try {
    // Decompress gzip stream
    const decompressedStream = firstPassStream.pipeThrough(
      new DecompressionStream("gzip"),
    );

    // Look for .genignore in the TAR
    const genIgnorePatterns =
      (await findGenIgnoreInTar(decompressedStream)) ||
      parseGenIgnore(defaultGenignore);

    console.log({ genIgnorePatterns });

    // unique and concatenate with provided ones
    updatedFilterOptions.excludePathPatterns = Array.from(
      new Set(
        genIgnorePatterns.concat(updatedFilterOptions.excludePathPatterns),
      ),
    );
  } catch (error) {
    console.error("Error during .genignore processing:", error);
    // Fall back to default genignore patterns on error
    updatedFilterOptions.excludePathPatterns = parseGenIgnore(defaultGenignore);
  }

  return { updatedFilterOptions, tarResponse };
}

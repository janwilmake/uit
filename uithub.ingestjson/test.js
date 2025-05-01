/**
 * Test script for the ingestjson module
 *
 * This test fetches a JSON document from a URL, processes it through
 * the ingestjson module, and reports on the results.
 */

async function testJsonProcessor() {
  console.time("Total execution time");

  // JSON URL for testing
  const jsonUrl = "https://cache.forgithub.com/oven-sh/bun/issues";

  const CREDENTIALS = process.env.CREDENTIALS;

  // Local or deployed server URL
  const serverUrl = "http://localhost:3000"; // Change to "https://ingestjson.uithub.com" for production

  // Construct the full URL with parameters
  const url = new URL(serverUrl);
  url.pathname = encodeURIComponent(jsonUrl);

  // Optional: Add filter parameters
  // url.searchParams.append("pathPatterns", "*.js");
  // url.searchParams.append("pathPatterns", "*.json");
  // url.searchParams.append("excludePathPatterns", "node_modules/**");
  // url.searchParams.append("basePath", "some/path");
  // url.searchParams.append("maxFileSize", "102400"); // 100 KB

  console.log(`Fetching JSON from ${jsonUrl} and processing...`);
  console.time("Fetch and process time");

  try {
    // Make the request
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${btoa(CREDENTIALS)}`,
        // Optional: Add source authorization if the JSON requires auth
        // "x-source-authorization": "Bearer your-token-here"
      },
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    // Process the response
    const contentType = response.headers.get("content-type");
    console.log(`Content-Type: ${contentType}`);

    // Parse boundary from content type
    const boundary = contentType.includes("boundary=")
      ? contentType.split("boundary=")[1].trim()
      : "----WebKitFormBoundary";

    console.log(`Using boundary: ${boundary}`);

    // Get the full response as text
    const responseText = await response.text();

    // Count parts to determine number of files
    const boundaryCount =
      (responseText.match(new RegExp(`--${boundary}`, "g")) || []).length - 1; // Subtract 1 for the final boundary

    console.timeEnd("Fetch and process time");
    console.log(`Processed ${boundaryCount} files from the JSON document`);

    // Print total size of the processed data
    console.log(
      `Total response size: ${(responseText.length / (1024 * 1024)).toFixed(
        2,
      )} MB`,
    );

    // Optional: Log file paths (first 10)
    const fileNameRegex = /name="([^"]+)"/g;
    const filePaths = [...responseText.matchAll(fileNameRegex)].map(
      (match) => match[1],
    );

    console.log("\nSample of extracted files:");
    filePaths.slice(0, 10).forEach((path) => console.log(` - ${path}`));

    if (filePaths.length > 10) {
      console.log(`... and ${filePaths.length - 10} more files`);
    }

    // Optional: Analyze file types
    const fileExtensions = filePaths.map((path) => {
      const parts = path.split(".");
      return parts.length > 1 ? parts[parts.length - 1] : "unknown";
    });

    const fileTypeCount = fileExtensions.reduce((acc, ext) => {
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {});

    console.log("\nFile type distribution:");
    Object.entries(fileTypeCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => console.log(` - ${ext}: ${count} files`));
  } catch (error) {
    console.error("Error during test:", error);
  }

  console.timeEnd("Total execution time");
}

// Run the test
testJsonProcessor();

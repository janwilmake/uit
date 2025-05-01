async function testZipProcessor() {
  console.time("Total execution time");

  // GitHub ZIP URL for the alchemy repo
  //  const githubZipUrl =    "https://github.com/sam-goodwin/alchemy/archive/refs/heads/main.zip";
  const githubZipUrl =
    "https://github.com/janwilmake/uit/archive/refs/heads/main.zip";

  const CREDENTIALS = process.env.CREDENTIALS;
  // Local server URL
  const serverUrl = "http://localhost:3000"; //"https://ingestzip.uithub.com"; //

  // Path we want to extract from the ZIP
  //const targetPath = "alchemy-web/docs";
  const targetPath = undefined;
  // Construct the full URL with parameters
  const url = new URL(serverUrl);
  url.pathname = encodeURIComponent(githubZipUrl);
  url.searchParams.append("omitFirstSegment", "true");
  if (targetPath) {
    url.searchParams.append("basePath", targetPath);
  }

  console.log(`Fetching ZIP archive and processing '${targetPath}' folder...`);
  console.time("Fetch and process time");

  try {
    // Make the request
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${btoa(CREDENTIALS)}` },
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    // Process the response
    const contentType = response.headers.get("content-type");
    console.log(`Content-Type: ${contentType}`);

    // Get the full response as text to ensure we consume the entire stream
    const responseText = await response.text();

    // Count boundaries to determine number of files
    const boundary = contentType.includes("boundary=")
      ? contentType.split("boundary=")[1].trim()
      : "----WebKitFormBoundary";

    const boundaryCount =
      (responseText.match(new RegExp(`--${boundary}`, "g")) || []).length - 1; // Subtract 1 for the final boundary

    console.timeEnd("Fetch and process time");
    console.log(`Processed ${boundaryCount} files from the ZIP archive`);

    // Print total size of the processed data
    console.log(
      `Total response size: ${(responseText.length / (1024 * 1024)).toFixed(
        2,
      )} MB`,
    );
  } catch (error) {
    console.error("Error during test:", error);
  }

  console.timeEnd("Total execution time");
}

// Run the test
testZipProcessor();

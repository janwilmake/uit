async function testTarProcessor() {
  console.time("Total execution time");

  // NPM package tarball URL
  // This is a typical npm tarball URL format
  const npmTarballUrl =
    "https://registry.npmjs.org/express/-/express-4.18.2.tgz";

  // You can also test with a GitHub tarball URL like this:
  // const githubTarballUrl = "https://github.com/janwilmake/uit/archive/refs/heads/main.tar.gz";

  const CREDENTIALS = process.env.CREDENTIALS;

  // Local server URL (replace with your deployed server if needed)
  const serverUrl = "http://localhost:3000"; // "https://ingesttar.uithub.com";

  // Path we want to extract from the TAR (optional)
  const targetPath = undefined; // e.g., "package/lib" if you want a specific folder

  // Construct the full URL with parameters
  const url = new URL(serverUrl);
  url.pathname = encodeURIComponent(npmTarballUrl);
  url.searchParams.append("omitFirstSegment", "true"); // Skip the top-level directory
  if (targetPath) {
    url.searchParams.append("basePath", targetPath);
  }

  console.log(
    `Fetching TAR.GZ archive and processing ${
      targetPath ? `'${targetPath}' folder` : "all files"
    }...`,
  );
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
    console.log(`Processed ${boundaryCount} files from the TAR.GZ archive`);

    // Print total size of the processed data
    console.log(
      `Total response size: ${(responseText.length / (1024 * 1024)).toFixed(
        2,
      )} MB`,
    );

    // Optionally print the first few file paths to verify content
    const fileHeaders = responseText.split(`--${boundary}`);
    const filePaths = fileHeaders.map((header) => {
      const match = header.match(/name="([^"]+)"/);
      return match ? match[1] : "unknown";
    });

    console.log("Sample of extracted files:");
    filePaths.forEach((path) => console.log(` - ${path}`));
  } catch (error) {
    console.error("Error during test:", error);
  }

  console.timeEnd("Total execution time");
}

// Run the test
testTarProcessor();

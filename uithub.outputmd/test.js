const fs = require("fs").promises;
const path = require("path");

/**
 * Test the ZIP archive processor with various GitHub repositories
 */
async function testZipProcessor() {
  // Create test directory if it doesn't exist
  const testDir = path.join(__dirname, "test");
  try {
    await fs.mkdir(testDir, { recursive: true });
    console.log(`Created test directory: ${testDir}`);
  } catch (error) {
    console.log(`Test directory already exists: ${testDir}`);
  }

  // List of repositories to test (owner/repo format)
  const repositories = [
    "facebook/react",
    "vercel/next.js",
    "microsoft/TypeScript",
    "sveltejs/svelte",
    "tailwindlabs/tailwindcss",
  ];

  // Process each repository
  for (const repo of repositories) {
    const repoName = repo.split("/")[1];
    console.log(`Processing ${repo}...`);

    try {
      // First, get the formdata from uithub
      const uithubUrl = `https://ingestzip.uithub.com/https://github.com/${repo}/archive/refs/heads/main.zip`;
      console.log(`Fetching from: ${uithubUrl}`);

      // Now, send that to our local worker
      const workerUrl = `http://localhost:3000/${uithubUrl}?maxTokens=100000&maxFileSize=100000`;
      console.log(`Sending to worker: ${workerUrl}`);

      const response = await fetch(workerUrl);

      if (!response.ok) {
        throw new Error(
          `Worker returned status: ${response.status} ${response.statusText}`,
        );
      }

      // Get the markdown content
      const markdownContent = await response.text();

      // Write the markdown to a file
      const outputFile = path.join(testDir, `${repoName}.md`);
      await fs.writeFile(outputFile, markdownContent);

      console.log(`Successfully wrote ${outputFile}`);
    } catch (error) {
      console.error(`Error processing ${repo}:`, error.message);
    }
  }

  // Test with different token and file size limits
  try {
    const repo = "facebook/react";
    const repoName = "react";
    const uithubUrl = `https://ingestzip.uithub.com/https://github.com/${repo}/archive/refs/heads/main.zip`;

    // Test with smaller token limit
    const smallTokensUrl = `http://localhost:3000/${encodeURIComponent(
      uithubUrl,
    )}?maxTokens=10000&maxFileSize=100000`;
    console.log(`Testing with smaller token limit: ${smallTokensUrl}`);

    const smallTokensResponse = await fetch(smallTokensUrl);
    const smallTokensContent = await smallTokensResponse.text();

    await fs.writeFile(
      path.join(testDir, `${repoName}_small_tokens.md`),
      smallTokensContent,
    );
    console.log(`Successfully wrote ${repoName}_small_tokens.md`);

    // Test with smaller file size limit
    const smallFileSizeUrl = `http://localhost:3000/${encodeURIComponent(
      uithubUrl,
    )}?maxTokens=100000&maxFileSize=5000`;
    console.log(`Testing with smaller file size limit: ${smallFileSizeUrl}`);

    const smallFileSizeResponse = await fetch(smallFileSizeUrl);
    const smallFileSizeContent = await smallFileSizeResponse.text();

    await fs.writeFile(
      path.join(testDir, `${repoName}_small_filesize.md`),
      smallFileSizeContent,
    );
    console.log(`Successfully wrote ${repoName}_small_filesize.md`);
  } catch (error) {
    console.error("Error during limit testing:", error.message);
  }
}

/**
 * Test a custom URL
 * @param {string} zipUrl - The GitHub zip URL to test
 * @param {number} maxTokens - Maximum tokens (default: 100000)
 * @param {number} maxFileSize - Maximum file size in bytes (default: 100000)
 */
async function testCustomZip(zipUrl, maxTokens = 100000, maxFileSize = 100000) {
  if (!zipUrl) {
    console.error('Please provide a GitHub ZIP URL in the format "owner/repo"');
    return;
  }

  // Create test directory if it doesn't exist
  const testDir = path.join(__dirname, "test");
  try {
    await fs.mkdir(testDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }

  try {
    // Format the URL if it's in owner/repo format
    if (zipUrl.includes("/") && !zipUrl.startsWith("http")) {
      zipUrl = `https://github.com/${zipUrl}/archive/refs/heads/main.zip`;
    }

    const repoName = zipUrl.split("/").pop().replace(".zip", "");

    // First, get the formdata from uithub
    const uithubUrl = `https://ingestzip.uithub.com/${zipUrl}`;
    console.log(`Fetching from: ${uithubUrl}`);

    // Now, send that to our local worker
    const workerUrl = `http://localhost:3000/${uithubUrl}?maxTokens=${maxTokens}&maxFileSize=${maxFileSize}`;
    console.log(`Sending to worker: ${workerUrl}`);

    const response = await fetch(workerUrl);

    if (!response.ok) {
      throw new Error(
        `Worker returned status: ${response.status} ${response.statusText}`,
      );
    }

    // Get the markdown content
    const markdownContent = await response.text();

    // Write the markdown to a file
    const outputFile = path.join(testDir, `${repoName}.md`);
    await fs.writeFile(outputFile, markdownContent);

    console.log(`Successfully wrote ${outputFile}`);
  } catch (error) {
    console.error(`Error processing custom ZIP:`, error.message);
  }
}

// Check if a specific repository was provided as an argument
if (process.argv.length > 2) {
  const customZipUrl = process.argv[2];
  const maxTokens = process.argv[3] ? parseInt(process.argv[3], 10) : 100000;
  const maxFileSize = process.argv[4] ? parseInt(process.argv[4], 10) : 100000;

  testCustomZip(customZipUrl, maxTokens, maxFileSize);
} else {
  // Run the test with predefined repositories
  testZipProcessor();
}

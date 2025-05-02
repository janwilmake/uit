import { StandardURL } from "./router.js";

/**
 * This is the domain-specific router that determines the domain-specific decomposition
 * of the pathname and the source URL for npmjs.com
 */
export default {
  fetch: async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const isAuthenticated =
      request.headers.get("X-IS-AUTHENTICATED") === "true";
    console.log({ pathname });

    // Check if the URL starts with /package/
    if (!pathname.startsWith("/package/")) {
      return new Response("Invalid npm package URL format", { status: 400 });
    }

    // Get the package path after /package/
    const packagePath = pathname.substring("/package/".length);

    // Parse npm package URL path: /@scope/package-name or /package-name
    const packageParts = packagePath.split("/").filter((part) => part);

    let packageName = "";
    let scope = "";
    let version = "latest";
    let basePath = "";

    // Check for version format like /v/4.6.3
    let versionFormat = false;

    // Look for a /v/ segment that's followed by a version number
    const vIndex = packageParts.findIndex((part) => part === "v");
    if (
      vIndex !== -1 &&
      vIndex + 1 < packageParts.length &&
      packageParts[vIndex + 1].match(/^\d/)
    ) {
      versionFormat = true;
      version = packageParts[vIndex + 1];
    }

    if (packageParts[0]?.startsWith("@")) {
      // Scoped package: @scope/package
      if (packageParts.length >= 2) {
        scope = packageParts[0].substring(1); // Remove @ from scope
        packageName = packageParts[1];

        // Handle remaining parts differently based on if we found a /v/ format
        if (versionFormat) {
          // We already extracted the version, so exclude those parts
          const remainingParts = [
            ...packageParts.slice(2, vIndex),
            ...packageParts.slice(vIndex + 2),
          ];
          basePath = remainingParts.join("/");
        } else if (packageParts.length > 2) {
          // Traditional format - check remaining parts
          const remainingParts = packageParts.slice(2);

          // Check if the next part is a version (starts with a number, v, or is "latest")
          if (
            remainingParts[0]?.match(/^(v?\d|latest)/) ||
            remainingParts[0] === "latest"
          ) {
            version = remainingParts[0].replace(/^v/, ""); // Remove 'v' prefix if present
            basePath = remainingParts.slice(1).join("/");
          } else {
            basePath = remainingParts.join("/");
          }
        }
      }
    } else {
      // Regular package
      if (packageParts.length >= 1) {
        scope = ""; // No scope
        packageName = packageParts[0];

        // Handle remaining parts differently based on if we found a /v/ format
        if (versionFormat) {
          // We already extracted the version, so exclude those parts
          const remainingParts = [
            ...packageParts.slice(1, vIndex),
            ...packageParts.slice(vIndex + 2),
          ];
          basePath = remainingParts.join("/");
        } else if (packageParts.length > 1) {
          // Traditional format - check remaining parts
          const remainingParts = packageParts.slice(1);

          // Check if the next part is a version (starts with a number, v, or is "latest")
          if (
            remainingParts[0]?.match(/^(v?\d|latest)/) ||
            remainingParts[0] === "latest"
          ) {
            version = remainingParts[0].replace(/^v/, ""); // Remove 'v' prefix if present
            basePath = remainingParts.slice(1).join("/");
          } else {
            basePath = remainingParts.join("/");
          }
        }
      }
    }

    // Extract plugin information from basePath if present
    let pluginId = "";
    let ext = "";

    const parts = basePath.split("/");
    if (parts.length > 0 && parts[0].includes(".")) {
      const [id, extension] = parts[0].split(".");
      pluginId = id;
      ext = extension;
      basePath = parts.slice(1).join("/");
    }

    console.log({ packageName, scope, version, basePath });

    // For npm packages, the primarySourceSegment is the package name (with scope if present)
    const fullPackageName = scope ? `@${scope}/${packageName}` : packageName;
    const primarySourceSegment = fullPackageName;

    // Generate correct tarball URL for the package
    let tarballUrl = "";

    if (scope) {
      // Scoped package tarball URL format
      tarballUrl = `https://registry.npmjs.org/${fullPackageName}/-/${packageName}-${version}.tgz`;
    } else {
      // Regular package tarball URL format
      tarballUrl = `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
    }

    const currentTokens = `{{currentTokens}}`;
    const title = `NPM ${primarySourceSegment} LLM Context`;
    const description = `Easily ask your LLM code questions about "${primarySourceSegment}" npm package. /${basePath} contains ${currentTokens} tokens.`;

    // Create an OG image URL specific to npm packages
    const ogImageUrl = `https://github-og-image.githuq.workers.dev/npm/${primarySourceSegment}?path=${basePath}&tokens=${currentTokens}`;

    // For raw access, we can use unpkg.com which serves raw npm package content
    const rawUrlPrefix = `https://unpkg.com/${fullPackageName}${
      version && version !== "latest" ? `@${version}` : ""
    }`;

    // Create the StandardURL object
    const json: StandardURL = {
      pluginId,
      ext,
      basePath,
      primarySourceSegment,
      secondarySourceSegment: version,
      ogImageUrl,
      description,
      title,
      // source
      sourceType: "tar", // or "tgz" depending on what your backend expects
      sourceUrl: tarballUrl,
      rawUrlPrefix,
    };

    return new Response(JSON.stringify(json, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

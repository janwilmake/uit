import { StandardURL } from "./StandardURL";

/**
 * This is the domain-specific router that determines the domain-specific decomposition
 * of the pathname and the source URL for npmjs.com
 */
export default {
  fetch: async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const isAuthenticated =
      request.headers.get("X-IS-AUTHENTICATED") === "true";

    // Check if the URL starts with /package/
    if (!pathname.startsWith("/package/")) {
      return new Response("Invalid npm package URL format", { status: 404 });
    }

    // Get the package path after /package/
    const remainingPath = pathname.substring("/package/".length);
    const segments = remainingPath.split("/").filter((part) => part);

    // State variables
    let packageName = "";
    let scope = "";
    let version = "";
    let pluginId = "";
    let ext = "";
    let basePath = "";

    // Parse package name (with optional scope)
    if (segments[0]?.startsWith("@")) {
      // Scoped package: @scope/package
      if (segments.length < 2) {
        return new Response("Invalid scoped package format", { status: 404 });
      }
      scope = segments[0].substring(1); // Remove @
      packageName = segments[1];
      segments.splice(0, 2); // Remove scope and package name
    } else {
      // Regular package
      if (segments.length === 0) {
        return new Response("Invalid package format", { status: 404 });
      }
      packageName = segments[0];
      segments.splice(0, 1); // Remove package name
    }

    // Check for optional /v/{version} format
    if (
      segments.length >= 2 &&
      segments[0] === "v" &&
      segments[1].match(/^\d/)
    ) {
      version = segments[1];
      segments.splice(0, 2); // Remove 'v' and version
    }

    // Extract plugin information if present (first segment with a dot)
    if (segments.length > 0) {
      const [id, extension] = segments[0].split(".");
      pluginId = id;
      ext = extension;
      segments.splice(0, 1); // Remove plugin segment
    }

    // Remaining segments form the basePath
    basePath = segments.join("/");

    // If no version was found in URL, fetch latest version
    if (!version) {
      try {
        const registryUrl = scope
          ? `https://registry.npmjs.org/@${scope}/${packageName}/latest`
          : `https://registry.npmjs.org/${packageName}/latest`;

        const response = await fetch(registryUrl);
        const json: { version: string } = await response.json();
        version = json.version;

        if (!version) {
          throw new Error("No version found");
        }
      } catch (e) {
        return new Response("Failed to fetch package version", { status: 404 });
      }
    }

    // Construct full package name and tarball URL
    const fullPackageName = scope ? `@${scope}/${packageName}` : packageName;
    const tarballUrl = `https://registry.npmjs.org/${fullPackageName}/-/${packageName}-${version}.tgz`;

    // Generate metadata
    const currentTokens = `{{currentTokens}}`;
    const title = `NPM ${fullPackageName} LLM Context`;
    const description = `Easily ask your LLM code questions about "${fullPackageName}" npm package. /${basePath} contains ${currentTokens} tokens.`;
    const ogImageUrl = `https://github-og-image.githuq.workers.dev/npm/${fullPackageName}?path=${basePath}&tokens=${currentTokens}`;
    const rawUrlPrefix = `https://unpkg.com/${fullPackageName}@${version}`;

    // Create the StandardURL response
    const json: StandardURL = {
      pluginId,
      ext,
      basePath,
      primarySourceSegment: "package/" + fullPackageName + "/v/" + version,
      ogImageUrl,
      description,
      title,
      omitFirstSegment: true,
      sourceType: "tar",
      baseLink: "https://npmjs.com" + pathname,

      sourceUrl: tarballUrl,
      rawUrlPrefix,
    };

    return new Response(JSON.stringify(json, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

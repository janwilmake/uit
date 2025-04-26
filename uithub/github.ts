import { StandardURL } from "./router.js";

/**
 * This is the domain-specific router that determines the domain-specific decomposition of the pathname and the source URL
 */
export default {
  fetch: async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;

    const isAuthenticated =
      request.headers.get("X-IS-AUTHENTICATED") === "true";

    // github simple parsing. will be more sophisticated later
    let [owner, repo, pluginIdAndExt, branch, ...pathParts] = pathname
      .split("/")
      .slice(1);
    const [pluginId, ext] = (pluginIdAndExt || "").split(".");

    if (owner === "stars" && pluginId === "lists" && branch) {
      //Example
      // https://github.com/stars/janwilmake/lists/durable-objects/plugin/main/reponame/folder

      const listName = branch;
      owner = repo;

      const [pluginIdAndExt, branchName, ...basePathParts] = pathParts;
      const basePath = basePathParts.join("/");
      const [pluginId, ext] = (pluginIdAndExt || "").split(".");

      // TODO: make this available
      const zipUrl = `https://lists.forgithub.com/${owner}/${listName}${
        branchName ? `/${branchName}.zip` : ".zip"
      }`;
      const title = `GitHub list ${listName} LLM Context`;
      const description = `Easily ask your LLM code questions about "${listName}". /${basePath} on GitHub.`;

      const primarySourceSegment = pathname.split("/").slice(1, 4).join("/");

      const ogImageUrl = undefined;

      const json: StandardURL = {
        pluginId,
        ext,
        basePath,
        primarySourceSegment,
        secondarySourceSegment: branchName,
        ogImageUrl,
        description,
        title,
        // source
        sourceType: "zip",
        sourceUrl: zipUrl,
      };
      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    const basePath = pathParts.join("/");

    const ref = /^[0-9a-f]{40}$/i.test(branch)
      ? branch
      : // for our convention main should always be the default so this is fine.
        `refs/heads/${branch || "main"}`;

    const zipUrl = encodeURIComponent(
      isAuthenticated
        ? `https://api.github.com/repos/${owner}/${repo}/zipball${
            branch ? "/" + branch : ""
          }`
        : `https://github.com/${owner}/${repo}/archive/${
            branch ? ref : "HEAD"
          }.zip`,
    );

    const currentTokens = `{{currentTokens}}`;

    const primarySourceSegment = `${owner}/${repo}`;
    const title = `GitHub ${primarySourceSegment} LLM Context`;
    const description = `Easily ask your LLM code questions about "${primarySourceSegment}". /${basePath} on GitHub contains ${currentTokens} tokens.`;

    const ogImageUrl = `https://github-og-image.githuq.workers.dev/${primarySourceSegment}?path=${basePath}&tokens=${currentTokens}`;

    const rawUrlPrefix = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;

    const json: StandardURL = {
      pluginId,
      ext,
      basePath,
      primarySourceSegment,
      secondarySourceSegment: branch,
      ogImageUrl,
      description,
      title,
      // source
      sourceType: "zip",
      sourceUrl: zipUrl,
      rawUrlPrefix,
    };

    return new Response(JSON.stringify(json, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

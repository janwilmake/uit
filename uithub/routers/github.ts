import { StandardURL } from "./standard-url.js";

// Helper function to get zip URL for a repo
function getRepoZipUrl(
  owner: string,
  repo: string,
  branch: string | undefined,
  isAuthenticated: boolean,
): string {
  const ref = /^[0-9a-f]{40}$/i.test(branch || "")
    ? branch
    : `refs/heads/${branch || "main"}`;

  return isAuthenticated
    ? `https://api.github.com/repos/${owner}/${repo}/zipball${
        branch ? "/" + branch : ""
      }`
    : `https://github.com/${owner}/${repo}/archive/${ref}.zip`;
}

export default {
  fetch: async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const isAuthenticated =
      request.headers.get("X-IS-AUTHENTICATED") === "true";

    // Parse GitHub path components
    let [owner, repo, pageAndExt, branch, ...pathParts] = pathname
      .split("/")
      .slice(1);
    const [page, ext] = (pageAndExt || "").split(".");

    if (!owner || owner === "" || owner === "-") {
      const [pluginIdAndExt, ...basePathParts] = pathname.split("/").slice(2);
      const [pluginId, ext] = (pluginIdAndExt || "").split(".");

      let title = `Popular repos`;
      let description = `Popular repos on GitHub`;

      const json: StandardURL = {
        pluginId,
        ext,
        basePath: basePathParts.join("/"),
        primarySourceSegment: `-`,
        title,
        description,
        sourceType: "json",
        omitFirstSegment: false,
        sourceUrl: `https://popular.forgithub.com/index.json`,
      };

      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    // Handle organization pages (/orgs/{orgName}/{subpage}/{pluginIdAndExt}/{...basePath})
    if (owner === "orgs" && repo) {
      const [orgName, subpage, pluginIdAndExt, ...basePathParts] = pathname
        .split("/")
        .slice(2);
      const [pluginId, ext] = (pluginIdAndExt || "").split(".");

      let sourceUrl = `https://cache.forgithub.com/orgs/${orgName}`;
      let title = `GitHub Organization ${orgName}`;
      let description = `Information about the ${orgName} organization`;
      const basePath = subpage ? [subpage].concat(basePathParts).join("/") : "";

      const json: StandardURL = {
        pluginId,
        ext,
        basePath,
        primarySourceSegment: `orgs/${orgName}${subpage ? "/" + subpage : ""}`,
        secondarySourceSegment: basePathParts.join("/"),
        title,
        description,
        sourceType: "json",
        omitFirstSegment: false,
        sourceUrl,
      };

      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    // Handle user profile
    // ex. /{owner}/-/{pluginId}/{...basePath}
    if (!repo || repo === "-") {
      const [owner, _, pluginIdAndExt, ...basePathParts] = pathname
        .split("/")
        .slice(1);
      const basePath = basePathParts.join("/");
      const [pluginId, ext] = (pluginIdAndExt || "").split(".");
      const json: StandardURL = {
        // no branch
        basePath,
        primarySourceSegment: owner + "/-",
        pluginId,
        ext,
        title: `GitHub User ${owner}`,
        description: `Profile information, repositories, stars, and projects for ${owner}`,
        sourceType: "json",
        omitFirstSegment: false,
        sourceUrl: `https://cache.forgithub.com/stars/${owner}`,
      };

      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    // Handle GitHub lists structure
    if (owner === "stars" && page === "lists" && branch) {
      const listName = branch;
      owner = repo;
      const [pageAndExt, branchName, ...basePathParts] = pathParts;
      const basePath = basePathParts.join("/");
      const [pluginId, ext] = (pageAndExt || "").split(".");

      const zipUrl = `https://lists.forgithub.com/${owner}/${listName}${
        branchName ? `/${branchName}.zip` : ".zip"
      }`;

      const primarySourceSegment = pathname.split("/").slice(1, 4).join("/");

      const json: StandardURL = {
        pluginId,
        ext,
        basePath,
        primarySourceSegment,
        secondarySourceSegment: branchName || "main",
        description: `Easily ask your LLM code questions about "${listName}". /${basePath} on GitHub.`,
        title: `GitHub list ${listName} LLM Context`,
        sourceType: "zip",
        omitFirstSegment: false,
        sourceUrl: zipUrl,
      };

      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    if (owner === "stars" && repo) {
      // redirect to the user page
      return new Response("{}", {
        status: 307,
        headers: { Location: `/${repo}/stars` },
      });
    }

    const basePath = pathParts.join("/");
    const primarySourceSegment = `${owner}/${repo}`;

    // Handle GitHub source types
    switch (page) {
      case "wiki":
        const json: StandardURL = {
          pluginId: branch || "tree",
          ext,
          basePath,
          primarySourceSegment: `${owner}/${repo}/wiki`,
          title: `GitHub ${primarySourceSegment} Wiki`,
          description: `Wiki documentation for ${primarySourceSegment}`,
          sourceType: "zip",
          omitFirstSegment: false,
          sourceUrl: `https://wikizip.forgithub.com/${primarySourceSegment}`,
        };
        return new Response(JSON.stringify(json, undefined, 2), {
          headers: { "content-type": "application/json" },
        });

      case "compare":
        // For compare, we expect format: /owner/repo/compare/base...head
        const compareParams = branch; // branch holds "base...head"
        if (compareParams && compareParams.includes("...")) {
          const [base, head] = compareParams.split("...");

          // Use the new function to get zip URLs for both base and head
          const baseZipUrl = encodeURIComponent(
            getRepoZipUrl(owner, repo, base, isAuthenticated),
          );
          const headZipUrl = encodeURIComponent(
            getRepoZipUrl(owner, repo, head, isAuthenticated),
          );

          const json: StandardURL = {
            pluginId: page,
            ext,
            basePath,
            primarySourceSegment,
            secondarySourceSegment: compareParams,
            title: `Compare ${base}...${head} in ${primarySourceSegment}`,
            description: `Compare changes between ${base} and ${head} branches`,
            sourceType: "zip",
            omitFirstSegment: false,
            sourceUrl: `https://compare.uithub.com/${baseZipUrl}/${headZipUrl}`,
          };

          return new Response(JSON.stringify(json, undefined, 2), {
            headers: { "content-type": "application/json" },
          });
        }
        break;

      case "issues":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "issues",
              title: `GitHub ${primarySourceSegment} Issues`,
              description: `LLM context for issues in ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://cache.forgithub.com/${primarySourceSegment}/issues`,
            },
            undefined,
            2,
          ),
          { headers: { "content-type": "application/json" } },
        );

      case "pull":
      case "pulls":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "pulls",
              title: `GitHub ${primarySourceSegment} Pull Requests`,
              description: `LLM context for pull requests in ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://cache.forgithub.com/${primarySourceSegment}/pulls`,
            },
            undefined,
            2,
          ),
          { headers: { "content-type": "application/json" } },
        );

      case "discussions":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "discussions",
              title: `GitHub ${primarySourceSegment} Discussions`,
              description: `LLM context for discussions in ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://cache.forgithub.com/${primarySourceSegment}/discussions`,
            },
            undefined,
            2,
          ),
          {
            headers: { "content-type": "application/json" },
          },
        );

      case "branches":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "branches",
              title: `GitHub ${primarySourceSegment} Branches`,
              description: `Branch information and last commits for ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://log.forgithub.com/${primarySourceSegment}/branches`,
            },
            undefined,
            2,
          ),
          { headers: { "content-type": "application/json" } },
        );

      case "commits":
      case "commit":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "commits",
              title: `GitHub ${primarySourceSegment} Commits`,
              description: `Commit history and contributor info for ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://log.forgithub.com/${primarySourceSegment}/commits`,
            },
            undefined,
            2,
          ),
          {
            headers: { "content-type": "application/json" },
          },
        );

      case "releases":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "releases",
              title: `GitHub ${primarySourceSegment} Releases`,
              description: `Release information for ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://log.forgithub.com/${primarySourceSegment}/releases`,
            },
            undefined,
            2,
          ),
          {
            headers: { "content-type": "application/json" },
          },
        );

      case "actions":
        return new Response(
          JSON.stringify(
            {
              pluginId: page,
              ext,
              basePath,
              primarySourceSegment,
              secondarySourceSegment: "actions",
              title: `GitHub ${primarySourceSegment} Actions`,
              description: `GitHub Actions workflows for ${primarySourceSegment}`,
              sourceType: "json",
              omitFirstSegment: false,
              sourceUrl: `https://actions.forgithub.com/${primarySourceSegment}`,
            },
            undefined,
            2,
          ),
          {
            headers: { "content-type": "application/json" },
          },
        );
    }

    // Default repository/file handling
    const zipUrl = getRepoZipUrl(owner, repo, branch, isAuthenticated);

    const currentTokens = `{{currentTokens}}`;
    const ogImageUrl = `https://github-og-image.githuq.workers.dev/${primarySourceSegment}?path=${basePath}&tokens=${currentTokens}`;
    const ref = /^[0-9a-f]{40}$/i.test(branch || "")
      ? branch
      : `refs/heads/${branch || "main"}`;
    const rawUrlPrefix = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;
    const json: StandardURL = {
      pluginId: page,
      ext,
      basePath,
      primarySourceSegment,
      secondarySourceSegment: branch || "main",
      ogImageUrl,
      description: `Easily ask your LLM code questions about "${primarySourceSegment}". /${basePath} on GitHub contains ${currentTokens} tokens.`,
      title: `GitHub ${primarySourceSegment} LLM Context`,
      sourceType: "zip",
      omitFirstSegment: true,
      sourceUrl: zipUrl,
      rawUrlPrefix,
    };

    return new Response(JSON.stringify(json, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

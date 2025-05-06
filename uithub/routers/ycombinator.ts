/**
News.ycombinator.com router:
- `/news`, `/front` - redirect to `/tree/items`
- `/ask`, `/show`, `/jobs`, `/submit`, `/user`, `/newcomments`, `/threads`, `/newest`: - redirect to `/tree` without suffix
- `/item?id=number` - redirect to `/tree/items/{id}.json`
- `/{pluginIdAndExt}/{basePath}` - Respond with sql source https://crawler.gcombinator.com. the structure of the response should come from the pathname and is /{pluginIdAndExt}/{...basePath}. that can sometimes be /tree/basePath, then pluginIdAndExt is 'tree' but can be anything else. 
*/

import { StandardURL } from "./router.js";

export default {
  fetch: async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Handle item?id=number pattern
    if (pathname === "/item" && searchParams.has("id")) {
      const itemId = searchParams.get("id");
      if (itemId && /^\d+$/.test(itemId)) {
        return new Response("{}", {
          status: 307,
          headers: { Location: `/tree/items/${itemId}.json` },
        });
      }
    }

    // Handle redirects for specific paths
    if (["/news", "/front"].includes(pathname)) {
      return new Response("{}", {
        status: 307,
        headers: { Location: `/tree/items` },
      });
    }

    // Handle redirects for section paths
    if (
      [
        "/ask",
        "/show",
        "/jobs",
        "/submit",
        "/user",
        "/newcomments",
        "/threads",
        "/newest",
      ].includes(pathname)
    ) {
      return new Response("{}", {
        status: 307,
        headers: { Location: `/tree` },
      });
    }

    // Handle standard plugin pattern: /{pluginIdAndExt}/{basePath}
    const pathParts = pathname.split("/").filter(Boolean);

    if (pathParts.length > 0) {
      const [pluginIdAndExt, ...basePathParts] = pathParts;
      const [pluginId, ext] = (pluginIdAndExt || "").split(".");
      const basePath = basePathParts.join("/");

      // Create title and description based on the path
      let title = "Hacker News";
      let description = "Hacker News content";

      if (basePath.startsWith("items")) {
        title = "Hacker News Items";
        description = "Stories and comments from Hacker News";
      } else if (basePath) {
        title = `Hacker News ${
          basePath.charAt(0).toUpperCase() + basePath.slice(1)
        }`;
        description = `${
          basePath.charAt(0).toUpperCase() + basePath.slice(1)
        } section from Hacker News`;
      }

      const json: StandardURL = {
        pluginId,
        ext,
        basePath,
        primarySourceSegment: "",
        title,
        description,
        sourceType: "sql",
        omitFirstSegment: false,
        sourceUrl: `https://crawler.gcombinator.com`,
      };

      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    // Default response for the root path
    const json: StandardURL = {
      pluginId: "tree",
      ext: undefined,
      basePath: undefined,
      primarySourceSegment: "",
      title: "Hacker News Front Page",
      description: "Top stories from Hacker News",
      sourceType: "sql",
      omitFirstSegment: false,
      sourceUrl: "https://crawler.gcombinator.com",
    };

    return new Response(JSON.stringify(json, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

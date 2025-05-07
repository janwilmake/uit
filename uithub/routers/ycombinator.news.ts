import { StandardURL } from "./types.js";

export default {
  fetch: async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Split path into segments
    const pathSegments = pathname.split("/").filter(Boolean);

    // Check if this is a plugin-prefixed path or a direct HN path
    let pluginIdAndExt = "tree";
    let ext: string | undefined;
    let hnPathSegments: string[] = [...pathSegments];
    let basePath: string | undefined;

    // Known Hacker News routes that should be preserved as routes
    const knownHnRoutes = [
      "news",
      "newest",
      "front",
      "ask",
      "show",
      "jobs",
      "submit",
      "user",
      "item",
      "newcomments",
      "threads",
    ];

    // If the first segment isn't a known HN route, treat it as a pluginId
    if (pathSegments.length > 0 && !knownHnRoutes.includes(pathSegments[0])) {
      [pluginIdAndExt, ...hnPathSegments] = pathSegments;
      const parts = pluginIdAndExt.split(".");
      if (parts.length > 1) {
        [pluginIdAndExt, ext] = parts;
      }
    }

    // Parse query parameters for item?id= pattern
    let secondarySourceSegment = "";
    let sqlQuery = "";
    let title = "Hacker News";
    let description = "Hacker News content and discussions";

    // Handle different HN routes
    if (
      hnPathSegments.length === 0 ||
      hnPathSegments[0] === "news" ||
      hnPathSegments[0] === "front"
    ) {
      // Front page
      secondarySourceSegment = "front";
      title = "Hacker News Front Page";
      description = "Top stories from Hacker News";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE type = 'story' AND NOT deleted AND NOT dead ORDER BY score DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "newest") {
      // Newest stories
      secondarySourceSegment = "newest";
      title = "Newest Submissions";
      description = "Most recent submissions to Hacker News";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE type = 'story' AND NOT deleted AND NOT dead ORDER BY time DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "ask") {
      // Ask HN
      secondarySourceSegment = "ask";
      title = "Ask Hacker News";
      description = "Questions and discussions from the Hacker News community";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE title LIKE 'Ask HN%' AND type = 'story' AND NOT deleted AND NOT dead ORDER BY score DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "show") {
      // Show HN
      secondarySourceSegment = "show";
      title = "Show Hacker News";
      description = "Projects and creations from the Hacker News community";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE title LIKE 'Show HN%' AND type = 'story' AND NOT deleted AND NOT dead ORDER BY score DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "jobs") {
      // Jobs
      secondarySourceSegment = "jobs";
      title = "Hacker News Jobs";
      description = "Job listings posted to Hacker News";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE type = 'job' AND NOT deleted AND NOT dead ORDER BY time DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "user" && hnPathSegments.length > 1) {
      // User profile
      const username = hnPathSegments[1];
      secondarySourceSegment = `user/${username}`;
      title = `Hacker News User: ${username}`;
      description = `Profile and submissions by ${username}`;
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE by = '${username}' AND NOT deleted AND NOT dead ORDER BY time DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "item") {
      // Item details - from either path or query parameter
      let itemId: string | null = null;

      // Check if id is in the path segments
      if (hnPathSegments.length > 1) {
        itemId = hnPathSegments[1];
      }
      // Otherwise check query parameter
      else if (searchParams.has("id")) {
        itemId = searchParams.get("id");
      }

      if (itemId && /^\d+$/.test(itemId)) {
        secondarySourceSegment = `item/${itemId}`;
        title = `Hacker News Item #${itemId}`;
        description = `Discussion and details for item #${itemId}`;
        sqlQuery = encodeURIComponent(
          `SELECT * FROM items WHERE id = ${itemId}`,
        );
      } else {
        return new Response(
          JSON.stringify({
            error: "Invalid Item ID",
            message: "The item ID is missing or invalid",
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        );
      }
    } else if (hnPathSegments[0] === "newcomments") {
      // New comments
      secondarySourceSegment = "newcomments";
      title = "New Comments";
      description = "Recent comments on Hacker News";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE has_comments = TRUE AND NOT deleted AND NOT dead ORDER BY time DESC LIMIT 30`,
      );
    } else if (hnPathSegments[0] === "threads" && hnPathSegments.length > 1) {
      // User threads
      const username = hnPathSegments[1];
      secondarySourceSegment = `threads/${username}`;
      title = `${username}'s Threads`;
      description = `Comment threads by ${username}`;
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE by = '${username}' AND has_comments = TRUE AND NOT deleted AND NOT dead ORDER BY time DESC LIMIT 30`,
      );
    } else {
      // If we get here, we might have a custom path or an unsupported route
      // Set the segments after the potential plugin as the basePath
      basePath = hnPathSegments.join("/");
      secondarySourceSegment = "custom";
      title = "Hacker News Custom View";
      description = "Custom view of Hacker News content";
      sqlQuery = encodeURIComponent(
        `SELECT * FROM items WHERE NOT deleted AND NOT dead ORDER BY time DESC LIMIT 30`,
      );
    }

    // Handle any additional query parameters from the original request

    // Construct the source URL with the DORM spec
    const sourceUrl = `https://crawler.gcombinator.com/api/db/query/raw/${sqlQuery}?itemTemplate={type}-{id}-by-{by}-at-{time}.json`;

    // Create the StandardURL response
    const json: StandardURL = {
      pluginId: pluginIdAndExt,
      ext,
      basePath,
      primarySourceSegment: "news.ycombinator.com",
      secondarySourceSegment,
      title,
      description,
      sourceType: "sql",
      omitFirstSegment: false,
      sourceUrl,
    };

    return new Response(JSON.stringify(json, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

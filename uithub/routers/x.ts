// prompt
// https://raw.githubusercontent.com/janwilmake/xymake/refs/heads/main/README.md
// + github.ts
// Similar to the GitHub router, please create a x.ts router that returns a StandardURL for every endpoint.all username endpoints can be grouped into a single one. all locked ones need not be done yet (return 404 for these, and others). so basically we only have i/lists/{id} and username/{page} and username/status/{id}. behind each we need to parse {pluginId} and after that {pathParts}.

// what needs to be specified, is the sources that are available.
// TODO
// 1. check the url structure on X for username. is it really just the username/status/{id} and username/{page} or is there more to it?
// 2. if its really just that, either decide to have the plugin BEFORE the username, or after the username.

import { StandardURL } from "./router.js";

export default {
  fetch: async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const isAuthenticated =
      request.headers.get("X-IS-AUTHENTICATED") === "true";

    // Parse path components
    const [firstSegment, secondSegment, ...restParts] = pathname
      .split("/")
      .slice(1);

    // Handle list details: /i/lists/{list_id}/{pluginIdAndExt}/{...basePath}
    if (firstSegment === "i" && secondSegment === "lists") {
      const [listId, pluginIdAndExt, ...basePathParts] = restParts;

      if (!listId) {
        return new Response("List ID required", { status: 400 });
      }

      const [pluginId, ext] = (pluginIdAndExt || "").split(".");

      const json: StandardURL = {
        pluginId,
        ext,
        basePath: basePathParts.join("/"),
        primarySourceSegment: `i/lists/${listId}`,
        title: `List ${listId}`,
        description: `List details and members for list ${listId}`,
        sourceType: "json",
        omitFirstSegment: false,
        sourceUrl: `https://api.xymake.com/i/lists/${listId}.json`,
      };

      return new Response(JSON.stringify(json, undefined, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    // Handle username-based endpoints
    if (firstSegment) {
      const username = firstSegment;

      // /[username]/status/[tweet_id]/{pluginIdAndExt}/{...basePath}
      if (secondSegment === "status") {
        const [tweetId, pluginIdAndExt, ...basePathParts] = restParts;

        if (!tweetId) {
          return new Response("Tweet ID required", { status: 400 });
        }

        const [pluginId, ext] = (pluginIdAndExt || "").split(".");

        const json: StandardURL = {
          pluginId,
          ext,
          basePath: basePathParts.join("/"),
          primarySourceSegment: `${username}/status/${tweetId}`,
          title: `Tweet by @${username}`,
          description: `Tweet ${tweetId} by @${username} and its replies`,
          sourceType: "json",
          omitFirstSegment: false,
          sourceUrl: `https://xymake.com/${username}/status/${tweetId}.json`,
        };

        return new Response(JSON.stringify(json, undefined, 2), {
          headers: { "content-type": "application/json" },
        });
      }

      // Handle locked/unimplemented endpoints
      const lockedEndpoints = [
        "following",
        "followers",
        "verified_followers",
        "creator-subscriptions",
        "photo",
        "articles",
        "media",
        "likes",
        "bookmarks",
      ];

      if (lockedEndpoints.includes(secondSegment)) {
        return new Response(
          JSON.stringify({
            error: "Endpoint requires X API Basic Plan",
            message: `The ${secondSegment} endpoint is not available in the free tier`,
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          },
        );
      }

      // Handle standard user endpoints: /[username]/{page}/{pluginIdAndExt}/{...basePath}
      let page = secondSegment;
      let pluginIdAndExt;
      let basePathParts;

      if (page) {
        [pluginIdAndExt, ...basePathParts] = restParts;
      } else {
        // Handle /[username]/{pluginIdAndExt}/{...basePath}
        page = "profile";
        [pluginIdAndExt, ...basePathParts] = [secondSegment, ...restParts];
      }

      const [pluginId, ext] = (pluginIdAndExt || "").split(".");

      let title = `@${username}`;
      let description = `X profile for @${username}`;
      let sourceUrl = `https://api.xymake.com/${username}.json`;

      switch (page) {
        case "with_replies":
          title = `@${username} with replies`;
          description = `Tweets and replies from @${username}`;
          sourceUrl = `https://api.xymake.com/${username}/with_replies.json`;
          break;
        case "highlights":
          title = `@${username} highlights`;
          description = `Highlighted tweets from @${username}`;
          sourceUrl = `https://api.xymake.com/${username}/highlights.json`;
          break;
        case "lists":
          title = `Lists by @${username}`;
          description = `Lists created or subscribed to by @${username}`;
          sourceUrl = `https://api.xymake.com/${username}/lists.json`;
          break;
      }

      const json: StandardURL = {
        pluginId,
        ext,
        basePath: basePathParts?.join("/") || "",
        primarySourceSegment: username,
        secondarySourceSegment: page !== "profile" ? page : undefined,
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

    // Handle other endpoints (explore, search, etc.) - return 404 for now
    const unimplementedEndpoints = [
      "home",
      "messages",
      "notifications",
      "explore",
      "search",
      "i/bookmarks",
      "i/topics",
      "i/spaces",
      "i/communities",
    ];

    if (
      unimplementedEndpoints.includes(firstSegment) ||
      (firstSegment === "i" &&
        unimplementedEndpoints.includes(`i/${secondSegment}`))
    ) {
      return new Response(
        JSON.stringify({
          error: "Not Implemented",
          message: "This endpoint has not been implemented yet",
        }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // Default 404 response
    return new Response(
      JSON.stringify({
        error: "Not Found",
        message: "The requested endpoint does not exist",
      }),
      {
        status: 404,
        headers: { "content-type": "application/json" },
      },
    );
  },
};

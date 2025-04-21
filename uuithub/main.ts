/**
 * Universal Information Terminal (UIT)
 * https://github.com/janwilmake/uit
 *
 * Copyright (c) 2025 Jan Wilmake
 * Licensed under MIT License
 *
 * For attribution guidelines (not required by license), see:
 * https://github.com/janwilmake/uit/blob/main/ATTRIBUTION.md
 */

import { getSponsor, middleware } from "sponsorflare";
import viewHtml from "./public/vscode.html";
import profileHtml from "./public/profile.html";
import html404 from "./public/404.html";
import html429 from "./public/429.html";
import html from "./index.html";
export { SponsorDO } from "sponsorflare";
export { RatelimitDO } from "./ratelimiter.js";
import { ratelimit } from "./ratelimiter.js";
import urlPipe from "./urlPipe.js";
interface Env {
  GITHUB_PAT: string;
  CREDENTIALS: string;
  UITHUB_ZIPTREE: { fetch: typeof fetch };
}

interface Repository {
  name: string;
  full_name: string;
  tree_size: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  new_star_count: string;
  url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface ApiResponse {
  repositories: Repository[];
  count: number;
}

/**
 * Generate HTML for the top repositories
 */
function generateReposHtml(repositories: Repository[]): string {
  let html = `
    <section class="bg-gray-900 py-16 px-4 w-full">
      <div class="container mx-auto">
        <h2 class="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Explore What's Hot 🔥
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  `;

  for (const repo of repositories) {
    const description = repo.description
      ? repo.description.length > 100
        ? repo.description.substring(0, 97) + "..."
        : repo.description
      : "No description available";

    const stars = Number(repo.stargazers_count).toLocaleString();
    const newStars = repo.new_star_count ? `+${repo.new_star_count}` : "";

    html += `
      <div class="bg-gray-800 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-700">
        <div class="flex items-center mb-3">
          <img src="${repo.owner.avatar_url}" alt="${
      repo.owner.login
    }" class="w-8 h-8 rounded-full mr-2">
          <a href="/${
            repo.full_name
          }" class="text-purple-400 hover:text-purple-300 font-medium truncate">${
      repo.full_name
    }</a>
        </div>
        <p class="text-gray-300 text-sm mb-3 h-12 overflow-hidden">${description}</p>
        <div class="flex justify-between text-sm">
          <span class="flex items-center text-gray-400">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z"></path>
            </svg>
            ${stars}
            ${
              newStars
                ? `<span class="text-green-400 ml-1">+${Number(
                    newStars,
                  ).toFixed()} today</span>`
                : ""
            }

            ${
              repo.tree_size
                ? `<span class="text-purple-400 ml-3">${Math.round(
                    Number(repo.tree_size) / 1000,
                  )}k tokens</span>`
                : ""
            }
          </span>
          <span class="text-gray-400">
            ${
              repo.language
                ? `<span class="inline-block px-2 py-1 bg-gray-700 rounded text-xs">${repo.language}</span>`
                : ""
            }
          </span>
        </div>
      </div>
    `;
  }

  html += `
        </div>
      </div>
    </section>
  `;

  return html;
}
export const escapeHTML = (str: string) => {
  if (typeof str !== "string") {
    return "";
  }

  return str
    .replace(
      /[&<>'"]/g,
      (tag: string) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        }[tag] || tag),
    )
    .replace(/\u0000/g, "\uFFFD") // Replace null bytes
    .replace(/\u2028/g, "\\u2028") // Line separator
    .replace(/\u2029/g, "\\u2029"); // Paragraph separator
};

const fillTemplate = (html: string, template: { [key: string]: any }) => {
  return Object.keys(template).reduce((html, key) => {
    const value = template[key];
    return html.replaceAll(`{{${key}}}`, value);
  }, html);
};

const getIndex = async () => {
  try {
    // Check if the HTML contains the placeholder
    if (html.includes("{TOP_REPOS}")) {
      // Fetch popular repositories from the API
      const reposResponse = await fetch(
        "https://popular.forgithub.com/index.json",
      );

      if (!reposResponse.ok) {
        throw new Error(
          `Failed to fetch repositories: ${reposResponse.status}`,
        );
      }

      const data: ApiResponse = await reposResponse.json();

      // Generate HTML for top repositories (limit to 500, under 1m tokens)
      const topRepos = data.repositories.filter(
        (x) => Number(x.tree_size) < 1000000,
      );
      const topReposHtml = generateReposHtml(topRepos);

      // Replace the placeholder with the generated HTML
      const finalHtml = html.replace("{TOP_REPOS}", topReposHtml);

      // Create a new response with the modified HTML
      return new Response(finalHtml, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // If no placeholder is found, return the original response
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }
};

export default {
  fetch: async (request: Request, env: Env, context: any) => {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return getIndex();
    }
    const userAgent = request.headers.get("user-agent") || "";

    // More specific regex that tries to exclude larger tablets
    const mobileRegex =
      /Android(?!.*Tablet)|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

    // Specific tablet detection
    const tabletRegex = /iPad|Android.*Tablet|Tablet|Tab/i;

    const isMobileDevice =
      mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);

    if (isMobileDevice) {
      return new Response("Redirecting", {
        status: 302,
        headers: { Location: "/mobile-not-supported" },
      });
    }
    if (url.pathname === "/public/archive/refs/heads/main.zip") {
      // convention; by exposing the zip of the repo at this path, anyone can find your code at https://uithub.com/{domain}/public, even from a private repo if we pass the PAT!
      return fetch(
        `https://github.com/janwilmake/uithub/archive/refs/heads/main.zip`,
        { headers: { Authorization: `token ${env.GITHUB_PAT}` } },
      );
    }

    let t = Date.now();

    const sponsorflare = await middleware(request, env as any);
    if (sponsorflare) {
      return sponsorflare;
    }

    const {
      is_authenticated,
      owner_login,
      avatar_url,
      balance,
      spent,
      access_token,
      charged,
      scope,
    } = await getSponsor(
      request,
      env as any,
      // 1-1000th of a cent
      //{ charge: 0.001, allowNegativeClv: true },
    );

    const requestLimit = !is_authenticated
      ? 5
      : (balance || 0) < -1
      ? 10
      : undefined;

    console.log("middleware 1:", Date.now() - t + "ms");

    const ratelimited = requestLimit
      ? await ratelimit(request, env, {
          requestLimit,
          resetIntervalMs: 3600000,
        })
      : undefined;

    console.log("middleware 2:", Date.now() - t + "ms");

    const acceptHtml = request.headers.get("accept")?.includes("text/html");
    const TEST_RATELIMIT_PAGE = false;
    const hasWaitTime = (ratelimited?.waitTime || 0) > 0;
    const hasNegativeBalance = !balance || balance < 0;
    console.log({ requestLimit, ratelimited, hasWaitTime, hasNegativeBalance });
    if ((hasWaitTime && hasNegativeBalance) || TEST_RATELIMIT_PAGE) {
      if (acceptHtml) {
        return new Response(
          html429.replace(
            "</body>",
            `<script>window.data = ${JSON.stringify({
              owner_login,
              avatar_url,
              balance,
              ratelimitHeaders: ratelimited?.ratelimitHeaders,
            })};</script></body>`,
          ),
          {
            status: 429,
            headers: {
              "Content-Type": "text/html;charset=utf8",
              ...ratelimited?.ratelimitHeaders,
            },
          },
        );
      }

      // can only exceed ratelimit if balance is negative
      return new Response("Ratelimit exceeded", {
        status: 429,
        headers: { ...ratelimited?.ratelimitHeaders },
      });
    }

    const [_, owner, repo, pageAndExt, branch, ...pathParts] =
      url.pathname.split("/");
    const [page, ext] = (pageAndExt || "").split(".");

    const path = pathParts.join("/");
    const maxTokens = url.searchParams.get("maxTokens") || undefined;
    const maxFileSize = url.searchParams.get("maxFileSize") || undefined;
    const acceptQuery = url.searchParams.get("accept");
    const acceptHeader = request.headers.get("Accept");
    const accept = acceptQuery || acceptHeader || undefined;

    if (!owner) {
      return new Response(
        "You can use this API by going to https://uithub.com/{owner}/{repository}/tree/{branch}",
        { status: 404 },
      );
    }

    if (!repo) {
      return respondProfilePage(url.origin, owner, accept);
    }

    if (page === "compare") {
      // TODO: proxy this to diff.zipobject.com
      return new Response("Compare links are not supported yet", {
        status: 404,
      });
    }

    if (
      page === "issues" ||
      page === "pulls" ||
      page === "pull" ||
      page === "discussions"
    ) {
      // TODO: for github repos, this should actually pull the right stuff from cache.forgithub.com using "uithub.ingestjson" and "ext" could actually be used as an extra transformation applied to the JSON!

      // If I do this, there should be a way to easily tell about the different information available from the UI (this would only work with github).

      // Also, to keep this up-to-date, github watching would be required, which could be a premium feature.

      // Initially I can just use the cache.forgithub.com JSON, however, we could also stream this in nicely from the github API if this were a ingest connector that responded on a per-issue basis. Would be even better! uit makes it possible.
      return new Response("Thread links are not supported yet.", {
        status: 404,
      });
    }

    if (page === "swc") {
      // TODO: Gives parse and its components
    }

    if (page === "typedoc") {
      // TODO: Gives typedoc docs (through vercel)
    }

    if (page === "x") {
      // Should:
      // 1) give context of x threads found in the data
      // 2) determine the key keyword or keywords that identify this repo
      // 3) Find the X account(s) linked to the owner (and if that's an organisation, at least the core contributor, but if not, also look at top 50% contributors or so).
      // 4) Use keywords within context of posts of X accounts to filter out threads that are relevant (without duplication).
      // 5) Run a search on x with results of people mentioning the keyword(s) to find other mentions about this repo.
      // All of this should be done respecing privacy and with an xymake configuration in the repo. This will be a challenge, but very cool nonetheless!
    }

    if (!!page && page !== "blob" && page !== "tree") {
      return new Response(
        "Only blob and tree pages are supported. More coming soon.",
        { status: 404 },
      );
    }

    // if (page === "blob") {
    //   const headers = access_token
    //     ? { Authorization: `token ${access_token}` }
    //     : undefined;

    //   const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${
    //     branch || "main"
    //   }/${path}`;

    //   const fileResponse = await fetch(fileUrl, { headers });

    //   if (!fileResponse.ok) {
    //     return new Response(await fileResponse.text(), {
    //       status: fileResponse.status,
    //     });
    //   }

    //   const contentType = fileResponse.headers.get("Content-Type");

    //   return new Response(fileResponse.body, {
    //     headers: { "Content-Type": contentType || "application/octet-stream" },
    //   });
    // }

    const crawler = getCrawler(request.headers.get("user-agent"));
    const isCrawler = !!crawler;
    const isBrowser = acceptHeader?.includes("text/html");
    const needHtml = isBrowser || isCrawler;

    const realMaxTokens =
      maxTokens && !isNaN(Number(maxTokens))
        ? Number(maxTokens)
        : needHtml
        ? 50000
        : undefined;

    const realMaxFileSize =
      maxFileSize && !isNaN(Number(maxFileSize))
        ? Number(maxFileSize)
        : needHtml
        ? 25000
        : undefined;

    const branchPart = `/${page || "tree"}.${ext || "md"}${
      branch ? `/${branch}` : ""
    }`;

    const domain = owner.includes(".") ? owner : undefined;

    //convention will be following githubs archive url structure:

    //option 1:  https://github.com/janwilmake/fetch-each/archive/refs/heads/main.zip
    //option 2: https://github.com/janwilmake/forgithub/archive/b0f184426de0cc327f469b645a1c153a2c8ba869.zip

    const pipeUrl = `https://pipe.uithub.com/${owner}/${repo}${branchPart}${url.search}`;

    const urlObject = new URL(pipeUrl);
    // Add all parameters as search params
    if (realMaxTokens !== undefined) {
      urlObject.searchParams.append("maxTokens", realMaxTokens.toString());
    } else {
      urlObject.searchParams.delete("maxTokens");
    }

    if (realMaxFileSize !== undefined) {
      urlObject.searchParams.append("maxFileSize", realMaxFileSize.toString());
    } else {
      urlObject.searchParams.delete("maxFileSize");
    }

    if (
      !urlObject.searchParams.get("accept") ||
      urlObject.searchParams.get("accept") === "text/html"
    ) {
      // markdown by default, no html
      urlObject.searchParams.append("accept", "text/markdown");
    }

    if (path) {
      // add the path param
      urlObject.searchParams.append("basePath", path);
    }

    const headers: Record<string, string> = {
      Authorization: `Basic ${btoa(env.CREDENTIALS)}`,
    };

    if (access_token) {
      // as sponsorflare uses a github access token 1:1,
      // it can be used directly as github authorization when accessing the source
      headers["x-source-authorization"] = `token ${access_token}`;
    }

    const finalUrl = urlObject.toString();

    const ref = /^[0-9a-f]{40}$/i.test(branch)
      ? branch
      : // for our convention main should always be the default so this is fine.
        `refs/heads/${branch || "main"}`;

    const zipUrl = encodeURIComponent(
      domain
        ? `https://${domain}/${repo}/archive/refs/heads/${branch || "main"}.zip`
        : `https://github.com/${owner}/${repo}/archive/${
            branch ? ref : "HEAD"
          }.zip`,
    );
    const treeUrl = `https://ziptree.uithub.com/tree/${zipUrl}?type=token-tree&omitFirstSegment=true`;

    const t3 = Date.now();

    const ziptreeFetcher = env.UITHUB_ZIPTREE || {
      fetch: (url, init) => fetch(url, init),
    };
    // only get tree if we show HTML
    const treePromise = needHtml
      ? ziptreeFetcher
          .fetch(
            new Request(treeUrl, {
              headers: {
                ...headers,
                "Cache-Control": `max-age=86400, stale-while-revalidate=2592000, ${
                  access_token ? "private" : "public"
                }`,
              },
            }),
          )
          .then(async (res) => {
            if (!res.ok) {
              return {
                status: res.status,
                error: await res.text(),
                realBranch: undefined,
              };
            }

            const firstSegment = res.headers.get("x-first-segment");

            const realBranch = domain
              ? branch || "main"
              : firstSegment?.slice(repo.length + 1);

            return {
              tree: (await res.json()) as { __size: number },
              realBranch,
              status: res.status,
            };
          })
      : undefined;

    const response = await urlPipe.fetch(
      new Request(finalUrl, {
        headers,
      }),
      env,
    );

    if (!response.ok || !response.body) {
      const message = access_token
        ? `Pipe Not OK ${response.status} ${
            response.statusText
          } ${await response.text()}`
        : "Pipe not OK: Failed to fetch repository. If the repo is private, be sure to provide an Authorization header. Status:" +
          response.status +
          `\n\n${await response.text()}`;

      if ([401, 403, 404].includes(response.status) && acceptHtml) {
        const data = { owner_login, avatar_url, scope };
        return new Response(
          html404
            .replace("</pre>", message + "</pre>")
            .replace(
              "</body>",
              `<script>window.data = ${JSON.stringify(data)};</script></body>`,
            ),
          {
            headers: { "Content-Type": "text/html" },
            status: response.status,
          },
        );
      }
      return new Response(`${response.status} - ${message}`, {
        status: response.status,
      });
    }

    const contextString = await response.text();

    console.log("Content", Date.now() - t3, "ms");
    // we need the HTML for crawlers and the HTML for accept html.
    // Or if we still don't need json/yaml, we need raw text.
    if (!needHtml) {
      return new Response(contextString);
    }

    const treeResult = await treePromise;
    console.log("Tree", Date.now() - t3, "ms");

    if (!treeResult?.tree) {
      return new Response(
        "Tree error: " + (treeResult?.error || "Tree not provided"),
        { status: treeResult?.status || 500 },
      );
    }
    const tree = treeResult.tree;

    // Gather the data

    const currentTokens = Math.round(contextString.length / 500) * 100;
    const branchTitlePart = branch ? ` at ${branch}` : "";
    const title = `GitHub ${owner}/${repo} LLM Context`;
    const description = `Easily ask your LLM code questions about "${repo}". /${path}${branchTitlePart} on GitHub contains ${currentTokens} tokens.`;

    //
    const linkRest =
      page && branch
        ? `/${page}/${branch}${path === "" ? "" : `/${path}`}`
        : "";
    const linkPathPart = `${owner}/${repo}${linkRest}`;

    // keys that will be replaced in html looking for {{varname}}
    const template = {
      currentTokens,
      chatLink: `https://githuq.com/${linkPathPart}`,
      baseLink: domain
        ? `https://${linkPathPart}`
        : `https://github.com/${linkPathPart}`,
      baseName: repo,
      baseTokens: tree.__size,
      moreToolsLink: domain ? "#" : `https://forgithub.com/${linkPathPart}`,
      contextString: escapeHTML(contextString),
    };

    const pages = {
      issues: { title: "Issues", isPremium: false },
      pulls: { title: "Pull Requests", isPremium: false },
      discussions: { title: "Discussions", isPremium: false },
      swc: { title: "SWC", isPremium: true },
      typedoc: { title: "Typedoc", isPremium: true },
      x: { title: "X Threads", isPremium: true },
    };
    // TODO: set this to show warning
    const isTokensCapped = false;

    const isPaymentRequired =
      (balance || 0) <= 0 && !!pages[page as keyof typeof pages]?.isPremium;
    const data = {
      pages,
      isPaymentRequired,
      realBranch: treeResult.realBranch,
      isTokensCapped,
      tree,
      is_authenticated,
      owner_login,
      avatar_url,
      balance,
    };

    const ogImageUrl = `https://github-og-image.githuq.workers.dev/${owner}/${repo}?path=${path}&tokens=${currentTokens}`;

    const finalHtml = fillTemplate(viewHtml, template)
      .replace(
        "</body>",
        `<script>window.data = ${JSON.stringify(data)};</script></body>`,
      )
      .replace(
        "<title></title>",
        `<title>${title}</title>
          <meta name="description" content="${description}" />
          <meta name="keywords" content="GitHub, LLM, context, code, developer tools" />
          <meta name="author" content="Code From Anywhere" />
          <meta name="robots" content="index, follow" />
          
          <!-- Facebook Meta Tags -->
      <meta property="og:url" content="${url.toString()}" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${ogImageUrl}" />
          <meta property="og:image:alt" content="${description}"/>
          <meta property="og:image:width" content="1200"/>
          <meta property="og:image:height" content="600"/>
      
      
      <!-- Twitter Meta Tags -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="uithub.com" />
      <meta property="twitter:url" content="${url.toString()}" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${ogImageUrl}" />
      
      `,
      );

    return new Response(finalHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        // recommended seucrity headers by claude against XSS
        "X-XSS-Protection": "1; mode=block",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  },
};

const getCrawler = (userAgent: string | null) => {
  const crawlers = [
    { name: "Facebook", userAgentRegex: /facebookexternalhit|Facebot/ },
    { name: "Twitter", userAgentRegex: /Twitterbot/ },
    { name: "LinkedIn", userAgentRegex: /LinkedInBot/ },
    { name: "Slack", userAgentRegex: /Slackbot-LinkExpanding/ },
    { name: "Discord", userAgentRegex: /Discordbot/ },
    { name: "WhatsApp", userAgentRegex: /WhatsApp/ },
    { name: "Telegram", userAgentRegex: /TelegramBot/ },
    { name: "Pinterest", userAgentRegex: /Pinterest/ },
    { name: "Google", userAgentRegex: /Googlebot/ },
    { name: "Bing", userAgentRegex: /bingbot/ },
  ];
  const crawler = crawlers.find((item) =>
    item.userAgentRegex.test(userAgent || ""),
  )?.name;

  return crawler;
};

const respondProfilePage = async (
  originUrl: string,
  owner: string,
  accept?: string,
  apiKey?: string,
  refresh?: boolean,
) => {
  const chunks = owner.split(".");
  // overwrite owner if owner includes dot to only use the first segment
  owner = chunks.length ? chunks[0] : owner;

  const shouldRespondString = accept === "text/markdown" || chunks[1] === "md";
  const shouldRespondJson =
    accept === "application/json" || chunks[1] === "json";

  const url = new URL(`https://cache.forgithub.com/repos/${owner}`);
  if (apiKey) {
    url.searchParams.append("apiKey", apiKey);
  }

  if (refresh) {
    url.searchParams.append("refresh", "true");
  }

  const repos = await fetch(url.toString());

  const json: any[] = repos.ok ? await repos.json() : [];

  if (!repos.ok) {
    return new Response(`${owner} not found`, { status: 200 });
  }

  const data = {
    owner: { login: owner },
    repos: json.map(
      (item: {
        stargazers_count: string;
        description: string;
        archived: boolean;
        private: boolean;
        name: string;
        default_branch: string;
      }) => ({
        name: item.name,
        href: `/${owner}/${item.name}/tree/${item.default_branch}`,
        stargazers_count: item.stargazers_count,
        description: item.description,
        archived: item.archived,
        private: item.private,
      }),
    ),
  };

  if (shouldRespondJson) {
    return new Response(JSON.stringify(data, undefined, 2), {
      headers: { "content-type": "application/json" },
    });
  }

  if (shouldRespondString) {
    return new Response(
      `# ${owner}'s repos (${data.repos.length}):\n\n${data.repos
        .map(
          (repo) =>
            `- ${repo.name} (${repo.stargazers_count} stars${
              repo.archived ? " archived " : ""
            }${repo.private ? " private" : ""}) ${repo.description || ""}`,
        )
        .join("\n")}`,
      {
        status: 200,
        headers: { "Content-Type": "text/markdown;charset=utf8" },
      },
    );
  }

  return new Response(
    profileHtml.replace(
      "const data = undefined;",
      `const data = ${JSON.stringify(data)};`,
    ),
    {
      status: 200,
      headers: { "Content-Type": "text/html;charset=utf8" },
    },
  );
};

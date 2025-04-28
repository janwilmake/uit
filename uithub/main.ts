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
import html404 from "./public/404.html";
import html429 from "./public/429.html";
import { RatelimitDO } from "./ratelimiter.js";
export { SponsorDO } from "sponsorflare";
export { RatelimitDO } from "./ratelimiter.js";
import { Plugin, ResponseTypeEnum, router, StandardURL } from "./router.js";
import { escapeHTML, getIndex } from "./homepage.js";
interface Env {
  RATELIMIT_DO: DurableObjectNamespace<RatelimitDO>;
  GITHUB_PAT: string;
  CREDENTIALS: string;
  UITHUB_ZIPTREE: { fetch: typeof fetch };
}

const fillTemplate = (html: string, template: { [key: string]: any }) => {
  return Object.keys(template).reduce((html, key) => {
    const value = template[key];
    return html.replaceAll(`{{${key}}}`, value);
  }, html);
};

export default {
  fetch: async (request: Request, env: Env, context: any) => {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return getIndex();
    }

    if (url.pathname === "/archive.zip") {
      // convention; by exposing the zip of the repo at this path, anyone can find your code at https://uithub.com/{domain}/public, even from a private repo if we pass the PAT!
      return fetch(
        `https://github.com/janwilmake/uit/archive/refs/heads/main.zip`,
      );
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
      ? // Logged out should get 5 requests per hour, then login first.
        5
      : (balance || 0) > 0
      ? 1000
      : (balance || 0) < -1
      ? // after spending more than a dollar, ratelimit is 10 per hour
        10
      : // for now 100 per hour max until I got pricing
        100;

    console.log("middleware 1:", Date.now() - t + "ms");

    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
      "127.0.0.1";

    const ratelimited = await env.RATELIMIT_DO.get(
      env.RATELIMIT_DO.idFromName("v2." + clientIp),
    ).checkRateLimit({
      requestLimit,
      resetIntervalMs: 3600 * 1000,
    });

    console.log("middleware 2:", Date.now() - t + "ms", {
      requestLimit,
      ratelimited,
    });

    const acceptHtml = request.headers.get("accept")?.includes("text/html");
    const TEST_RATELIMIT_PAGE = false;
    const hasWaitTime = (ratelimited?.waitTime || 0) > 0;
    const hasNegativeBalance = !balance || balance < 0;
    // console.log({ requestLimit, ratelimited, hasWaitTime, hasNegativeBalance });
    if ((hasWaitTime && hasNegativeBalance) || TEST_RATELIMIT_PAGE) {
      if (acceptHtml) {
        return new Response(
          html429.replace(
            "</body>",
            `<script>window.data = ${JSON.stringify({
              owner_login,
              avatar_url,
              balance,
              ratelimitHeaders: ratelimited?.headers,
            })};</script></body>`,
          ),
          {
            status: 429,
            headers: {
              "Content-Type": "text/html;charset=utf8",
              ...ratelimited?.headers,
            },
          },
        );
      }

      // can only exceed ratelimit if balance is negative
      return new Response(
        "Ratelimit exceeded\n\n" + ratelimited?.headers
          ? JSON.stringify(ratelimited?.headers, undefined, 2)
          : undefined,
        {
          status: 429,
          headers: { ...ratelimited?.headers },
        },
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Basic ${btoa(env.CREDENTIALS)}`,
    };

    if (access_token) {
      // as sponsorflare uses a github access token 1:1
      // it can be used directly as github authorization when accessing the source
      headers["x-source-authorization"] = `token ${access_token}`;
    }

    const { error, status, result } = await router(request);

    if (!result || error) {
      return new Response(error || "Something went wrong with routing", {
        status,
      });
    }

    const { domain, plugin, standardUrl, responseType, needHtml } = result;

    const {
      sourceUrl,
      sourceType,
      primarySourceSegment,
      basePath,
      ext,
      pluginId,
      secondarySourceSegment,
      description,
      ogImageUrl,
      title,
    } = standardUrl;
    if (!sourceType || !sourceUrl || sourceType !== "zip") {
      return new Response("Source not found", { status: 404 });
    }

    const treeUrl = `https://ziptree.uithub.com/tree/${sourceUrl}?type=token-tree&omitFirstSegment=true`;

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

            // This didn't work in
            const firstSegment = res.headers.get("x-first-segment");

            const realBranch = domain
              ? "main"
              : firstSegment?.slice(
                  // NB: This is a bit annoying, but the first segment actually differs for authenticated repos via the authenticated api
                  access_token
                    ? primarySourceSegment.length + 2
                    : primarySourceSegment.split("/")[0].length + 1,
                );

            return {
              tree: (await res.json()) as { __size: number },
              realBranch,
              status: res.status,
            };
          })
      : undefined;

    const maxTokens = url.searchParams.get("maxTokens") || undefined;
    const maxFileSize = url.searchParams.get("maxFileSize") || undefined;

    const realMaxTokens =
      maxTokens && !isNaN(Number(maxTokens))
        ? Number(maxTokens)
        : needHtml
        ? 50000
        : undefined;

    const realMaxFileSize =
      maxFileSize && !isNaN(Number(maxFileSize))
        ? Number(maxFileSize)
        : undefined;

    const searchParams = new URLSearchParams({});

    // Add all parameters as search params
    if (realMaxTokens !== undefined) {
      searchParams.append("maxTokens", realMaxTokens.toString());
    } else {
      searchParams.delete("maxTokens");
    }

    if (realMaxFileSize !== undefined) {
      searchParams.append("maxFileSize", realMaxFileSize.toString());
    } else {
      searchParams.delete("maxFileSize");
    }

    if (
      !searchParams.get("accept") ||
      searchParams.get("accept") === "text/html"
    ) {
      // markdown by default, no html
      searchParams.append("accept", "text/markdown");
    }

    if (basePath) {
      // add the path param
      searchParams.append("basePath", basePath);
    }

    const response = await pipeResponse({
      url,
      plugin,
      standardUrl,
      responseType,
      CREDENTIALS: env.CREDENTIALS,
      sourceAuthorization: access_token ? `token ${access_token}` : undefined,
    });

    if (!response.ok || !response.body) {
      const message = access_token
        ? `Pipe Not OK ${response.status} ${
            response.statusText
          } ${await response.text()}`
        : "Pipe not OK: Failed to fetch repository. If the repo is private, be sure to provide an Authorization header. Status:" +
          response.status +
          `\n\n${await response.text()}`;

      if (acceptHtml) {
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

    if (responseType === "zip") {
      // special output: zip
      return new Response(response.body, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="formdata.zip"',
        },
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

    // keys that will be replaced in html looking for {{varname}}
    const template = {
      currentTokens,
      baseLink: `https://${domain}/${primarySourceSegment}`,
      baseName: primarySourceSegment,
      baseTokens: tree.__size,
      moreToolsLink: domain
        ? "#"
        : `https://forgithub.com/${primarySourceSegment}`,
      contextString: escapeHTML(contextString),
    };

    // TODO: set this to show warning
    const isTokensCapped = false;

    const data = {
      isPaymentRequired: false,
      realBranch: treeResult.realBranch,
      isTokensCapped,
      tree,
      is_authenticated,
      owner_login,
      avatar_url,
      balance,
    };

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
      <meta name="twitter:image" content="${ogImageUrl}" />`,
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

/**
 * Processes an array of URLs by removing search parameters, combining them,
 * and concatenating the origins in reverse order with the combined search string.
 *
 * @param urls Array of URL strings to process
 * @returns A single URL string with origins concatenated and combined search params
 */
function processUrls(urls: string[]): string {
  // Initialize collections
  const cleanUrls: string[] = [];
  const searchParams = new URLSearchParams();

  // Process each URL
  urls.forEach((urlString) => {
    try {
      const url = new URL(urlString);

      // Extract and combine search params
      url.searchParams.forEach((value, key) => {
        searchParams.append(key, value);
      });

      // Create clean URL without search params
      const cleanUrl = `${url.origin}${url.pathname}`;
      cleanUrls.push(cleanUrl);
    } catch (error) {
      console.error(`Invalid URL: ${urlString}`, error);
    }
  });

  // Reverse origins and join with '/'
  const combinedOrigins = cleanUrls.reverse().join("");

  // Create the final URL string with combined search params
  const searchString = searchParams.toString();
  const finalUrl = searchString
    ? `${combinedOrigins}?${searchString}`
    : combinedOrigins;

  return finalUrl;
}

const pipeResponse = async (context: {
  url: URL;
  plugin?: Plugin;
  standardUrl: StandardURL;
  responseType: ResponseTypeEnum;
  CREDENTIALS: string;
  sourceAuthorization?: string;
}) => {
  const {
    url,
    sourceAuthorization,
    CREDENTIALS,
    plugin,
    responseType,
    standardUrl: {
      primarySourceSegment,
      basePath,
      ext,
      pluginId,
      secondarySourceSegment,
      sourceType,
      sourceUrl,
      rawUrlPrefix,
    },
  } = context;

  if (sourceType !== "zip") {
    return new Response("Source type not supported yet: " + sourceType, {
      status: 400,
    });
  }

  if (plugin?.type === "ingest") {
    return new Response(
      `\n\nIngest plugins use should use ingestjson.uithub.com so we need to make that (plugin = ${plugin.title})`,
      {
        status: 400,
      },
    );
  }

  if (plugin?.type === "api") {
    return new Response(
      `API plugins should transform every file that fits the description. Sicko!`,
      { status: 400 },
    );
  }

  const rawUrlPrefixPart = rawUrlPrefix ? `&rawUrlPrefix=${rawUrlPrefix}` : "";
  const omitBinaryPart = responseType === "zip" ? "" : `&omitBinary=true`;
  const ingestUrl = `https://ingestzip.uithub.com/${sourceUrl}?omitFirstSegment=true${rawUrlPrefixPart}${omitBinaryPart}`;

  const outputUrl = {
    zip: "https://outputzip.uithub.com",
    json: "https://outputjson.uithub.com",
    yaml: undefined, //"https://outputyaml.uithub.com",
    md: "https://outputmd.uithub.com",
    txt: undefined,
  }[responseType];

  const searchParams = new URLSearchParams(url.searchParams);

  if (basePath) {
    searchParams.append("basePath", "/" + basePath);
  }

  const shadowTransformUrl = plugin?.endpoint;

  const searchUrl = `https://search.uithub.com/?${searchParams.toString()}`;

  const urls = [
    ingestUrl,
    // formdata -> formdata
    searchUrl,
    // formdata -> formdata
    shadowTransformUrl,
    // formdata -> any
    outputUrl,
  ]
    .filter((x) => !!x)
    .map((x) => x!);

  if (!urls || urls.length === 0) {
    return new Response("No base paths provided", { status: 400 });
  }

  const fullUrl = processUrls(urls);

  const headers: { [key: string]: string } = {
    Authorization: `Basic ${btoa(CREDENTIALS)}`,
  };

  if (sourceAuthorization) {
    headers["x-source-authorization"] = sourceAuthorization;
  }

  console.log({
    ingestUrl,
    searchUrl,
    shadowTransformUrl,
    outputUrl,
    fullUrl,
    sourceAuthorization,
  });

  // Make a single request to the nested URL
  const response = await fetch(fullUrl, { headers });

  if (!response.ok) {
    return new Response(
      `URL Pipe request failed with status: ${
        response.status
      }\n\n${await response.text()}`,
      { status: response.status },
    );
  }

  return response;
};

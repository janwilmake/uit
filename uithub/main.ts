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
import { withAssetsKV } from "cloudflare-assets-kv";
import { getSponsor, middleware } from "sponsorflare";
import viewHtml from "./static/vscode.html";
import html404 from "./static/404.html";
import html429 from "./static/429.html";
import { RatelimitDO } from "./ratelimiter.js";
import { router } from "./routers/router.js";
import { escapeHTML, updateIndex } from "./homepage.js";
import { buildTree, TreeObject } from "./buildTree.js";
import { uithubMiddleware } from "./uithubMiddleware.js";
import { StandardURL, OutputType, Plugin } from "./routers/types.js";
export { SponsorDO } from "sponsorflare";
export { RatelimitDO } from "./ratelimiter.js";

interface Env {
  RATELIMIT_DO: DurableObjectNamespace<RatelimitDO>;
  GITHUB_PAT: string;
  CREDENTIALS: string;
  UITHUB_ASSETS_KV: KVNamespace;
  UITHUB_ZIPTREE: { fetch: typeof fetch };
}

const fillTemplate = (html: string, template: { [key: string]: any }) => {
  return Object.keys(template).reduce((html, key) => {
    const value = template[key];
    return html.replaceAll(`{{${key}}}`, value);
  }, html);
};

const requestHandler = async (request: Request, env: Env, context: any) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") || "";

  const uithubResponse = await uithubMiddleware(
    request,
    (request) => requestHandler(request, env, context),
    // where the root of this domain is found
    "/janwilmake/uit/tree/main/uithub",
    env.CREDENTIALS,
  );

  if (uithubResponse) {
    return uithubResponse;
  }

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
    access_token,
    scope,
    spent,
    charged,
  } = await getSponsor(
    request,
    env as any,
    // 1-1000th of a cent
    //{ charge: 0.001, allowNegativeClv: true },
  );

  const requestLimit = !is_authenticated
    ? // Logged out should get 5 requests per hour, then login first.
      50
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

  // console.log("middleware 2:", Date.now() - t + "ms", {
  //   requestLimit,
  //   ratelimited,
  // });

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
        headers: {
          ...ratelimited?.headers,
          "WWW-Authenticate":
            'Bearer realm="uithub service",' +
            'error="rate_limit_exceeded",' +
            'error_description="Rate limit exceeded. Please login at https://uithub.com/login to get a personal access token for higher limits"',
        },
      },
    );
  }

  if (userAgent.startsWith("git/")) {
    // bypass router, directly go into the git service with the same request but as formData
    const searchParams = url.searchParams;
    searchParams.set("accept", "multipart/form-data");
    const uploadPackUrl =
      "https://output-git-upload-pack.uithub.com/" +
      "https://uuithub.com" +
      url.pathname +
      "?" +
      searchParams.toString();
    return fetch(uploadPackUrl, {
      headers: { Authorization: `Basic ${btoa(env.CREDENTIALS)}` },
    });
  }

  const { error, status, result } = await router(request);

  if (!result || error) {
    return new Response(error || "Something went wrong with routing", {
      status,
    });
  }

  const { domain, plugin, standardUrl, outputType, needHtml } = result;

  const {
    // To load source
    sourceUrl,
    sourceType,

    // FOR HTML
    title,
    description,
    ogImageUrl,

    baseLink,
    moreToolsLink,
    // URL BUILDUP
    primarySourceSegment,
    pluginId,
    ext,
    secondarySourceSegment,
    basePath,
  } = standardUrl;

  if (!sourceType || !sourceUrl) {
    return new Response("Source not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    Authorization: `Basic ${btoa(env.CREDENTIALS)}`,
  };

  if (access_token) {
    // as sponsorflare uses a github access token 1:1
    // it can be used directly as github authorization when accessing the source
    headers["x-source-authorization"] = `token ${access_token}`;
  }

  //   const treeUrl = `https://ziptree.uithub.com/tree/${sourceUrl}?type=token-tree&omitFirstSegment=true`;

  const t3 = Date.now();

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

  const sourceAuthorization =
    domain === "news.ycombinator.com"
      ? `Bearer ${env.CREDENTIALS}`
      : access_token
      ? `token ${access_token}`
      : undefined;

  const {
    response,
    outputUrl,
    headers: outputHeaders,
  } = await pipeResponse({
    url,
    plugin,
    standardUrl,
    outputType,
    CREDENTIALS: env.CREDENTIALS,
    sourceAuthorization,

    // whether or not to immediately include piping output
    pipeOutput: outputType === "zip" || !needHtml,
  });

  const contentType = response.headers.get("content-type");
  if (!response.ok || !response.body || !contentType) {
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

  if (!outputUrl) {
    // directly output response if no further processing is required

    // either zip or non-html
    return response;
  }

  /**
   * We need HTML!
   * 1. tee repsonse.body
   * 3. use first copy + outputUrl to get output format
   * 2. use second copy to build tree
   */
  const [formDataBody, treeBody] = response.body.tee();

  // use first copy and outputUrl to get output format
  const contextStringPromise = fetch(outputUrl, {
    body: formDataBody,
    headers: outputHeaders,
    method: "POST",
  }).then(async (response) => {
    if (!response.ok) {
      return `Not ok (${response.status}) - ${await response.text()}`;
    }
    return response.text();
  });

  console.log("Initial formData response", Date.now() - t3, "ms");

  const treePromise = buildTree(treeBody, contentType);

  const [contextString, treeResult]: [string, TreeObject] = await Promise.all([
    contextStringPromise,
    treePromise,
  ]);

  console.log("Tree", Date.now() - t3, "ms");

  if (!treeResult) {
    return new Response("Tree error: Tree not provided", { status: 500 });
  }

  // Gather the data

  const prettyTokens = (count: number) => {
    if (count < 100) {
      return count;
    }
    if (count < 1000) {
      return Math.round(count / 100) * 100;
    }
    if (count < 10000) {
      return String(Math.round((count / 1000) * 10) / 10) + "k";
    }
    if (count < 1000000) {
      return String(Math.round(count / 1000)) + "k";
    }
    return String(Math.round(count / 100000) / 10) + "M";
  };

  const currentTokens = prettyTokens(contextString.length / 5);
  const baseTokens = prettyTokens(treeResult["/"]?.tokens);

  const baseName = [primarySourceSegment, secondarySourceSegment]
    .filter((x) => !!x)
    .join("/");

  // keys that will be replaced in html looking for {{varname}}
  const template = {
    currentTokens,
    baseLink: baseLink || "#",
    baseName,
    baseTokens,
    moreToolsLink: moreToolsLink || "#",
    contextString: escapeHTML(contextString),
  };

  // TODO: set this to show warning
  const isTokensCapped = false;

  const data = {
    isPaymentRequired: false,
    isTokensCapped,
    tree: treeResult,
    is_authenticated,
    owner_login,
    avatar_url,
    balance,
    baseName,

    domain,
    primarySourceSegment,
    pluginId,
    ext,
    secondarySourceSegment,
    basePath,
  };

  // this is it
  const pathname = `/${primarySourceSegment}/${pluginId || "tree"}${
    ext ? `.${ext}` : ""
  }${secondarySourceSegment ? `/${secondarySourceSegment}` : ""}${
    basePath ? `/${basePath}` : ""
  }`;

  const replacedHtml = viewHtml
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

  const finalHtml = fillTemplate(replacedHtml, template);
  return new Response(finalHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      // recommended seucrity headers by claude against XSS
      "X-XSS-Protection": "1; mode=block",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      // Strong Content Security Policy to prevent any script execution
      //  "Content-Security-Policy":
      //    "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'; form-action 'self'; base-uri 'self';",
    },
  });
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
  outputType: OutputType;
  CREDENTIALS: string;
  sourceAuthorization?: string;
  pipeOutput?: boolean;
}) => {
  const {
    url,
    sourceAuthorization,
    CREDENTIALS,
    plugin,
    outputType,
    pipeOutput,
    standardUrl: {
      omitFirstSegment,
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

  const rawUrlPrefixPart = rawUrlPrefix ? `&rawUrlPrefix=${rawUrlPrefix}` : "";
  const omitBinaryPart = outputType === "zip" ? "" : `&omitBinary=true`;
  const genignoreQuery = url.searchParams.get("genignore");
  const genignorePart = `&genignore=${
    genignoreQuery === "false" ? false : true
  }`;
  const omitFirstSegmentPart = `?omitFirstSegment=${
    omitFirstSegment ? "true" : "false"
  }`;

  let ingestUrl: string | undefined =
    sourceType === "zip"
      ? `https://ingestzip.uithub.com/${sourceUrl}${omitFirstSegmentPart}${genignorePart}${rawUrlPrefixPart}${omitBinaryPart}`
      : sourceType === "tar"
      ? `https://ingesttar.uithub.com/${sourceUrl}${omitFirstSegmentPart}${genignorePart}${rawUrlPrefixPart}${omitBinaryPart}`
      : sourceType === "json"
      ? `https://ingestjson.uithub.com/${sourceUrl}${omitFirstSegmentPart}${genignorePart}${rawUrlPrefixPart}${omitBinaryPart}`
      : sourceType === "sql"
      ? `https://ingestsql.uithub.com/${sourceUrl}`
      : undefined;
  if (!plugin) {
    // no plugin. good
  } else if (plugin?.type === "ingest") {
    const ingestEndpoint = plugin.endpoint
      .replace("{primarySourceSegment}", primarySourceSegment)
      .replace("{secondarySourceSegment}", secondarySourceSegment || "")
      .replace("{basePath}", basePath || "");
    ingestUrl = `https://ingestjson.uithub.com/${ingestEndpoint}`;
  } else if (plugin?.type === "transform-formdata") {
    //
  } else {
    const response = new Response(
      `Plugin with type ${plugin?.type} not supported yet!`,
      { status: 400 },
    );
    return { response };
  }

  if (!ingestUrl) {
    const response = new Response(
      `Could not find ingest url of source type ${sourceType}!`,
      { status: 400 },
    );
    return { response };
  }

  const outputUrl = {
    git: undefined,
    // git: "https://output-git-upload-pack.uithub.com",
    zip: "https://outputzip.uithub.com",
    json: "https://outputjson.uithub.com",
    yaml: undefined, //"https://outputyaml.uithub.com",
    md: "https://outputmd.uithub.com",
    txt: undefined,
  }[outputType];

  const searchParams = new URLSearchParams(url.searchParams);

  // genignore is customised
  searchParams.delete("genignore");

  if (basePath) {
    searchParams.append("basePath", "/" + basePath);
  }

  const shadowTransformUrl =
    plugin?.type === "transform-formdata" ? plugin?.endpoint : undefined;

  const searchUrl = `https://search.uithub.com/?${searchParams.toString()}`;

  const urls = [
    // any -> formdata
    ingestUrl,
    // formdata -> formdata
    searchUrl,
    // formdata -> formdata
    shadowTransformUrl,
    // formdata -> any
    pipeOutput ? outputUrl : undefined,
  ]
    .filter((x) => !!x)
    .map((x) => x!);

  if (!urls || urls.length === 0) {
    const response = new Response("No base paths provided", { status: 400 });
    return { response };
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
    sourceAuthorization,
    fullUrl,
    standardUrl: context.standardUrl,
  });

  // Make a single request to the nested URL
  const response = await fetch(fullUrl, { headers });

  if (!response.ok) {
    const finalResponse = new Response(
      `URL Pipe request failed with status: ${
        response.status
      }\n\n${await response.text()}`,
      { status: response.status },
    );
    return { response: finalResponse };
  }

  if (pipeOutput) {
    return { response };
  }

  return {
    response,
    outputUrl,
    headers: {
      ...headers,
      "content-type": response.headers.get("content-type")!,
    },
  };
};

export default {
  scheduled: async (event: any, env: Env, ctx: any) => {
    await updateIndex(env.UITHUB_ASSETS_KV);
  },
  fetch: withAssetsKV(requestHandler, { kvNamespace: "UITHUB_ASSETS_KV" }),
};

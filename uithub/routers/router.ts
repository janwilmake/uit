import github from "./github.js";
import npmjs from "./npmjs.js";
import x from "./github.js";
import defaultFetcher from "./github.js";
import ycombinatorNews from "./ycombinator.news.js";

import plugins from "../static/plugins.json" assert { type: "json" };
import domains from "../static/domains.json" assert { type: "json" };
import { getAuthorization } from "sponsorflare";
import { OutputType, Plugin, StandardURL } from "./types.js";

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

/**
 * Router that takes a request and parses it to determine the URL structure
 *
 * The goal is to have a domain-specific router for every domain where the path is mapped to:
 * - a source file (zip, json, or other)
 * - a plugin
 * - a base path
 */
export const router = async (
  request: Request,
): Promise<{
  status: number;
  error?: string;
  result?: {
    standardUrl: StandardURL;
    domain: string;
    plugin?: Plugin;
    outputType: OutputType;
    needHtml: boolean;
  };
}> => {
  const { access_token } = getAuthorization(request);
  const url = new URL(request.url);
  const ownerOrDomain = url.pathname.split("/")[1];
  const isDomain = ownerOrDomain.includes(".");
  const domain = isDomain ? ownerOrDomain : "github.com";
  const pathname = isDomain
    ? url.pathname.split("/").slice(1).join("/")
    : url.pathname;
  const userAgent = request.headers.get("user-agent");
  const isGit = userAgent?.startsWith("git/");

  // NB: later, routers can be made fully decoupled and come from a centralised file for external proxies
  const item: { mirrorBasePath: string } | undefined =
    domains[domain as keyof typeof domains];

  const fetcher =
    domain === "github.com"
      ? github.fetch
      : domain === "npmjs.com"
      ? npmjs.fetch
      : domain === "news.ycombinator.com"
      ? ycombinatorNews.fetch
      : domain === "x.com"
      ? x.fetch
      : defaultFetcher.fetch;

  const response = await fetcher(
    new Request(`https://${domain}` + pathname, {
      headers: {
        "X-IS-AUTHENTICATED": String(!!access_token),
        "X-DOMAIN": domain,
      },
    }),
  );

  if (!response.ok) {
    return { status: response.status, error: await response.text() };
  }

  const standardUrl: StandardURL = await response.json();

  const acceptQuery = url.searchParams.get("accept");

  const acceptHeader = request.headers.get("Accept");
  const accept = acceptQuery || acceptHeader || undefined;
  const crawler = getCrawler(userAgent);
  const isCrawler = !!crawler;
  const isBrowser = acceptHeader?.includes("text/html");

  const isZip = standardUrl.ext === "zip" || accept === "application/zip";
  const isFormData =
    standardUrl.ext === "txt" || accept === "multipart/form-data";
  const isJson = standardUrl.ext === "json" || accept === "application/json";
  const isYaml = standardUrl.ext === "yaml" || accept === "text/yaml";
  const isMd = standardUrl.ext === "md" || accept === "text/markdown";

  const outputType = isGit
    ? "git"
    : isZip
    ? "zip"
    : isJson
    ? "json"
    : isYaml
    ? "yaml"
    : isFormData
    ? "txt"
    : isMd
    ? "md"
    : // default md
      "md";

  const needHtml = (isBrowser || isCrawler) && !isZip;

  const plugin = plugins.plugins[
    standardUrl.pluginId as keyof typeof plugins.plugins
  ] as Plugin | undefined;

  const realPlugin = plugin && !plugin.disabled ? plugin : undefined;

  return {
    status: 200,
    result: {
      standardUrl,
      domain,
      needHtml,
      outputType,
      plugin: realPlugin,
    },
  };
};

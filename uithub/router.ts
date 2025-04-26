import github from "./github.js";
import plugins from "./public/plugins.json" assert { type: "json" };
import { getAuthorization } from "sponsorflare";

// todo: to be generated from plugin.schema.json
export type Plugin = {
  title: string;
  domain: string;
  type: "formdata-transformer" | "ingest" | "api";
  description: string;
  endpoint: string;
  source: string;
};

export type StandardURL = {
  primarySourceSegment: string;
  pluginId?: string;
  secondarySourceSegment?: string;
  basePath?: string;
  ext?: string;
  sourceType?: string;
  sourceUrl?: string;
  ogImageUrl?: string;
  title?: string;
  description?: string;
  rawUrlPrefix?: string;
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

export type ResponseTypeEnum = "zip" | "txt" | "json" | "yaml" | "md";
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
    responseType: ResponseTypeEnum;
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

  if (domain !== "github.com") {
    // TODO: use `domains.json` as source of truth for this
    return { status: 404, error: "This domain isn't available yet" };
  }

  const response = await github.fetch(
    new Request("https://router.uithub.com" + pathname, {
      headers: { "X-IS-AUTHENTICATED": String(!!access_token) },
    }),
  );
  if (!response.ok) {
    return { status: response.status, error: await response.text() };
  }
  const standardUrl: StandardURL = await response.json();

  const acceptQuery = url.searchParams.get("accept");
  const acceptHeader = request.headers.get("Accept");
  const accept = acceptQuery || acceptHeader || undefined;
  const crawler = getCrawler(request.headers.get("user-agent"));
  const isCrawler = !!crawler;
  const isBrowser = acceptHeader?.includes("text/html");

  const isZip = standardUrl.ext === "zip" || accept === "application/zip";
  const isFormData =
    standardUrl.ext === "txt" || accept === "multipart/form-data";
  const isJson = standardUrl.ext === "json" || accept === "application/json";
  const isYaml = standardUrl.ext === "yaml" || accept === "text/yaml";
  const isMd = standardUrl.ext === "md" || accept === "text/markdown";

  const responseType = isZip
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

  return {
    status: 200,
    result: {
      standardUrl,
      domain,
      plugin,
      needHtml,
      responseType,
    },
  };
};

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

export async function urlPipe(
  paths: string[],
  sourceAuthorization: string | null,
  env: any,
): Promise<Response> {
  if (!paths || paths.length === 0) {
    return new Response("No base paths provided", { status: 400 });
  }

  const fullUrl = processUrls(paths);

  const headers: { [key: string]: string } = {
    Authorization: `Basic ${btoa(env.CREDENTIALS)}`,
  };

  if (sourceAuthorization) {
    headers["x-source-authorization"] = sourceAuthorization;
  }

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
}

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const [ownerOrDomain, id, pageAndExt, branch, ...pathParts] = url.pathname
      .split("/")
      .slice(1);
    const sourceAuthorization = request.headers.get("x-source-authorization");

    const [page, ext] = (pageAndExt || "").split(".");

    if (!ownerOrDomain || !id) {
      return new Response("Usage: /owner/repo or /domain.tld/id");
    }

    const isDomain = ownerOrDomain.includes(".");

    console.log({ isDomain, branch, pathParts });

    const ref =
      branch && /^[0-9a-f]{40}$/i.test(branch)
        ? branch
        : // for our convention main should always be the default so this is fine.
          `refs/heads/${branch || "main"}`;

    // TODO: This logic can be better. IDK Yet How to conventionalize.
    const archiveUrl = isDomain
      ? `https://${ownerOrDomain}/${id}/archive/${ref}.zip`
      : `https://github.com/${ownerOrDomain}/${id}/archive/${
          branch ? `${ref}.zip` : "HEAD.zip"
        }`;

    console.log({ archiveUrl });
    // TODO: the sha can be found in the zip actually, so this isn't great!
    const rawUrlPrefix = `https://raw.githubusercontent.com/${ownerOrDomain}/${id}/${ref}`;
    const referToBinary = true;

    const rawUrlPrefixPart = referToBinary
      ? `&rawUrlPrefix=${rawUrlPrefix}`
      : "";
    const ingestUrl = `https://ingestzip.uithub.com/${archiveUrl}?omitFirstSegment=true${rawUrlPrefixPart}`;
    const outputUrl =
      ext === "zip"
        ? "https://outputzip.uithub.com"
        : ext === "md"
        ? "https://outputmd.uithub.com"
        : ext === "json"
        ? "https://outputjson.uithub.com"
        : ext === "yaml"
        ? "https://outputyaml.uithub.com"
        : undefined;

    const searchParams = new URLSearchParams(url.searchParams);

    if (pathParts.length) {
      searchParams.append("basePath", "/" + pathParts.join("/"));
    }

    const shadowTransformUrl =
      page === "swc" ? "https://swc.uithub.com" : undefined;

    const searchUrl = `https://search.uithub.com/?${searchParams.toString()}`;
    console.log({ ingestUrl, searchUrl, shadowTransformUrl, outputUrl });
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

    // Example usage of urlPipe
    const response = await urlPipe(urls, sourceAuthorization, env);

    // Return the final response to the client
    return response;
  },
};

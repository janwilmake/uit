/** Middleware function (later to be extracted) to add some uithub parsings based off the source of this domain to the worker */
export const uithubMiddleware = (
  request: Request,
  fetcher: (request: Request) => Promise<Response>,
  pathname: string,
) => {
  const url = new URL(request.url);
  const accept = request.headers.get("accept");
  const userAgent = request.headers.get("user-agent") || "";

  if (url.pathname === "/llms.txt") {
    //
  }
  if (url.pathname === "/llms-full.txt") {
    //
  }
  if (url.pathname === "/tree.json") {
    //
  }

  if (
    userAgent.startsWith("git/") &&
    (url.pathname === "/info/refs" || url.pathname === "/git-upload-pack")
  ) {
    // git clone https://uithub.com would clone the repo of the site
    return fetcher(
      new Request(`https://uuithub.com/${pathname}` + url.pathname, {
        headers: { "user-agent": userAgent },
      }),
    );
  }

  if (
    url.pathname === "/archive.zip" ||
    (url.pathname === "/" && accept?.startsWith("application/zip"))
  ) {
    // convention; by exposing the zip of the repo at this path, anyone can find your code at https://uithub.com/{domain}/public, even from a private repo if we pass the PAT!
    return fetch(`https://uuithub.com/${pathname}`, {
      headers: { accept: "application/zip" },
    });
  }
};

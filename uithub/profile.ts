import profileHtml from "./static/profile.html";
/** To be replaced with actual uithub page */
export const respondProfilePage = async (
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

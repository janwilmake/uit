import html from "./index.html";

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

export const getIndex = async () => {
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

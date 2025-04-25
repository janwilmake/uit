// plugins.js - Handles the plugins panel content with installation management
document.addEventListener("DOMContentLoaded", function () {
  const pluginsContent = document.getElementById("plugins-content");

  // Fetch plugins data from /plugins.json
  async function fetchPlugins() {
    try {
      const response = await fetch("/plugins.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.status}`);
      }
      const data = await response.json();
      return data.plugins || {};
    } catch (error) {
      console.error("Error fetching plugins:", error);
      return {};
    }
  }

  // Get pinned plugins from localStorage
  function getPinnedPlugins() {
    const pinned = localStorage.getItem("installed");
    return pinned ? JSON.parse(pinned) : [];
  }

  // Save pinned plugins to localStorage
  function savePinnedPlugins(pinned) {
    localStorage.setItem("installed", JSON.stringify(pinned));
  }

  // Pin a plugin
  function pinPlugin(pluginId) {
    const pinned = getPinnedPlugins();
    if (!pinned.includes(pluginId)) {
      pinned.push(pluginId);
      savePinnedPlugins(pinned);
      return true;
    }
    return false;
  }

  // Unpin a plugin
  function unpinPlugin(pluginId) {
    const pinned = getPinnedPlugins();
    const index = pinned.indexOf(pluginId);
    if (index !== -1) {
      pinned.splice(index, 1);
      savePinnedPlugins(pinned);
      return true;
    }
    return false;
  }

  // Extract owner and repo from current URL
  function getOwnerAndRepo() {
    const path = window.location.pathname.split("/");
    // Check if we have at least two segments after the leading slash
    if (path.length >= 3) {
      return {
        owner: path[1],
        repo: path[2],
      };
    }
    return { owner: "", repo: "" };
  }

  // Create a plugin card with icon, title, description, and pin/unpin button
  function createPluginCard(pluginId, plugin, isPinned) {
    const card = document.createElement("div");
    card.className =
      "plugin-card p-3 pr-0 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 relative";

    // Create top row container (icon, title)
    const topRow = document.createElement("div");
    topRow.className = "flex items-center mb-1";

    // Create icon placeholder (will be updated async)
    const iconContainer = document.createElement("div");
    iconContainer.className =
      "flex-shrink-0 w-8 h-8 mr-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center";

    // Title container (with flex-grow to push button to right)
    const titleContainer = document.createElement("div");
    titleContainer.className = "flex-grow min-w-0";

    const visitPlugin = function (e) {
      e.stopPropagation(); // Prevent event bubbling

      const { owner, repo } = getOwnerAndRepo();
      if (owner && repo) {
        window.location.href = `/${owner}/${repo}/${pluginId}`;
      }
    };
    // Plugin title
    const title = document.createElement("h3");
    title.className =
      "cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100 truncate";
    title.textContent = plugin.title;
    title.addEventListener("click", visitPlugin);

    titleContainer.appendChild(title);

    // Create navigate button (main CTA)
    const navigateButton = document.createElement("button");
    navigateButton.className =
      "ml-2 flex-shrink-0 p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100";
    navigateButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
    navigateButton.title = "Navigate to plugin";

    // Add event listener to navigate button
    navigateButton.addEventListener("click", visitPlugin);

    // Description row (full width)
    const descriptionContainer = document.createElement("div");
    descriptionContainer.className = "mt-1 pl-10"; // Add left padding to align with the title

    // Plugin description
    const description = document.createElement("p");
    description.className = "text-xs text-gray-600 dark:text-gray-400";
    description.textContent = plugin.description;

    descriptionContainer.appendChild(description);

    // Create pin/unpin button
    const pinButton = document.createElement("button");
    pinButton.className =
      "pin-button absolute bottom-2 right-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300";

    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="pin-icon">
          <!-- Pin icon -->
          <path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 5C6.5 4.44772 6.94772 4 7.5 4H9H15H16.5C17.0523 4 17.5 4.44772 17.5 5C17.5 5.55228 17.0523 6 16.5 6H16.095L16.9132 15H19C19.5523 15 20 15.4477 20 16C20 16.5523 19.5523 17 19 17H16H13V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V17H8H5C4.44772 17 4 16.5523 4 16C4 15.4477 4.44772 15 5 15H7.08679L7.90497 6H7.5C6.94772 6 6.5 5.55228 6.5 5ZM9.91321 6L9.09503 15H12H14.905L14.0868 6H9.91321Z" />
          <!-- Cross line -->
          <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.5"></line>
        </svg>`;
    const unpinnedSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="pin-icon">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 5C6.5 4.44772 6.94772 4 7.5 4H9H15H16.5C17.0523 4 17.5 4.44772 17.5 5C17.5 5.55228 17.0523 6 16.5 6H16.095L16.9132 15H19C19.5523 15 20 15.4477 20 16C20 16.5523 19.5523 17 19 17H16H13V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V17H8H5C4.44772 17 4 16.5523 4 16C4 15.4477 4.44772 15 5 15H7.08679L7.90497 6H7.5C6.94772 6 6.5 5.55228 6.5 5ZM9.91321 6L9.09503 15H12H14.905L14.0868 6H9.91321Z" />
        </svg>
      `;
    // Pin icons - inline SVG for better compatibility
    if (isPinned) {
      // Crossed pin icon for installed plugins (to uninstall)
      pinButton.innerHTML = pinSvg;
      pinButton.title = "Unpin plugin";
    } else {
      // Regular pin icon for uninstalled plugins
      pinButton.innerHTML = unpinnedSvg;
      pinButton.title = "Pin plugin";
    }

    // Add event listener to pin button
    pinButton.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent event bubbling

      // Get the current pinned state from the data attribute
      const currentlyPinned = card.getAttribute("data-pinned") === "true";

      if (currentlyPinned) {
        // Handle unpinning
        const wasUnpinned = unpinPlugin(pluginId);

        if (wasUnpinned) {
          // Update button appearance with regular pin icon
          pinButton.innerHTML = unpinnedSvg;
          pinButton.title = "Pin plugin";
          card.setAttribute("data-pinned", "false");

          // Move card to directory section
          const directorySection = document.getElementById("directory-plugins");
          directorySection.appendChild(card);
        }
      } else {
        // Handle pinning
        const wasPinned = pinPlugin(pluginId);

        if (wasPinned) {
          // Update button appearance with crossed pin icon
          pinButton.innerHTML = pinSvg;
          pinButton.title = "Unpin plugin";
          card.setAttribute("data-pinned", "true");

          // Move card to pinned section
          const pinnedSection = document.getElementById("installed-plugins");
          pinnedSection.appendChild(card);
        }
      }

      // Update counters and empty states
      updateCountersAndEmptyStates();
    });

    // Assemble the top row
    topRow.appendChild(iconContainer);
    topRow.appendChild(titleContainer);
    topRow.appendChild(navigateButton);

    // Assemble the card
    card.appendChild(topRow);
    card.appendChild(descriptionContainer);
    card.appendChild(pinButton);

    card.setAttribute("data-id", pluginId);
    card.setAttribute("data-pinned", isPinned.toString());

    // Try to load the plugin icon
    // First check if plugin.icon is available
    if (plugin.icon) {
      // Use the provided icon
      const img = document.createElement("img");
      img.src = plugin.icon;
      img.className = "w-full h-full object-cover";
      iconContainer.innerHTML = "";
      iconContainer.appendChild(img);
    } else {
      // Use first letter of plugin ID in a circle
      iconContainer.innerHTML = "";
      iconContainer.className +=
        " text-gray-700 dark:text-gray-300 font-semibold text-lg";
      iconContainer.textContent = pluginId.charAt(0).toUpperCase();
    }

    return card;
  }

  // Function to update counters and empty states
  function updateCountersAndEmptyStates() {
    const installedSection = document.getElementById("installed-plugins");
    const directorySection = document.getElementById("directory-plugins");

    // Count pinned and directory plugins
    const installedCount =
      installedSection.querySelectorAll(".plugin-card").length;
    const directoryCount =
      directorySection.querySelectorAll(".plugin-card").length;

    // Update counters
    document.getElementById(
      "installed-count",
    ).textContent = `(${installedCount})`;
    document.getElementById(
      "directory-count",
    ).textContent = `(${directoryCount})`;

    // Update empty state messages
    const installedEmptyState = document.getElementById("installed-empty");
    const directoryEmptyState = document.getElementById("directory-empty");

    if (installedEmptyState) {
      installedEmptyState.style.display =
        installedCount === 0 ? "block" : "none";
    }

    if (directoryEmptyState) {
      directoryEmptyState.style.display =
        directoryCount === 0 ? "block" : "none";
    }
  }

  // Render all plugins based on current state
  async function renderPlugins() {
    // Get the containers
    const installedSection = document.getElementById("installed-plugins");
    const directorySection = document.getElementById("directory-plugins");

    // Clear existing content
    installedSection.innerHTML = `
        <div id="installed-empty" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          No plugins pinned yet
        </div>
      `;

    directorySection.innerHTML = `
        <div id="directory-empty" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          No plugins available
        </div>
      `;

    // Get plugins and pinned status
    const plugins = await fetchPlugins();
    const pinned = getPinnedPlugins();

    // Create and place cards in their respective sections
    let installedCount = 0;
    let directoryCount = 0;

    for (const pluginId in plugins) {
      const plugin = plugins[pluginId];
      const isPinned = pinned.includes(pluginId);
      const card = createPluginCard(pluginId, plugin, isPinned);

      if (isPinned) {
        installedSection.appendChild(card);
        installedCount++;
      } else {
        directorySection.appendChild(card);
        directoryCount++;
      }
    }

    // Update empty state visibility
    document.getElementById("installed-empty").style.display =
      installedCount === 0 ? "block" : "none";
    document.getElementById("directory-empty").style.display =
      directoryCount === 0 ? "block" : "none";

    // Update counters
    document.getElementById(
      "installed-count",
    ).textContent = `(${installedCount})`;
    document.getElementById(
      "directory-count",
    ).textContent = `(${directoryCount})`;
  }

  // Initialize the plugins panel
  async function initPluginsPanel() {
    // Create the initial HTML structure
    pluginsContent.innerHTML = `
          <div class="flex flex-col justify-center mb-4">
            <h2 class="text-sm font-semibold uppercase">Plugins</h2>
            <p>Coming soon</p>
  
          </div>
          
          <!-- Pinned Plugins Section -->
          <div class="mb-6">
            <div class="flex items-center mb-2">
              <h3 class="text-sm font-medium">Pinned <span id="installed-count">(0)</span></h3>
              <button id="toggle-installed" class="ml-auto text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-down">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div id="installed-plugins" class="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
              <div id="installed-empty" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                No plugins pinned yet
              </div>
            </div>
          </div>
          
          <!-- Directory Section -->
          <div class="mb-6">
            <div class="flex items-center mb-2">
              <h3 class="text-sm font-medium">Directory <span id="directory-count">(0)</span></h3>
              <button id="toggle-directory" class="ml-auto text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-down">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div id="directory-plugins" class="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
              <div id="directory-empty" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                No plugins available
              </div>
            </div>
          </div>
        `;

    // Add CSS to ensure panels scroll properly and for pin button styling
    const style = document.createElement("style");
    style.textContent = `
          #plugins-content {
            overflow-y: auto;
            max-height: calc(100vh - 40px);
          }
          #installed-plugins, #directory-plugins {
            overflow-x: auto;
            max-width: 100%;
          }
          .plugin-card {
            min-width: 220px;
            transition: all 0.2s ease-in-out;
          }
          .pin-button {
            z-index: 10;
            opacity: 0.6;
            transition: opacity 0.2s ease-in-out;
          }
          .pin-button:hover {
            opacity: 1;
          }
          .pin-icon {
            pointer-events: none;
          }
        `;
    document.head.appendChild(style);

    // Add event listeners for section toggles
    document
      .getElementById("toggle-installed")
      .addEventListener("click", function () {
        const container = document.getElementById("installed-plugins");
        const icon = this.querySelector("svg");

        if (container.style.display === "none") {
          container.style.display = "block";
          icon.classList.remove("rotate-180");
        } else {
          container.style.display = "none";
          icon.classList.add("rotate-180");
        }
      });

    document
      .getElementById("toggle-directory")
      .addEventListener("click", function () {
        const container = document.getElementById("directory-plugins");
        const icon = this.querySelector("svg");

        if (container.style.display === "none") {
          container.style.display = "block";
          icon.classList.remove("rotate-180");
        } else {
          container.style.display = "none";
          icon.classList.add("rotate-180");
        }
      });

    // Render the plugins
    await renderPlugins();
  }

  // Initialize the plugins panel
  initPluginsPanel();
});

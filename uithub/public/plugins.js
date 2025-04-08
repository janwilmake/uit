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

  // Get installed plugins from localStorage
  function getInstalledPlugins() {
    const installed = localStorage.getItem("installed");
    return installed ? JSON.parse(installed) : [];
  }

  // Save installed plugins to localStorage
  function saveInstalledPlugins(installed) {
    localStorage.setItem("installed", JSON.stringify(installed));
  }

  // Install a plugin
  function installPlugin(pluginId) {
    const installed = getInstalledPlugins();
    if (!installed.includes(pluginId)) {
      installed.push(pluginId);
      saveInstalledPlugins(installed);
      return true;
    }
    return false;
  }

  // Uninstall a plugin
  function uninstallPlugin(pluginId) {
    const installed = getInstalledPlugins();
    const index = installed.indexOf(pluginId);
    if (index !== -1) {
      installed.splice(index, 1);
      saveInstalledPlugins(installed);
      return true;
    }
    return false;
  }

  // Check if an image exists
  async function imageExists(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Create a plugin card with icon, title, description, and install/uninstall button
  function createPluginCard(pluginId, plugin, isInstalled) {
    const card = document.createElement("div");
    card.className =
      "plugin-card p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";

    // Create top row container (icon, title, button)
    const topRow = document.createElement("div");
    topRow.className = "flex items-center mb-1";

    // Create icon placeholder (will be updated async)
    const iconContainer = document.createElement("div");
    iconContainer.className =
      "flex-shrink-0 w-8 h-8 mr-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center";

    // Try to load the favicon or create letter circle
    const hostname = new URL(plugin.url).hostname;
    const iconUrl = `https://${hostname}/apple-touch-icon.png`;

    // Title container (with flex-grow to push button to right)
    const titleContainer = document.createElement("div");
    titleContainer.className = "flex-grow min-w-0";

    // Plugin title
    const title = document.createElement("h3");
    title.className =
      "text-sm font-medium text-gray-900 dark:text-gray-100 truncate";
    title.textContent = plugin.title;

    titleContainer.appendChild(title);

    // Create install/uninstall button
    const button = document.createElement("button");
    button.className = isInstalled
      ? "ml-2 flex-shrink-0 text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
      : "ml-2 flex-shrink-0 text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800";
    button.textContent = isInstalled ? "Uninstall" : "Install";

    // Add event listener to button
    button.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent event bubbling

      // Get the current installed state from the button text
      const currentlyInstalled = button.textContent === "Uninstall";

      if (currentlyInstalled) {
        // Handle uninstallation
        const wasUninstalled = uninstallPlugin(pluginId);

        if (wasUninstalled) {
          // Update button appearance
          button.textContent = "Install";
          button.className =
            "ml-2 flex-shrink-0 text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800";
          card.setAttribute("data-installed", "false");

          // Move card to directory section
          const directorySection = document.getElementById("directory-plugins");
          directorySection.appendChild(card);
        }
      } else {
        // Handle installation
        const wasInstalled = installPlugin(pluginId);

        if (wasInstalled) {
          // Update button appearance
          button.textContent = "Uninstall";
          button.className =
            "ml-2 flex-shrink-0 text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800";
          card.setAttribute("data-installed", "true");

          // Move card to installed section
          const installedSection = document.getElementById("installed-plugins");
          installedSection.appendChild(card);
        }
      }

      // Update counters and empty states
      updateCountersAndEmptyStates();
    });

    // Description row (full width)
    const descriptionContainer = document.createElement("div");
    descriptionContainer.className = "mt-1 pl-10"; // Add left padding to align with the title

    // Plugin description
    const description = document.createElement("p");
    description.className = "text-xs text-gray-600 dark:text-gray-400";
    description.textContent = plugin.description;

    descriptionContainer.appendChild(description);

    // Assemble the top row
    topRow.appendChild(iconContainer);
    topRow.appendChild(titleContainer);
    topRow.appendChild(button);

    // Assemble the card
    card.appendChild(topRow);
    card.appendChild(descriptionContainer);

    card.setAttribute("data-id", pluginId);
    card.setAttribute("data-installed", isInstalled.toString());

    // Check if icon exists and update the iconContainer
    imageExists(iconUrl).then((exists) => {
      if (exists) {
        // Use the apple-touch-icon
        const img = document.createElement("img");
        img.src = iconUrl;
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
    });

    return card;
  }

  // Function to update counters and empty states
  function updateCountersAndEmptyStates() {
    const installedSection = document.getElementById("installed-plugins");
    const directorySection = document.getElementById("directory-plugins");

    // Count installed and directory plugins
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
          No plugins installed yet
        </div>
      `;

    directorySection.innerHTML = `
        <div id="directory-empty" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          No plugins available
        </div>
      `;

    // Get plugins and installed status
    const plugins = await fetchPlugins();
    const installed = getInstalledPlugins();

    // Create and place cards in their respective sections
    let installedCount = 0;
    let directoryCount = 0;

    for (const pluginId in plugins) {
      const plugin = plugins[pluginId];
      const isInstalled = installed.includes(pluginId);
      const card = createPluginCard(pluginId, plugin, isInstalled);

      if (isInstalled) {
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
          
          <!-- Installed Plugins Section -->
          <div class="mb-6">
            <div class="flex items-center mb-2">
              <h3 class="text-sm font-medium">Installed <span id="installed-count">(0)</span></h3>
              <button id="toggle-installed" class="ml-auto text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-down">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div id="installed-plugins" class="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
              <div id="installed-empty" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                No plugins installed yet
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

    // Add CSS to ensure panels scroll properly
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

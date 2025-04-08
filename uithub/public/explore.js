// explore.js - Handles the file explorer panel content
document.addEventListener("DOMContentLoaded", function () {
  const filesContent = document.getElementById("files-content");
  // Track file visibility state - using localStorage
  let showFiles = localStorage.getItem("showFiles") === "true";

  const prettyTokens = (count) => {
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

  // Extract repository path information from URL
  function getRepoPathInfo() {
    const path = window.location.pathname;
    const pathRegex = /^\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?(?:\/(.*))?$/;
    const match = path.match(pathRegex);

    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: match[3] || window.data.realBranch || "main",
        path: match[4] || "",
        isBlob: path.includes("/blob/"),
      };
    }

    // Default fallback if URL doesn't match expected pattern
    return {
      owner: "",
      repo: "",
      branch: window.data.realBranch || "main",
      path: "",
      isBlob: false,
    };
  }

  // Calculate default expansion level based on current path
  function getDefaultExpansionLevel() {
    return 1; // Only expand the first level by default
  }

  // Create and populate the explorer content
  function loadExplorerContent() {
    const repoInfo = getRepoPathInfo();
    const defaultExpandLevel = getDefaultExpansionLevel();

    filesContent.innerHTML = `
        <div class="flex items-center mb-4">
          <h2 class="text-sm font-semibold uppercase">Explorer</h2>
          <div class="ml-auto flex">
            <button id="copy-tree-btn" class="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 mr-2" title="Copy File Tree">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button id="toggle-files-btn" class="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="Toggle Files">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="${
                  showFiles ? "currentColor" : "#9CA3AF"
                }" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </button>
          </div>
        </div>
  
        <!-- Folder structure -->
        <div class="folder-structure overflow-x-auto">
          ${renderTree(
            window.data.tree,
            "project-root",
            0,
            "",
            defaultExpandLevel,
            repoInfo,
            showFiles,
          )}
        </div>
      `;

    // Add event listener for toggle files button
    document
      .getElementById("toggle-files-btn")
      .addEventListener("click", function () {
        showFiles = !showFiles;
        localStorage.setItem("showFiles", showFiles); // Save to localStorage
        loadExplorerContent(); // Reload the entire explorer with new showFiles state
      });

    // Add event listener for copy tree button
    document
      .getElementById("copy-tree-btn")
      .addEventListener("click", function () {
        const treeData = JSON.stringify(window.data.tree, undefined, 2);
        navigator.clipboard.writeText(treeData).then(
          function () {
            // Create and show a tooltip for feedback
            const tooltip = document.createElement("div");
            tooltip.textContent = "Copied!";
            tooltip.style.position = "absolute";
            tooltip.style.left = this.offsetLeft + this.offsetWidth + 5 + "px";
            tooltip.style.top = this.offsetTop + "px";
            tooltip.style.background = "#333";
            tooltip.style.color = "#fff";
            tooltip.style.padding = "5px";
            tooltip.style.borderRadius = "3px";
            tooltip.style.fontSize = "12px";
            tooltip.style.zIndex = "1000";
            document.body.appendChild(tooltip);

            setTimeout(() => {
              document.body.removeChild(tooltip);
            }, 2000);
          },
          function () {
            console.error("Failed to copy tree data");
          },
        );
      });

    // Add event listeners for folder collapse/expand
    document.querySelectorAll(".folder-toggle").forEach((toggle) => {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        const folderId = this.dataset.folderId;
        const folderContent = document.getElementById(folderId);
        const isExpanded = folderContent.classList.contains("block");

        // Toggle visibility
        if (isExpanded) {
          folderContent.classList.remove("block");
          folderContent.classList.add("hidden");
          this.classList.remove("rotate-90");
        } else {
          folderContent.classList.remove("hidden");
          folderContent.classList.add("block");
          this.classList.add("rotate-90");
        }
      });
    });

    // Add event listeners for folder navigation
    document.querySelectorAll(".folder-item").forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        const path = this.dataset.path;
        const repoInfo = getRepoPathInfo();

        // Preserve query parameters when navigating
        const queryParams = window.location.search;
        const url = `/${repoInfo.owner}/${repoInfo.repo}/tree/${repoInfo.branch}/${path}${queryParams}`;
        window.location.href =
          url.replace(/\/+/g, "/").replace(/\/+$/, "") +
          (queryParams ? "" : queryParams);
      });
    });

    // Add event listeners for file navigation
    document.querySelectorAll(".file-item").forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        const path = this.dataset.path;
        const repoInfo = getRepoPathInfo();

        // Preserve query parameters when navigating
        const queryParams = window.location.search;
        const url = `/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.branch}/${path}${queryParams}`;
        window.location.href =
          url.replace(/\/+/g, "/").replace(/\/+$/, "") +
          (queryParams ? "" : queryParams);
      });
    });
  }

  // Check if a tree node has subdirectories
  function hasSubdirectories(tree) {
    if (!tree || typeof tree !== "object") return false;

    for (const key in tree) {
      if (key === "__size") continue;
      if (typeof tree[key] === "object" && tree[key].__size !== undefined) {
        return true;
      }
    }
    return false;
  }

  // Check if a tree node has files
  function hasFiles(tree) {
    if (!tree || typeof tree !== "object") return false;

    for (const key in tree) {
      if (key === "__size") continue;
      if (typeof tree[key] === "number") {
        return true;
      }
    }
    return false;
  }

  // Check if a path is within the current active path
  function isInActivePath(itemPath, activePath) {
    if (!itemPath || !activePath) return false;

    // For direct match
    if (itemPath === activePath) return true;

    // For parent paths - itemPath is a parent of activePath
    if (activePath.startsWith(itemPath + "/")) return true;

    return false;
  }

  // Check if path is relevant to the current view
  function isRelevantPath(itemPath, activePath) {
    if (!activePath) return true; // Show everything when no active path

    // If itemPath is within the active path, it's relevant
    if (isInActivePath(itemPath, activePath)) return true;

    // If the active path is within itemPath, it's not relevant
    if (itemPath.startsWith(activePath + "/")) return true;

    // Otherwise the path is not relevant to current view
    return false;
  }

  // Recursive function to render the tree structure
  function renderTree(
    tree,
    name,
    level,
    currentPath,
    defaultExpandLevel,
    repoInfo,
    showFiles,
  ) {
    if (!tree || typeof tree !== "object") return "";

    // Skip rendering if it's not a directory (doesn't have __size)
    if (tree.__size === undefined) return "";

    // Calculate the full path for this item
    const path = currentPath
      ? `${currentPath}/${name}`
      : name === "project-root"
      ? ""
      : name;

    // Generate a unique ID for this folder
    const folderId = `folder-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;

    // Determine if this folder should be expanded by default
    // Only expand if:
    // 1. It's a top-level folder (level < defaultExpandLevel) OR
    // 2. It's in the current path
    const isInCurrentPath = isInActivePath(path, repoInfo.path);
    const shouldExpandByDefault = level < defaultExpandLevel || isInCurrentPath;

    // Get the current expanded state class
    const expandedStateClass = shouldExpandByDefault ? "block" : "hidden";
    const arrowClass = shouldExpandByDefault ? "rotate-90" : "";

    // Check if this folder has subdirectories or files
    const hasSubfolders = hasSubdirectories(tree);
    const hasOnlyFiles = !hasSubfolders && hasFiles(tree);
    const isExpandable = hasSubfolders || (showFiles && hasOnlyFiles);

    // Determine if this folder is active or relevant to current path
    const isActive = isInActivePath(path, repoInfo.path);
    const isRelevant = isRelevantPath(path, repoInfo.path);

    // Apply styling based on active state
    const activeFolderClass = isActive ? "text-purple-600 font-medium" : "";
    const inactiveFolderClass = !isRelevant ? "text-gray-500" : "";
    const folderClass = activeFolderClass || inactiveFolderClass;

    // Choose the appropriate icon based on expandability
    let folderIcon;
    if (isExpandable) {
      // Arrow icon for expandable folders
      folderIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     class="mr-1 transform transition-transform folder-toggle flex-shrink-0 min-w-4 ${arrowClass}" data-folder-id="${folderId}">
                     <polyline points="9 18 15 12 9 6"></polyline>
                   </svg>`;
    } else {
      // Regular folder icon for non-expandable folders
      folderIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     class="mr-1 flex-shrink-0 min-w-4">
                     <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                   </svg>`;
    }

    let html = `
        <div class="mb-2">
          <div class="flex items-center p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded ${folderClass}">
            ${folderIcon}
            <span class="whitespace-nowrap folder-item cursor-pointer ${folderClass}" data-path="${path}">${
      name === "project-root" ? repoInfo.repo : name
    }</span>
            ${
              tree.__size === 0
                ? ""
                : `<span class="ml-2 text-gray-500 text-sm whitespace-nowrap flex-shrink-0">(${prettyTokens(
                    tree.__size,
                  )})</span>`
            }
          </div>
      `;

    // Render subdirectories and files with proper indentation
    let children = `<div id="${folderId}" class="${expandedStateClass} transition-all">`;

    // First process directories
    for (const key in tree) {
      if (key === "__size") continue;

      const child = tree[key];
      // Only render if it's a directory (has __size property)
      if (typeof child === "object" && child.__size !== undefined) {
        children += `<div class="ml-4 mt-1">
            ${renderTree(
              child,
              key,
              level + 1,
              path,
              defaultExpandLevel,
              repoInfo,
              showFiles,
            )}
          </div>`;
      }
    }

    // Then process files (if showFiles is true)
    if (showFiles) {
      for (const key in tree) {
        if (key === "__size") continue;

        const child = tree[key];
        // Render files (values that are numbers)
        if (typeof child === "number") {
          const filePath = path ? `${path}/${key}` : key;

          // Determine if this file is the currently active one
          const isActiveFile = repoInfo.isBlob && repoInfo.path === filePath;
          const isRelevantFile = isRelevantPath(filePath, repoInfo.path);
          const fileActiveClass = isActiveFile
            ? "text-purple-600 font-medium"
            : "";
          const fileInactiveClass = !isRelevantFile ? "text-gray-500" : "";
          const fileClass = fileActiveClass || fileInactiveClass;

          children += `
            <div class="ml-4 mt-1">
              <div class="flex items-center p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded ${fileClass}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 flex-shrink-0 min-w-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="whitespace-nowrap file-item cursor-pointer ${fileClass}" data-path="${filePath}">${key}</span>
                ${
                  child === 0
                    ? ""
                    : `<span class="ml-2 text-gray-500 text-sm whitespace-nowrap flex-shrink-0">(${prettyTokens(
                        child,
                      )})</span>`
                }
              </div>
            </div>`;
        }
      }
    }

    html += children + "</div></div>";
    return html;
  }

  // Load the explorer content
  loadExplorerContent();
});

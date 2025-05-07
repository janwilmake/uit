// explore.js - Handles the file explorer panel content
document.addEventListener("DOMContentLoaded", function () {
  const filesContent = document.getElementById("files-content");
  // Track file visibility state - using localStorage
  let showFiles = localStorage.getItem("showFiles") === "true";

  // Get the current base path from window.data
  function getCurrentBasePath() {
    return window.data.basePath || "";
  }

  // Calculate default expansion level based on current path
  function getDefaultExpansionLevel() {
    return 1; // Only expand the first level by default
  }

  // Create and populate the explorer content
  function loadExplorerContent() {
    const currentBasePath = getCurrentBasePath();
    const defaultExpandLevel = getDefaultExpansionLevel();

    // Start with the explorer section
    let explorerHTML = `
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
        <div class="folder-structure overflow-x-auto mb-6">
          ${renderTree(
            processTreeData(window.data.tree),
            "project-root",
            0,
            "",
            defaultExpandLevel,
            currentBasePath,
            showFiles,
          )}
        </div>
      `;

    // Add navigation menu section if menu is present and not empty
    let navigationHTML = "";
    if (
      window.data.menu &&
      typeof window.data.menu === "object" &&
      Object.keys(window.data.menu).length > 0
    ) {
      navigationHTML = `
        <div class="mt-4">
          <div class="flex items-center mb-4">
            <h2 class="text-sm font-semibold uppercase">Navigate ${
              window.data.domain || ""
            }</h2>
          </div>
          
          <!-- Navigation menu -->
          <div class="navigation-menu overflow-x-auto">
            ${renderNavigationMenu(window.data.menu)}
          </div>
        </div>
      `;
    }

    // Combine both sections
    filesContent.innerHTML = explorerHTML + navigationHTML;

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

        // Preserve query parameters when navigating
        const queryParams = window.location.search;

        // Build URL with the primary and secondary segments
        let url = `/${window.data.primarySourceSegment}/${
          window.data.pluginId || "tree"
        }`;
        if (window.data.ext) {
          url += `.${window.data.ext}`;
        }
        if (window.data.secondarySourceSegment) {
          url += `/${window.data.secondarySourceSegment}`;
        }
        if (path) {
          url += `/${path}`;
        }

        window.location.href = url + queryParams;
      });
    });

    // Add event listeners for file navigation
    document.querySelectorAll(".file-item").forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        const path = this.dataset.path;

        // Preserve query parameters when navigating
        const queryParams = window.location.search;

        // Build URL with the primary and secondary segments
        // For files, we typically use "blob" or similar instead of "tree"
        let url = `/${window.data.primarySourceSegment}/blob`;
        if (window.data.ext) {
          url += `.${window.data.ext}`;
        }
        if (window.data.secondarySourceSegment) {
          url += `/${window.data.secondarySourceSegment}`;
        }
        if (path) {
          url += `/${path}`;
        }

        window.location.href = url + queryParams;
      });
    });

    // Add event listeners for navigation menu items
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        const pathname = this.dataset.pathname;
        if (pathname) {
          window.location.href = pathname;
        }
      });
    });
  }

  // Render navigation menu from window.data.menu
  function renderNavigationMenu(menu) {
    if (!menu || typeof menu !== "object") return "";

    let html = '<ul class="pl-1">';

    for (const pathname in menu) {
      if (!menu.hasOwnProperty(pathname)) continue;

      const title = menu[pathname];

      html += `
        <li class="mb-2">
          <div class="flex items-center p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 flex-shrink-0 min-w-4">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span class="whitespace-nowrap menu-item cursor-pointer" data-pathname="${pathname}">${title}</span>
          </div>
        </li>
      `;
    }

    html += "</ul>";
    return html;
  }

  // Process tree data into hierarchical structure
  function processTreeData(treeData) {
    if (!treeData || typeof treeData !== "object") return {};

    const processedTree = { __size: 0 };

    for (const path in treeData) {
      if (!treeData.hasOwnProperty(path)) continue;

      const item = treeData[path];
      const tokens = item.tokens || 0;
      const filtered = item.filtered || false;

      const isFolder = path.endsWith("/");
      const pathParts = path.split("/").filter((part) => part !== "");

      let current = processedTree;

      // For folders, process each part of the path
      if (isFolder) {
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (!current[part]) {
            current[part] = { __size: 0 };
          }
          current = current[part];
        }
        current.__size = tokens;
        current.__filtered = filtered;
      } else {
        // For files, add them to their parent folder
        if (pathParts.length === 0) {
          // This is a root file
          processedTree[path] = { tokens, filtered };
        } else {
          // Navigate to the parent folder
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!current[part]) {
              current[part] = { __size: 0 };
            }
            current = current[part];
          }
          // Add the file to its parent folder
          const fileName = pathParts[pathParts.length - 1];
          current[fileName] = { tokens, filtered };
        }
      }
    }

    return processedTree;
  }

  // Check if a tree node has subdirectories
  function hasSubdirectories(tree) {
    if (!tree || typeof tree !== "object") return false;

    for (const key in tree) {
      if (key === "__size" || key === "__filtered") continue;
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
      if (key === "__size" || key === "__filtered") continue;
      if (typeof tree[key] === "object" && tree[key].__size === undefined) {
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
    activePath,
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
    const isInCurrentPath = isInActivePath(path, activePath);
    const shouldExpandByDefault = level < defaultExpandLevel || isInCurrentPath;

    // Get the current expanded state class
    const expandedStateClass = shouldExpandByDefault ? "block" : "hidden";
    const arrowClass = shouldExpandByDefault ? "rotate-90" : "";

    // Check if this folder has subdirectories or files
    const hasSubfolders = hasSubdirectories(tree);
    const hasOnlyFiles = !hasSubfolders && hasFiles(tree);
    const isExpandable = hasSubfolders || (showFiles && hasOnlyFiles);

    // Determine if this folder is active or relevant to current path
    const isActive = isInActivePath(path, activePath);
    const isRelevant = isRelevantPath(path, activePath);
    const isFiltered = tree.__filtered === true;

    // Apply styling based on active state and filtered status
    const activeFolderClass = isActive ? "text-purple-600 font-medium" : "";
    const filteredClass = isFiltered ? "text-gray-500" : "";
    const inactiveFolderClass = !isRelevant ? "text-gray-500" : "";
    const folderClass =
      activeFolderClass || filteredClass || inactiveFolderClass;

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
      name === "project-root" ? window.data.baseName : name
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
      if (key === "__size" || key === "__filtered") continue;

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
              activePath,
              showFiles,
            )}
          </div>`;
      }
    }

    // Then process files (if showFiles is true)
    if (showFiles) {
      for (const key in tree) {
        if (key === "__size" || key === "__filtered") continue;

        const child = tree[key];
        // Render files (values that are objects without __size)
        if (typeof child === "object" && child.__size === undefined) {
          const filePath = path ? `${path}/${key}` : key;

          // Determine if this file is the currently active one
          const isActiveFile = activePath === filePath;
          const isRelevantFile = isRelevantPath(filePath, activePath);
          const isFileFiltered = child.filtered === true;

          const fileActiveClass = isActiveFile
            ? "text-purple-600 font-medium"
            : "";
          const fileFilteredClass = isFileFiltered ? "text-gray-500" : "";
          const fileInactiveClass = !isRelevantFile ? "text-gray-500" : "";
          const fileClass =
            fileActiveClass || fileFilteredClass || fileInactiveClass;

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
                  child.tokens === 0
                    ? ""
                    : `<span class="ml-2 text-gray-500 text-sm whitespace-nowrap flex-shrink-0">(${prettyTokens(
                        child.tokens,
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

  // Helper function to format token counts
  function prettyTokens(count) {
    if (typeof count !== "number") return "0";
    if (count === 0) return "0";
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + "k";
    return (count / 1000000).toFixed(1) + "M";
  }

  // Load the explorer content
  loadExplorerContent();
});

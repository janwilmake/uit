// search.js - Handles the search panel content with URL integration and specified filters
document.addEventListener("DOMContentLoaded", function () {
  const searchContent = document.getElementById("search-content");

  // Create and populate the search content
  function loadSearchContent() {
    searchContent.innerHTML = `
      <div class="flex items-center mb-4">
        <h2 class="text-sm font-semibold uppercase">Search</h2>
        <div class="ml-auto flex space-x-2">
          <button id="clear-filters-btn" class="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded hidden">
            Clear
          </button>
          <button id="apply-search-btn" class="text-xs px-2 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded hidden">
            Search
          </button>
        </div>
      </div>

      <div class="relative mb-2">
        <input type="text" id="search-input" placeholder="Search"
          class="w-full pl-8 pr-24 py-2 rounded-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:border focus:outline-none">
        
        <!-- Search icon on the left -->
        <div class="absolute left-2 top-2.5 search-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        
        <!-- Icons on the right -->
        <div class="absolute right-2 top-2.5 flex space-x-2">
          <!-- Match case icon -->
          <button id="match-case-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Match case">
            <svg width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.495 9.052l.891 2.35h1.091L6.237 3h-1.02L2 11.402h1.095l.838-2.35h3.562zM5.811 4.453l.044.135 1.318 3.574H4.255l1.307-3.574.044-.135.038-.156.032-.152.021-.126h.023l.024.126.029.152.038.156zm7.984 6.011v.936h.96V7.498c0-.719-.18-1.272-.539-1.661-.359-.389-.889-.583-1.588-.583-.199 0-.401.019-.606.056a4.875 4.875 0 0 0-1.078.326 2.081 2.081 0 0 0-.343.188v.984c.266-.23.566-.411.904-.54a2.927 2.927 0 0 1 1.052-.193c.188 0 .358.028.513.085a.98.98 0 0 1 .396.267c.109.121.193.279.252.472.059.193.088.427.088.7l-1.811.252c-.344.047-.64.126-.888.237a1.947 1.947 0 0 0-.615.419 1.6 1.6 0 0 0-.36.58 2.134 2.134 0 0 0-.117.721c0 .246.042.475.124.688.082.213.203.397.363.551.16.154.36.276.598.366.238.09.513.135.826.135.402 0 .76-.092 1.075-.278.315-.186.572-.454.771-.806h.023zm-2.128-1.743c.176-.064.401-.114.674-.149l1.465-.205v.609c0 .246-.041.475-.123.688a1.727 1.727 0 0 1-.343.557 1.573 1.573 0 0 1-.524.372 1.63 1.63 0 0 1-.668.135c-.187 0-.353-.025-.495-.076a1.03 1.03 0 0 1-.357-.211.896.896 0 0 1-.22-.316A1.005 1.005 0 0 1 11 9.732a1.6 1.6 0 0 1 .055-.44.739.739 0 0 1 .202-.334 1.16 1.16 0 0 1 .41-.237z"/></svg>
          </button>
          
          <!-- Match whole word icon -->
          <button id="match-word-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Match whole word">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" stroke="currentColor">
              <rect width="24" height="24" fill="none"/>
              <text x="3" y="16" font-family="Arial, sans-serif" font-size="14" font-weight="bold">a</text>
              <text x="13" y="16" font-family="Arial, sans-serif" font-size="14" font-weight="bold">b</text>
              <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          
          <!-- Regex icon -->
          <button id="regex-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Use regular expression">
            <svg width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.012 2h.976v3.113l2.56-1.557.486.885L11.47 6l2.564 1.559-.485.885-2.561-1.557V10h-.976V6.887l-2.56 1.557-.486-.885L9.53 6 6.966 4.441l.485-.885 2.561 1.557V2zM2 10h4v4H2v-4z"/></svg>
          </button>
        </div>
      </div>

      <!-- Files to include/exclude section (always visible) -->
      <div id="search-options" class="mt-4">
        <div class="mb-3">
          <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">files to include</div>
          <div class="relative">
            <input type="text" id="files-include"
              class="w-full py-2 px-3 rounded-sm dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-gray-600 focus:outline-none"
              placeholder="e.g. *.ts, src/*/include">
          </div>
        </div>

        <div class="mb-3">
          <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">files to exclude</div>
          <div class="relative">
            <input type="text" id="files-exclude"
              class="w-full py-2 px-3 rounded-sm dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-gray-600 focus:outline-none"
              placeholder="e.g. node_modules, *.test.js">
          </div>
        </div>
      </div>
    `;

    // Get DOM elements
    const searchInput = document.getElementById("search-input");
    const filesIncludeInput = document.getElementById("files-include");
    const filesExcludeInput = document.getElementById("files-exclude");
    const matchCaseBtn = document.getElementById("match-case-btn");
    const matchWordBtn = document.getElementById("match-word-btn");
    const regexBtn = document.getElementById("regex-btn");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const applySearchBtn = document.getElementById("apply-search-btn");

    // State variables
    let pendingChanges = false;
    let searchParams = {
      search: "",
      isCaseSensitive: false,
      isMatchWholeWord: false,
      isRegex: false,
      pathPatterns: [],
      excludePathPatterns: [],
    };

    // Load parameters from URL
    function loadSearchParamsFromURL() {
      const urlParams = new URLSearchParams(window.location.search);

      // Decode the search parameter if it exists
      if (urlParams.has("search")) {
        try {
          searchParams.search = atob(
            decodeURIComponent(urlParams.get("search")),
          );
          searchInput.value = searchParams.search;
        } catch (e) {
          console.error("Error decoding search parameter:", e);
        }
      }

      // Boolean parameters
      searchParams.isCaseSensitive =
        urlParams.get("isCaseSensitive") === "true";
      searchParams.isMatchWholeWord =
        urlParams.get("isMatchWholeWord") === "true";
      searchParams.isRegex = urlParams.get("isRegex") === "true";

      // Update toggle buttons
      if (searchParams.isCaseSensitive) toggleActiveButton(matchCaseBtn);
      if (searchParams.isMatchWholeWord) toggleActiveButton(matchWordBtn);
      if (searchParams.isRegex) toggleActiveButton(regexBtn);

      // Path patterns (could be arrays)
      if (urlParams.has("pathPatterns")) {
        searchParams.pathPatterns = urlParams.getAll("pathPatterns");
        filesIncludeInput.value = searchParams.pathPatterns.join(", ");
      }

      if (urlParams.has("excludePathPatterns")) {
        searchParams.excludePathPatterns = urlParams.getAll(
          "excludePathPatterns",
        );
        filesExcludeInput.value = searchParams.excludePathPatterns.join(", ");
      }

      // Show clear button if any filters are applied
      if (
        searchParams.search ||
        searchParams.isCaseSensitive ||
        searchParams.isMatchWholeWord ||
        searchParams.isRegex ||
        searchParams.pathPatterns.length > 0 ||
        searchParams.excludePathPatterns.length > 0
      ) {
        clearFiltersBtn.classList.remove("hidden");
      }
    }

    // Update URL with current search parameters without refreshing the page
    function updateURL(refresh = false) {
      const url = new URL(window.location.href);
      const urlParams = new URLSearchParams();

      // Only add parameters if they have values
      if (searchParams.search) {
        urlParams.set("search", encodeURIComponent(btoa(searchParams.search)));
      }

      if (searchParams.isCaseSensitive) {
        urlParams.set("isCaseSensitive", "true");
      }

      if (searchParams.isMatchWholeWord) {
        urlParams.set("isMatchWholeWord", "true");
      }

      if (searchParams.isRegex) {
        urlParams.set("isRegex", "true");
      }

      // Clear existing pathPatterns and excludePathPatterns
      urlParams.delete("pathPatterns");
      urlParams.delete("excludePathPatterns");

      // Add pathPatterns array if it exists
      if (searchParams.pathPatterns.length > 0) {
        searchParams.pathPatterns.forEach((pattern) => {
          urlParams.append("pathPatterns", pattern);
        });
      }

      // Add excludePathPatterns array if it exists
      if (searchParams.excludePathPatterns.length > 0) {
        searchParams.excludePathPatterns.forEach((pattern) => {
          urlParams.append("excludePathPatterns", pattern);
        });
      }

      // Update URL without refreshing
      const newUrl =
        url.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");

      if (refresh) {
        window.location.href = newUrl;
      } else {
        window.history.pushState({ path: newUrl }, "", newUrl);
        pendingChanges = true;
        applySearchBtn.classList.remove("hidden");
      }
    }

    // Parse comma-separated input into an array of trimmed values
    function parseCommaSeparatedInput(input) {
      if (!input.trim()) return [];
      return input
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
    }

    // Toggle active state for icon buttons
    function toggleActiveButton(button) {
      if (button.classList.contains("text-blue-500")) {
        button.classList.remove("text-blue-500");
        button.classList.add("text-gray-500", "dark:text-gray-400");
        return false;
      } else {
        button.classList.remove("text-gray-500", "dark:text-gray-400");
        button.classList.add("text-blue-500");
        return true;
      }
    }

    // Event handlers for search input
    searchInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        applySearch();
      } else {
        searchParams.search = this.value;
        updateURL();
      }
    });

    // Event handlers for include/exclude inputs
    filesIncludeInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        applySearch();
      } else {
        searchParams.pathPatterns = parseCommaSeparatedInput(this.value);
        updateURL();
      }
    });

    filesExcludeInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        applySearch();
      } else {
        searchParams.excludePathPatterns = parseCommaSeparatedInput(this.value);
        updateURL();
      }
    });

    // Toggle button click handlers
    matchCaseBtn.addEventListener("click", function () {
      searchParams.isCaseSensitive = toggleActiveButton(this);
      updateURL();
    });

    matchWordBtn.addEventListener("click", function () {
      searchParams.isMatchWholeWord = toggleActiveButton(this);
      updateURL();
    });

    regexBtn.addEventListener("click", function () {
      searchParams.isRegex = toggleActiveButton(this);
      updateURL();
    });

    // Clear all filters
    clearFiltersBtn.addEventListener("click", function () {
      // Reset all search params
      searchParams = {
        search: "",
        isCaseSensitive: false,
        isMatchWholeWord: false,
        isRegex: false,
        pathPatterns: [],
        excludePathPatterns: [],
      };

      // Reset UI
      searchInput.value = "";
      filesIncludeInput.value = "";
      filesExcludeInput.value = "";

      // Reset toggle buttons
      if (matchCaseBtn.classList.contains("text-blue-500")) {
        toggleActiveButton(matchCaseBtn);
      }
      if (matchWordBtn.classList.contains("text-blue-500")) {
        toggleActiveButton(matchWordBtn);
      }
      if (regexBtn.classList.contains("text-blue-500")) {
        toggleActiveButton(regexBtn);
      }

      // Update URL and refresh page
      updateURL(true);
    });

    // Apply search
    applySearchBtn.addEventListener("click", function () {
      applySearch();
    });

    function applySearch() {
      // Get current values from inputs
      searchParams.search = searchInput.value;
      searchParams.pathPatterns = parseCommaSeparatedInput(
        filesIncludeInput.value,
      );
      searchParams.excludePathPatterns = parseCommaSeparatedInput(
        filesExcludeInput.value,
      );

      // Update URL and refresh page
      updateURL(true);
    }

    // Focus styling for inputs
    searchInput.addEventListener("focus", function () {
      this.classList.add("ring-2", "ring-blue-500");
    });

    searchInput.addEventListener("blur", function () {
      this.classList.remove("ring-2", "ring-blue-500");
    });

    filesIncludeInput.addEventListener("focus", function () {
      this.classList.add("ring-2", "ring-blue-500");
    });

    filesIncludeInput.addEventListener("blur", function () {
      this.classList.remove("ring-2", "ring-blue-500");
    });

    filesExcludeInput.addEventListener("focus", function () {
      this.classList.add("ring-2", "ring-blue-500");
    });

    filesExcludeInput.addEventListener("blur", function () {
      this.classList.remove("ring-2", "ring-blue-500");
    });

    // Handle back/forward navigation
    window.addEventListener("popstate", function () {
      loadSearchParamsFromURL();
      pendingChanges = false;
      applySearchBtn.classList.add("hidden");
    });

    // Initialize by loading search params from URL
    loadSearchParamsFromURL();
  }

  // Load the search content
  loadSearchContent();
});

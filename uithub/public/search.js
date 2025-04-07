// search.js - Handles the search panel content with improved input field behavior
document.addEventListener("DOMContentLoaded", function () {
  const searchContent = document.getElementById("search-content");

  // Create and populate the search content
  function loadSearchContent() {
    searchContent.innerHTML = `
            <div class="flex items-center mb-4">
              <h2 class="text-sm font-semibold uppercase">Search</h2>
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
                  
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"  stroke="currentColor">
      <!-- Transparent background -->
      <rect width="24" height="24" fill="none"/>
      
      <!-- Text elements -->
      <text x="3" y="16" font-family="Arial, sans-serif" font-size="14" font-weight="bold">a</text>
      <text x="13" y="16" font-family="Arial, sans-serif" font-size="14" font-weight="bold">b</text>
      
      <!-- Underline beneath both letters -->
      <line x1="3" y1="18" x2="21" y2="18" stroke="#000" stroke-width="1.5"/>
    </svg>
                </button>
                
                <!-- Regex icon -->
                <button id="regex-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Use regular expression">
                  
    <svg width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.012 2h.976v3.113l2.56-1.557.486.885L11.47 6l2.564 1.559-.485.885-2.561-1.557V10h-.976V6.887l-2.56 1.557-.486-.885L9.53 6 6.966 4.441l.485-.885 2.561 1.557V2zM2 10h4v4H2v-4z"/></svg>
    
                </button>
              </div>
            </div>
      
            <!-- Ellipsis button for expanding options -->
            <div class="mb-4 flex justify-end">
              <button id="expand-options-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </button>
            </div>
      
            <!-- Files to include/exclude section (hidden by default) -->
            <div id="search-options" class="hidden">
              <div class="mb-3">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">files to include</div>
                <div class="relative">
                  <input type="text" id="files-include"
                    class="w-full py-2 px-3 rounded-sm dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-gray-600 focus:outline-none">
                  <div class="absolute right-2 top-2 help-icon hidden">
                    <button id="include-help-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
      
              <div class="mb-3">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">files to exclude</div>
                <div class="relative">
                  <input type="text" id="files-exclude"
                    class="w-full py-2 px-3 rounded-sm dark:bg-gray-800 dark:text-gray-100 dark:border dark:border-gray-600 focus:outline-none">
                  <div class="absolute right-2 top-2 help-icon hidden">
                    <button id="exclude-help-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
      
            
      
            <div class="mt-4">
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">SEARCH RESULTS</div>
              <!-- Empty results by default -->
              <div id="search-results" class="italic text-gray-500 dark:text-gray-400 text-sm">
                Type to start searching
              </div>
            </div>
          `;

    // Get DOM elements
    const searchInput = document.getElementById("search-input");
    const filesIncludeInput = document.getElementById("files-include");
    const filesExcludeInput = document.getElementById("files-exclude");
    const expandOptionsBtn = document.getElementById("expand-options-btn");
    const searchOptions = document.getElementById("search-options");
    const matchCaseBtn = document.getElementById("match-case-btn");
    const matchWordBtn = document.getElementById("match-word-btn");
    const regexBtn = document.getElementById("regex-btn");
    const includeHelpBtn = document.getElementById("include-help-btn");
    const excludeHelpBtn = document.getElementById("exclude-help-btn");

    // Get help icon containers
    const helpIcons = document.querySelectorAll(".help-icon");

    // Define placeholder texts
    const includeInputPlaceholder = "e.g. *.ts, src/*/include";
    const excludeInputPlaceholder = "e.g. node_modules, *.test.js";

    // Hide/show book icon based on input state
    function toggleHelpIcon(input, iconContainer) {
      if (input.value.trim() !== "" || document.activeElement === input) {
        iconContainer.classList.remove("hidden");
      } else {
        iconContainer.classList.add("hidden");
      }
    }

    // Add event listeners for the include input
    filesIncludeInput.addEventListener("focus", function () {
      const helpIcon = this.parentElement.querySelector(".help-icon");
      helpIcon.classList.remove("hidden");
      this.setAttribute("placeholder", includeInputPlaceholder);
    });

    filesIncludeInput.addEventListener("blur", function () {
      const helpIcon = this.parentElement.querySelector(".help-icon");
      if (this.value.trim() === "") {
        helpIcon.classList.add("hidden");
        this.removeAttribute("placeholder");
      }
    });

    filesIncludeInput.addEventListener("input", function () {
      const helpIcon = this.parentElement.querySelector(".help-icon");
      toggleHelpIcon(this, helpIcon);
    });

    // Add event listeners for the exclude input
    filesExcludeInput.addEventListener("focus", function () {
      const helpIcon = this.parentElement.querySelector(".help-icon");
      helpIcon.classList.remove("hidden");
      this.setAttribute("placeholder", excludeInputPlaceholder);
    });

    filesExcludeInput.addEventListener("blur", function () {
      const helpIcon = this.parentElement.querySelector(".help-icon");
      if (this.value.trim() === "") {
        helpIcon.classList.add("hidden");
        this.removeAttribute("placeholder");
      }
    });

    filesExcludeInput.addEventListener("input", function () {
      const helpIcon = this.parentElement.querySelector(".help-icon");
      toggleHelpIcon(this, helpIcon);
    });

    // Set up event listeners
    searchInput.addEventListener("focus", function () {
      this.classList.add("ring-2", "ring-blue-500");
    });

    searchInput.addEventListener("blur", function () {
      this.classList.remove("ring-2", "ring-blue-500");
    });

    // Toggle active state for icon buttons
    function toggleActiveButton(button) {
      if (button.classList.contains("text-blue-500")) {
        button.classList.remove("text-blue-500");
        button.classList.add("text-gray-500", "dark:text-gray-400");
      } else {
        button.classList.remove("text-gray-500", "dark:text-gray-400");
        button.classList.add("text-blue-500");
      }
    }

    matchCaseBtn.addEventListener("click", function () {
      toggleActiveButton(this);
    });

    matchWordBtn.addEventListener("click", function () {
      toggleActiveButton(this);
    });

    regexBtn.addEventListener("click", function () {
      toggleActiveButton(this);
    });

    // Toggle expanded options
    expandOptionsBtn.addEventListener("click", function () {
      searchOptions.classList.toggle("hidden");
      // Save preference to localStorage
      localStorage.setItem(
        "searchOptionsExpanded",
        searchOptions.classList.contains("hidden") ? "false" : "true",
      );

      // Check if options are now visible and update help icons status
      if (!searchOptions.classList.contains("hidden")) {
        // If options are visible, update the help icons state
        toggleHelpIcon(
          filesIncludeInput,
          filesIncludeInput.parentElement.querySelector(".help-icon"),
        );
        toggleHelpIcon(
          filesExcludeInput,
          filesExcludeInput.parentElement.querySelector(".help-icon"),
        );

        // Also add placeholder if inputs are focused
        if (document.activeElement === filesIncludeInput) {
          filesIncludeInput.setAttribute(
            "placeholder",
            includeInputPlaceholder,
          );
        }
        if (document.activeElement === filesExcludeInput) {
          filesExcludeInput.setAttribute(
            "placeholder",
            excludeInputPlaceholder,
          );
        }
      }
    });

    // Set initial expanded state from localStorage
    if (localStorage.getItem("searchOptionsExpanded") === "true") {
      searchOptions.classList.remove("hidden");
      // Check if there's input in the fields and show icons if needed
      toggleHelpIcon(
        filesIncludeInput,
        filesIncludeInput.parentElement.querySelector(".help-icon"),
      );
      toggleHelpIcon(
        filesExcludeInput,
        filesExcludeInput.parentElement.querySelector(".help-icon"),
      );
    }

    // Open help documentation when book icons are clicked
    includeHelpBtn.addEventListener("click", function () {
      window.location.href = "/glob-guide.html";
    });

    excludeHelpBtn.addEventListener("click", function () {
      window.location.href = "/glob-guide.html";
    });

    // Mock search functionality
    searchInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter" && this.value.trim() !== "") {
        mockSearchResults(this.value);
      }
    });

    // Click on the left search icon also triggers search
    const searchIcon = searchInput.parentElement.querySelector(".search-icon");
    searchIcon.addEventListener("click", function () {
      if (searchInput.value.trim() !== "") {
        mockSearchResults(searchInput.value);
      }
    });
  }

  // Function to display mock search results
  function mockSearchResults(query) {
    const resultsContainer = document.getElementById("search-results");

    resultsContainer.innerHTML = `
            <div class="border-l-2 border-blue-500 pl-2 mb-3">
              <div class="text-sm font-medium">src/index.html</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-300 dark:border-gray-600 my-1">
                Line 24: <span class="text-gray-700 dark:text-gray-300">contains "<mark class="bg-yellow-200 text-gray-800 px-1">${query}</mark>"</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-300 dark:border-gray-600 my-1">
                Line 42: <span class="text-gray-700 dark:text-gray-300">matches "<mark class="bg-yellow-200 text-gray-800 px-1">${query}</mark>" in attribute</span>
              </div>
            </div>
              
            <div class="border-l-2 border-blue-500 pl-2 mb-3">
              <div class="text-sm font-medium">src/app.js</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-300 dark:border-gray-600 my-1">
                Line 15: <span class="text-gray-700 dark:text-gray-300">function contains "<mark class="bg-yellow-200 text-gray-800 px-1">${query}</mark>"</span>
              </div>
            </div>
              
            <div class="border-l-2 border-blue-500 pl-2">
              <div class="text-sm font-medium">package.json</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-300 dark:border-gray-600 my-1">
                Line 8: <span class="text-gray-700 dark:text-gray-300">dependency "<mark class="bg-yellow-200 text-gray-800 px-1">${query}</mark>"</span>
              </div>
            </div>
          `;
  }

  // Load the search content
  loadSearchContent();
});

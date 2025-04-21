document.addEventListener("DOMContentLoaded", () => {
  const filterContent = document.getElementById("filter-content");
  if (!filterContent) return;

  // Create filter panel elements
  const filterPanelHTML = `
        <div class="filter-panel-container">
            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Apply a magic LLM filter to retrieve a subset of the files at this location</h3>
            
            <textarea 
                id="filter-prompt" 
                class="w-full p-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Describe what files you want to see."></textarea>
            
            <button 
                id="apply-filter-btn"
                class="w-full py-2 px-4 mb-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                Filter
            </button>
            
            <div class="mt-4">
                <h4 class="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Example filters:</h4>
                <div class="grid grid-cols-1 gap-2">
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Only backend code</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Only frontend components</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Only documentation files</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Only test files</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Only configuration files</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Files modified in the last week</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Files related to authentication</p>
                    </div>
                    <div class="filter-example-card p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <p class="text-sm text-gray-800 dark:text-gray-200">Files with more than 100 lines of code</p>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Set the HTML content
  filterContent.innerHTML = filterPanelHTML;

  // Add event listeners to example filter cards
  const exampleCards = document.querySelectorAll(".filter-example-card");
  const filterPrompt = document.getElementById("filter-prompt");

  exampleCards.forEach((card) => {
    card.addEventListener("click", () => {
      filterPrompt.value = card.querySelector("p").textContent;
      // Optionally focus the textarea after selecting an example
      filterPrompt.focus();
    });
  });

  // Add event listener to the filter button
  const filterButton = document.getElementById("apply-filter-btn");
  if (filterButton) {
    filterButton.addEventListener("click", () => {
      const filterValue = filterPrompt.value.trim();
      if (filterValue) {
        // In a real implementation, this would call an API or process the filter
        console.log("Applying filter:", filterValue);

        // Show a loading state on the button
        filterButton.textContent = "Filtering...";
        filterButton.disabled = true;

        // Simulate API call with timeout
        setTimeout(() => {
          // Reset button state
          filterButton.textContent = "Filter";
          filterButton.disabled = false;

          // Add filter parameter to URL
          const url = new URL(window.location);
          url.searchParams.set("filter", encodeURIComponent(filterValue));

          // Update URL without reloading the page
          window.history.pushState({}, "", url);

          // In a real implementation, you would update the file list based on the filter
          alert("Filter applied: " + filterValue);
        }, 1000);
      }
    });
  }
});

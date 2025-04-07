document.addEventListener("DOMContentLoaded", () => {
  const profileContent = document.getElementById("profile-content");
  if (!profileContent) return;

  // Function to handle login
  function handleLogin() {
    const params = new URLSearchParams(window.location.search);
    params.set("profile", "true");
    const redirectUri = encodeURIComponent(
      window.location.pathname + "?" + params.toString(),
    );
    window.location.href = `/login?redirect_uri=${redirectUri}&scope=user:email%20repo`;
  }

  // Function to handle logout
  function handleLogout() {
    const params = new URLSearchParams(window.location.search);
    params.set("profile", "true");
    const redirectUri = encodeURIComponent(
      window.location.pathname + "?" + params.toString(),
    );
    window.location.href = `/logout?redirect_uri=${redirectUri}`;
  }

  // Function to render the profile panel based on authentication status
  function renderProfilePanel() {
    // Check if user data is available (simulated with window.data)
    const isAuthenticated = window?.data?.is_authenticated || false;
    const ownerLogin = window?.data?.owner_login || "";
    const avatarUrl =
      window?.data?.avatar_url ||
      "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
    const balance = (
      Math.round((window?.data?.balance || 0) * 100) / 100
    ).toFixed(2);

    let profilePanelHTML = "";

    if (isAuthenticated) {
      // Authenticated user view
      profilePanelHTML = `
        <div class="profile-panel-container">
          <div class="flex items-center mb-4">
            <img src="${avatarUrl}" alt="Profile" class="w-12 h-12 rounded-full mr-4 border border-gray-200 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">${ownerLogin}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">GitHub Account</p>
            </div>
          </div>
          
          <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                <p class="text-xl font-semibold text-gray-800 dark:text-gray-200">${balance} credits</p>
              </div>
            </div>
            <div class="mt-4">
            <a 
                href="https://github.com/sponsors/janwilmake"
                target="_blank"
                class="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                Add Credits
              </a></div>
          </div>
          
          <div class="mb-4">
            <h4 class="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">Premium Features</h4>
            
            <div class="space-y-3">
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-700 dark:text-gray-300">Magic filtering of large repositories</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-700 dark:text-gray-300">Semantic code search</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-700 dark:text-gray-300">Advanced code analysis</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-700 dark:text-gray-300">Unlimited repository access</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-700 dark:text-gray-300">Priority support</p>
              </div>
            </div>
          </div>
          
          <a 
            id="signout-button"
            class="cursor-pointer w-full py-2 px-4 mt-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700">
            Sign Out
          </a>
        </div>
      `;
    } else {
      // Non-authenticated user view
      profilePanelHTML = `
        <div class="profile-panel-container p-1">
          <div class="text-center mb-4">
            <div class="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-700 dark:text-gray-300">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3 class="text-lg font-medium mb-1 text-gray-800 dark:text-gray-200">Unlock Premium Features</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Sign in with GitHub to access all features</p>
            
            <a 
              id="signin-button"
              class="cursor-pointer w-full py-2 px-4 mb-6 bg-gray-800 hover:bg-black text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              Sign in with GitHub
            </a>
          </div>
          
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 class="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">Premium Features</h4>
            
            <div class="space-y-3">
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-500 dark:text-gray-500">Magic filtering of large repositories</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-500 dark:text-gray-500">Semantic code search</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-500 dark:text-gray-500">Advanced code analysis</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-500 dark:text-gray-500">Unlimited repository access</p>
              </div>
              
              <div class="flex items-start">
                <div class="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <p class="ml-2 text-sm text-gray-500 dark:text-gray-500">Priority support</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Set the HTML content
    profileContent.innerHTML = profilePanelHTML;

    // Add event listeners to buttons after rendering
    if (isAuthenticated) {
      const signoutButton = document.getElementById("signout-button");
      if (signoutButton) {
        signoutButton.addEventListener("click", handleLogout);
      }
    } else {
      const signinButton = document.getElementById("signin-button");
      if (signinButton) {
        signinButton.addEventListener("click", handleLogin);
      }
    }
  }

  // Initial render
  renderProfilePanel();

  // For demonstration purposes, create a global window.data if it doesn't exist
  if (!window.data) {
    window.data = {
      is_authenticated: false,
    };
  }

  // Setup event listener for panel visibility changes to ensure proper rendering
  const profilePanel = document.getElementById("profile-panel");
  if (profilePanel) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "class" &&
          profilePanel.classList.contains("open")
        ) {
          renderProfilePanel(); // Re-render when panel becomes visible
        }
      });
    });

    observer.observe(profilePanel, { attributes: true });
  }
});

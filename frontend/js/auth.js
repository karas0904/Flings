// Cache duration in milliseconds (5 minutes)
const AUTH_CACHE_DURATION = 5 * 60 * 1000;

// Check if user is authenticated and redirect accordingly
async function checkAuthStatus() {
  try {
    // Check cache first
    const cachedAuth = localStorage.getItem("auth_cache");
    if (cachedAuth) {
      const { data, timestamp } = JSON.parse(cachedAuth);
      if (Date.now() - timestamp < AUTH_CACHE_DURATION) {
        return handleAuthResponse(data);
      }
    }

    // Show loading indicator
    const loadingIndicator = document.getElementById("auth-loading");
    if (loadingIndicator) loadingIndicator.style.display = "block";

    // Make the fetch request directly instead of using API
    const response = await fetch("http://localhost:3000/auth/current-user", {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();

    // Cache the response
    localStorage.setItem(
      "auth_cache",
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );

    // Hide loading indicator
    if (loadingIndicator) loadingIndicator.style.display = "none";

    return handleAuthResponse(data);
  } catch (error) {
    console.error("Error checking auth status:", error);
    // Hide loading indicator in case of error
    const loadingIndicator = document.getElementById("auth-loading");
    if (loadingIndicator) loadingIndicator.style.display = "none";
    // Clear cache in case of error
    localStorage.removeItem("auth_cache");
    return null;
  }
}

function handleAuthResponse(data) {
  const { isAuthenticated, user } = data;
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes("login.html");
  const isIndexPage = currentPath === "/" || currentPath.includes("index.html");

  if (isAuthenticated) {
    if (isLoginPage || isIndexPage) {
      window.location.href = "discover.html";
    }
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } else {
    if (!isLoginPage && !isIndexPage) {
      window.location.href = "login.html";
    }
    localStorage.removeItem("user");
    localStorage.removeItem("auth_cache");
    return null;
  }
}

// Handle logout
async function handleLogout() {
  try {
    // Make the fetch request directly instead of using API
    await fetch("http://localhost:3000/auth/logout", {
      method: "GET",
      credentials: "include",
    });
    localStorage.removeItem("user");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Error logging out:", error);
    // Handle error (e.g., show error message)
  }
}

// Check for URL parameters (e.g., error messages from auth)
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");

  if (error) {
    const errorElement = document.getElementById("auth-error");
    if (errorElement) {
      if (error === "domain") {
        errorElement.textContent =
          "Only SRM Institute of Science and Technology email addresses are allowed.";
      } else {
        errorElement.textContent = "Authentication failed. Please try again.";
      }
      errorElement.style.display = "block";
    }
  }
}

// Initialize auth-related functionality
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication status
  checkAuthStatus();

  // Check for URL parameters
  checkUrlParams();

  // Add event listener to logout button if it exists
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
});

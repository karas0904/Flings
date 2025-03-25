// Check if user is authenticated and redirect accordingly
async function checkAuthStatus() {
  try {
    // Make the fetch request directly instead of using API
    const response = await fetch("http://localhost:3000/auth/current-user", {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    const { isAuthenticated, user } = data;

    // Get current page path
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes("login.html");
    const isIndexPage =
      currentPath === "/" || currentPath.includes("index.html");

    if (isAuthenticated) {
      // User is logged in
      if (isLoginPage || isIndexPage) {
        // Redirect to discover page if on login or index page
        window.location.href = "discover.html";
      }

      // Store user data in localStorage for easy access
      localStorage.setItem("user", JSON.stringify(user));

      return user;
    } else {
      // User is not logged in
      if (!isLoginPage && !isIndexPage) {
        // Redirect to login page if not on login or index page
        window.location.href = "login.html";
      }

      // Clear user data from localStorage
      localStorage.removeItem("user");

      return null;
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
    // Handle error (e.g., show error message)
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

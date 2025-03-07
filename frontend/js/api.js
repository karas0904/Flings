// Base API URL
const API_BASE_URL = "http://localhost:3000";

// API service for making requests to the backend
const API = {
  // Check if user is authenticated
  checkAuth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/current-user`, {
        method: "GET",
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      console.error("Auth check failed:", error);
      return { isAuthenticated: false };
    }
  },

  // Logout user
  logout: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "GET",
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      console.error("Get profile failed:", error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });
      return await response.json();
    } catch (error) {
      console.error("Update profile failed:", error);
      throw error;
    }
  },

  // Get potential matches
  getDiscoverProfiles: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/discover`, {
        method: "GET",
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      console.error("Get discover profiles failed:", error);
      throw error;
    }
  },

  // Create interaction (like/dislike)
  createInteraction: async (targetUserId, action) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/interactions/${targetUserId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Create interaction failed:", error);
      throw error;
    }
  },

  // Get matches
  getMatches: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interactions/matches`, {
        method: "GET",
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      console.error("Get matches failed:", error);
      throw error;
    }
  },

  // Get messages for a match
  getMessages: async (matchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${matchId}`, {
        method: "GET",
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      console.error("Get messages failed:", error);
      throw error;
    }
  },

  // Send a message
  sendMessage: async (matchId, content) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${matchId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      return await response.json();
    } catch (error) {
      console.error("Send message failed:", error);
      throw error;
    }
  },
};

import express from "express";
import passport from "passport";

const router = express.Router();

// Google Authentication Route
router.get("/google", (req, res, next) => {
  // Generate a random state for security
  const state = Math.random().toString(36).substring(2);
  req.session.authState = state;

  // Store the flow type ("login" or "sinkin") in the session
  const flowType = req.query.flow || "login"; // Default to "login" if not specified
  req.session.flowType = flowType;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state: state,
  })(req, res, next);
});

// Google Callback Route
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", async (err, userWithToken, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.redirect("http://127.0.0.1:5500/login.html?error=auth");
    }
    if (!userWithToken) {
      console.log("Authentication failed:", info ? info.message : "No user");
      return res.redirect("http://127.0.0.1:5500/login.html?error=domain");
    }

    try {
      // Log the userWithToken object
      console.log("Received userWithToken:", userWithToken);

      // Extract the MongoDB user document and JWT token
      const { token, ...user } = userWithToken;

      // Log the extracted user and token
      console.log("Extracted user:", user);
      console.log("Extracted token:", token);

      // Log the user in (this triggers serializeUser)
      req.login(user, async (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

        // Determine the flow type from the session
        const flowType = req.session.flowType || "login";
        delete req.session.flowType; // Clean up session

        // Determine where to redirect based on the flow type
        let redirectUrl;
        if (flowType === "login") {
          // "Login" flow: Always redirect to discover.html
          redirectUrl = "http://127.0.0.1:5500/discover.html";
        } else if (flowType === "sinkin") {
          // "Sinkin" flow: Check if the user has completed their profile
          if (user.profileCompleted) {
            // Existing user with completed profile: Redirect to explore.html
            redirectUrl = "http://127.0.0.1:5500/explore.html";
          } else {
            // New user or user with incomplete profile: Redirect to discover.html
            redirectUrl = "http://127.0.0.1:5500/discover.html";
          }
        }

        // Send the JWT token to the frontend by appending it as a query parameter
        redirectUrl += `?token=${token}`;

        // Redirect to the appropriate page
        return res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error("Error in Google callback:", error);
      return res.redirect("http://127.0.0.1:5500/login.html?error=auth");
    }
  })(req, res, next);
});

// Logout Route (optional, if needed)
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    req.session.destroy(() => {
      res.redirect("http://127.0.0.1:5500/login.html");
    });
  });
});

export default router; // Use default export for consistency

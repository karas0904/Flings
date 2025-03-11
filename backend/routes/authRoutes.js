import express from "express";
import passport from "passport";

const router = express.Router();

// Google Authentication Route
router.get("/google", (req, res, next) => {
  // Generate a random state parameter to prevent CSRF
  const state = Math.random().toString(36).substring(2);
  req.session.authState = state;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state: state,
  })(req, res, next);
});

export default router;

// Google Callback Route
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.redirect("http://127.0.0.1:5500/login.html?error=auth");
    }

    if (!user) {
      console.log("No user returned from authentication");
      return res.redirect("http://127.0.0.1:5500/login.html?error=domain");
    }

    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      console.log("Authentication successful, redirecting to frontend");

      // Get the redirect URL from the session or use a default
      const redirectTo =
        req.session.redirectTo || "http://127.0.0.1:5500/discover.html";

      // Clear the redirect URL from the session
      delete req.session.redirectTo;

      // Redirect to the frontend
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// Success Route
router.get("/success", (req, res) => {
  if (!req.user) {
    return res.redirect("/auth/failure");
  }
  res.json({ message: "Login successful", user: req.user });
});

// Failure Route
router.get("/failure", (req, res) => {
  res.json({ message: "Login failed" });
});

// Logout Route
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out" });
  });
});

// Current User Route with token support
router.get("/current-user", (req, res) => {
  // Check for token in request
  const authToken = req.headers.authorization?.split(" ")[1];

  console.log("Current user request received");
  console.log("Auth token from header:", authToken);
  console.log("Session token:", req.session.authToken);
  console.log("Is authenticated:", req.isAuthenticated());

  // If token matches session token, user is authenticated
  if (authToken && authToken === req.session.authToken) {
    console.log("Token authentication successful");
    res.json({
      isAuthenticated: true,
      user: req.user,
    });
  } else if (req.isAuthenticated()) {
    // Regular session authentication
    console.log("Session authentication successful");
    res.json({
      isAuthenticated: true,
      user: req.user,
    });
  } else {
    console.log("Authentication failed");
    res.json({
      isAuthenticated: false,
    });
  }
});

// Export the router as default
export const authRoutes = router;

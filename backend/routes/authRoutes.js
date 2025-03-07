const express = require("express");
const passport = require("passport");

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

// Google Callback Route
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", {
      failureRedirect: "http://127.0.0.1:5500/login.html?error=domain",
    })(req, res, next);
  },
  (req, res) => {
    // This function will run after successful authentication
    console.log("Authentication successful, redirecting to frontend");
    // Explicitly redirect to your frontend
    res.redirect("http://127.0.0.1:5500/discover.html");
  }
);

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

// Add this route to check the current user
router.get("/current-user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: req.user,
    });
  } else {
    res.json({
      isAuthenticated: false,
    });
  }
});

module.exports = router;

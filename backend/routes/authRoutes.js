import express from "express";
import passport from "passport";

const router = express.Router();

// Google Authentication Route
router.get("/google", (req, res, next) => {
  const state = Math.random().toString(36).substring(2);
  req.session.authState = state;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state: state,
  })(req, res, next);
});

// Google Callback Route
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.redirect("http://127.0.0.1:5500/login.html?error=auth");
    }
    if (!user) {
      console.log("Authentication failed:", info ? info.message : "No user");
      return res.redirect("http://127.0.0.1:5500/login.html?error=domain");
    }
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      const redirectTo =
        req.session.redirectTo || "http://127.0.0.1:5500/discover.html";
      delete req.session.redirectTo;
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// Other routes remain unchanged...

export const authRoutes = router;

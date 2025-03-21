import express from "express";
import passport from "passport";

const router = express.Router();

// Google Authentication Route (unchanged)
router.get("/google", (req, res, next) => {
  const state = Math.random().toString(36).substring(2);
  req.session.authState = state;
  const flowType = req.query.flow || "login";
  req.session.flowType = flowType;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state: state,
  })(req, res, next);
});

// Google Callback Route (modified)
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
      const { token, ...user } = userWithToken;
      console.log("Extracted user:", user);
      console.log("Extracted token:", token);

      req.login(user, async (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

        const flowType = req.session.flowType || "login";
        delete req.session.flowType;

        let redirectUrl;
        if (flowType === "login") {
          // "Login" flow: Check if user exists
          if (user.profileCompleted) {
            // User exists (has a completed profile)
            redirectUrl = "http://127.0.0.1:5500/login.html?error=exists";
          } else {
            // New user: Redirect to discover.html
            redirectUrl = "http://127.0.0.1:5500/discover.html?token=" + token;
          }
        } else if (flowType === "sinkin") {
          // "Sinkin" flow: Unchanged
          if (user.profileCompleted) {
            redirectUrl = "http://127.0.0.1:5500/explore.html";
          } else {
            redirectUrl = "http://127.0.0.1:5500/discover.html";
          }
          redirectUrl += `?token=${token}`;
        }

        return res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error("Error in Google callback:", error);
      return res.redirect("http://127.0.0.1:5500/login.html?error=auth");
    }
  })(req, res, next);
});

// Logout Route (unchanged)
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

export default router;

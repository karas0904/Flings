// Create routes for profile management
// backend/routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const isAuthenticated = require("../middleware/auth");

// Get current user profile
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put("/", isAuthenticated, async (req, res) => {
  try {
    const { name, gender, bio, interests, preferences } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, gender, bio, interests, preferences },
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Create routes for discovering potential matches
// backend/routes/discoveryRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Interaction = require("../models/Interaction");
const isAuthenticated = require("../middleware/auth");

// Get potential matches
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    // Find users who match preferences
    const potentialMatches = await User.find({
      _id: { $ne: req.user.id },
      gender: currentUser.preferences.gender || { $exists: true },
      // Add more filtering based on preferences
    }).limit(10);

    res.json(potentialMatches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

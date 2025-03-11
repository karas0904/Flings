// Create routes for discovering potential matches
// backend/routes/discoveryRoutes.js
import express from "express";
import User from "../models/User.js";
import Interaction from "../models/Interaction.js";
import isAuthenticated from "../middleware/auth.js";

const router = express.Router();

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

export default router; // ✅ Ensure you export it as default

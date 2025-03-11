// Create routes for profile management
// backend/routes/profileRoutes.js

import express from "express";
import User from "../models/User.js";
import isAuthenticated from "../middleware/auth.js";

const router = express.Router();

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

export default router;

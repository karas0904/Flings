// Create routes for user interactions
// backend/routes/interactionRoutes.js
import express from "express";
import Interaction from "../models/Interaction.js";
import Match from "../models/Match.js";
import isAuthenticated from "../middleware/auth.js";

const router = express.Router();

// Create a like or dislike
router.post("/:targetUserId", isAuthenticated, async (req, res) => {
  try {
    const { action } = req.body; // 'like' or 'dislike'
    const { targetUserId } = req.params;

    // Create interaction
    const interaction = await Interaction.create({
      userId: req.user.id,
      targetUserId,
      action,
    });

    // Check for mutual like (match)
    if (action === "like") {
      const mutualLike = await Interaction.findOne({
        userId: targetUserId,
        targetUserId: req.user.id,
        action: "like",
      });

      if (mutualLike) {
        // Create a match
        const match = await Match.create({
          users: [req.user.id, targetUserId],
        });

        return res.json({
          interaction,
          match,
          isMatch: true,
        });
      }
    }

    res.json({ interaction, isMatch: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; // ✅ Ensure you export it as default

// Create routes for user interactions
// backend/routes/interactionRoutes.js
const express = require("express");
const router = express.Router();
const Interaction = require("../models/Interaction");
const Match = require("../models/Match");
const isAuthenticated = require("../middleware/auth");

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

module.exports = router;

import express from "express";
import Message from "../models/Message.js";
import Match from "../models/Match.js";
import isAuthenticated from "../middleware/auth.js";

const router = express.Router();

// Get messages for a match
router.get("/:matchId", isAuthenticated, async (req, res) => {
  try {
    const { matchId } = req.params;

    // Verify user is part of this match
    const match = await Match.findById(matchId);
    if (!match || !match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ error: "Not authorized to view these messages" });
    }

    const messages = await Message.find({ matchId }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
router.post("/:matchId", isAuthenticated, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;

    // Verify user is part of this match
    const match = await Match.findById(matchId);
    if (!match || !match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ error: "Not authorized to send messages in this match" });
    }

    const message = await Message.create({
      matchId,
      senderId: req.user.id,
      content,
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

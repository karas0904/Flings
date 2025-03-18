import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// Get message history between two users
router.get("/history/:userId", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id; // Current user's ID
    const otherUserId = req.params.userId; // The other user's ID

    // Fetch messages where the user is either the sender or recipient
    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    })
      .populate("senderId", "name email")
      .populate("recipientId", "name email")
      .sort({ createdAt: 1 }); // Sort by timestamp (oldest first)

    res.json(messages);
  } catch (error) {
    console.error("Error fetching message history:", error);
    res.status(500).json({ error: "Failed to fetch message history" });
  }
});

export default router;

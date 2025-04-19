import dotenv from "dotenv"; // Import dotenv
dotenv.config(); // Load environment variables

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import fileUpload from "express-fileupload";
import MongoStore from "connect-mongo";
import authRoutes from "./routes/authRoutes.js"; // Named import
import discoveryRoutes from "./routes/discoveryRoutes.js"; // Default import
import interactionRoutes from "./routes/interactionRoutes.js"; // Default import
import messageRoutes from "./routes/messageRoutes.js"; // Default import
import profileRoutes from "./routes/profileRoutes.js"; // Default import
import { createServer } from "http"; // Import HTTP server module
import { Server } from "socket.io"; // Import Socket.IO
import wrap from "./utils/wrap.js"; // Import a utility to wrap middleware for Socket.IO
import Message from "./models/Message.js";
import MuteStatus from "./models/MuteStatus.js";

import "./config/passport.js";

// Check if required environment variables are set
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "Loaded" : "Missing"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "Loaded" : "Missing"
);

const app = express();
const PORT = process.env.PORT || 3000;

// Create an HTTP server (needed for Socket.IO)
const server = createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5500", // Allow your frontend origin
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// CORS configuration - PLACE THIS BEFORE ROUTES
app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Express session (required for persistent login sessions)
if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET environment variable is not set!");
  process.exit(1); // Exit the application if the secret is missing
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "lax", // Important for cross-site requests
  },
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
});

// Middleware
app.use(express.json({ limit: "50mb" })); // Increase payload size limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(fileUpload());
app.use(sessionMiddleware);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/api", profileRoutes); // Changed from /api/profile to /api
app.use("/api/discover", discoveryRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/messages", messageRoutes);

// Serve static files from the public directory
//app.use(express.static("public"));

// A simple test route
app.get("/", (req, res) => {
  res.send("College Dating App API is running!");
});

// Socket.IO authentication middleware
//io.use(wrap(sessionMiddleware));
//io.use(wrap(passport.initialize()));
//io.use(wrap(passport.session()));

import jwt from "jsonwebtoken"; // Add this at the top if not already there

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Unauthorized: No token provided"));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    socket.request.user = decoded; // Attach decoded user to socket.request.user
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    next(new Error("Unauthorized: Invalid token"));
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  console.log("Authenticated user:", socket.request.user);
  const userId = socket.request.user.id.toString(); // Change _id to id
  console.log(`User ${userId} connected`);

  // Add user to onlineUsers and notify clients
  onlineUsers.set(userId, true);
  io.emit("userStatusUpdate", { userId, status: "online" });

  socket.join(userId);

  // Handle status query
  socket.on("getUserStatus", ({ userId: targetUserId }, callback) => {
    const status = onlineUsers.has(targetUserId) ? "online" : "offline";
    callback({ userId: targetUserId, status });
  });

  socket.on("joinMatches", async (callback) => {
    try {
      const matchesResponse = await fetch("http://localhost:3000/api/matches", {
        headers: { Authorization: `Bearer ${socket.handshake.auth.token}` },
      });
      const matches = await matchesResponse.json();
      const matchIds = matches.profiles.map((profile) => profile.matchId);
      matchIds.forEach((matchId) => {
        socket.join(matchId);
        console.log(`User ${userId} joined match room ${matchId}`);
      });
      callback({ success: true, matchIds });
    } catch (error) {
      console.error("Error fetching matches:", error);
      callback({ error: "Failed to join matches" });
    }
  });

  socket.on("joinMatchRoom", ({ matchId }) => {
    socket.join(matchId);
    console.log(`User ${userId} joined new match room ${matchId}`);
  });

  socket.on("loadMessages", async (matchId, callback) => {
    try {
      const messages = await Message.find({ matchId })
        .populate("senderId", "name email")
        .sort("createdAt");
      callback({ success: true, messages });
    } catch (error) {
      console.error("Error loading messages:", error);
      callback({ error: "Failed to load messages" });
    }
  });

  socket.on("sendMessage", async (data, callback) => {
    try {
      const { matchId, content, isImage = false } = data;
      const senderId = socket.request.user.id;

      if (!matchId || !content) {
        return callback?.({ error: "Match ID and content are required" });
      }

      // Enhanced mute check - check if the sender is muted
      const muteStatus = await MuteStatus.findOne({
        matchId,
        mutedId: senderId,
      });

      if (muteStatus) {
        return callback?.({
          success: false,
          error: "You cannot send messages while muted",
          isMuted: true,
          muterId: muteStatus.muterId,
        });
      }

      let mimeType = null;
      if (isImage) {
        // Validate Base64 format
        if (!content.startsWith("data:image/")) {
          return callback?.({
            success: false,
            error: "Invalid image format",
          });
        }

        // Extract MIME type (e.g., image/jpeg)
        const matches = content.match(/^data:(image\/[^;]+);base64,/);
        if (!matches) {
          return callback?.({
            success: false,
            error: "Invalid Base64 image",
          });
        }
        mimeType = matches[1];

        // Validate original file size (Base64 size ÷ 4/3 ≈ original size)
        const base64String = content.split(",")[1]; // Remove data:image/...;base64, prefix
        const decodedSize = (base64String.length * 3) / 4; // Approximate original size
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (decodedSize > maxSize) {
          return callback?.({
            success: false,
            error: "Image size exceeds 5MB",
          });
        }
      }

      const message = new Message({
        senderId,
        matchId,
        content,
        isImage,
        mimeType,
      });
      await message.save();

      const populatedMessage = await Message.findById(message._id).populate(
        "senderId",
        "name email"
      );

      io.to(matchId).emit("new-message", populatedMessage);
      callback?.({ success: true, message: populatedMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      callback?.({ success: false, error: "Failed to send message" });
    }
  });

  socket.on("deleteMessage", async ({ messageId }, callback = () => {}) => {
    try {
      // Find the message first to check ownership
      const message = await Message.findById(messageId);

      if (!message) {
        return callback?.({ success: false, error: "Message not found" });
      }

      // Check if the user trying to delete is the sender
      if (message.senderId.toString() !== socket.request.user.id) {
        return callback?.({
          success: false,
          error: "Unauthorized to delete this message",
        });
      }

      // Update the message instead of deleting it
      await Message.findByIdAndUpdate(messageId, {
        content: "This message was deleted",
        isDeleted: true,
      });

      // Broadcast the deletion to all users in the match
      io.to(message.matchId).emit("messageDeleted", {
        messageId,
        content: "This message was deleted",
      });

      callback?.({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      callback?.({ success: false, error: "Failed to delete message" });
    }
  });

  socket.on("addReaction", async ({ messageId, emoji, matchId }, callback) => {
    try {
      // Update the message in the database
      const message = await Message.findByIdAndUpdate(
        messageId,
        { reaction: emoji },
        { new: true }
      );

      if (!message) {
        callback({ success: false, error: "Message not found" });
        return;
      }

      // Broadcast the reaction to all users in the match room
      socket.to(matchId).emit("messageReaction", {
        messageId: message._id,
        emoji: emoji,
      });

      callback({ success: true });
    } catch (error) {
      console.error("Error adding reaction:", error);
      callback({ success: false, error: "Failed to add reaction" });
    }
  });

  socket.on("muteUser", async ({ matchId, mutedId }, callback) => {
    try {
      const muterId = socket.request.user.id;

      // Check if mute status already exists
      const existingMute = await MuteStatus.findOne({
        matchId,
        muterId,
        mutedId,
      });

      if (existingMute) {
        return callback?.({ success: false, error: "User is already muted" });
      }

      // Create new mute status
      const muteStatus = new MuteStatus({
        matchId,
        muterId,
        mutedId,
      });
      await muteStatus.save();

      // Notify both users about the mute
      io.to(matchId).emit("userMuted", {
        matchId,
        muterId,
        mutedId,
      });

      callback?.({ success: true });
    } catch (error) {
      console.error("Error muting user:", error);
      callback?.({ success: false, error: "Failed to mute user" });
    }
  });

  socket.on("unmuteUser", async ({ matchId, mutedId }, callback) => {
    try {
      const muterId = socket.request.user.id;

      // Remove mute status
      const result = await MuteStatus.findOneAndDelete({
        matchId,
        muterId,
        mutedId,
      });

      if (!result) {
        return callback?.({ success: false, error: "User is not muted" });
      }

      // Notify both users about the unmute
      io.to(matchId).emit("userUnmuted", {
        matchId,
        muterId,
        mutedId,
      });

      callback?.({ success: true });
    } catch (error) {
      console.error("Error unmuting user:", error);
      callback?.({ success: false, error: "Failed to unmute user" });
    }
  });

  socket.on("checkMuteStatus", async ({ matchId, otherUserId }, callback) => {
    try {
      const userId = socket.request.user.id;

      // Check both directions of muting
      const muteStatus = await MuteStatus.findOne({
        matchId,
        $or: [
          { muterId: userId, mutedId: otherUserId },
          { muterId: otherUserId, mutedId: userId },
        ],
      });

      if (!muteStatus) {
        return callback?.({
          success: true,
          isMuted: false,
          isMuter: false,
          mutedId: null,
          muterId: null,
        });
      }

      callback?.({
        success: true,
        isMuted: true,
        isMuter: muteStatus.muterId.toString() === userId,
        mutedId: muteStatus.mutedId,
        muterId: muteStatus.muterId,
        matchId: muteStatus.matchId,
      });
    } catch (error) {
      console.error("Error checking mute status:", error);
      callback?.({ success: false, error: "Failed to check mute status" });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    // Remove user from onlineUsers and notify clients
    onlineUsers.delete(userId);
    io.emit("userStatusUpdate", { userId, status: "offline" });
  });
});

// Start the server (use the HTTP server instead of app.listen)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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
      const { matchId, content } = data;
      if (!matchId || !content) {
        return callback({ error: "Match ID and content are required" });
      }
      const message = new Message({
        senderId: userId,
        matchId,
        content,
      });
      await message.save();
      const populatedMessage = await Message.findById(message._id).populate(
        "senderId",
        "name email"
      );
      io.to(matchId).emit("new-message", populatedMessage);
      callback({ success: true, message: populatedMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      callback({ error: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start the server (use the HTTP server instead of app.listen)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

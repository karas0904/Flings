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
app.use(express.static("public"));

// A simple test route
app.get("/", (req, res) => {
  res.send("College Dating App API is running!");
});

// Socket.IO authentication middleware
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
  if (socket.request.user) {
    next(); // User is authenticated, allow connection
  } else {
    next(new Error("Unauthorized")); // User is not authenticated, reject connection
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  console.log("Authenticated user:", socket.request.user);

  // Join a room based on the user's ID
  const userId = socket.request.user._id.toString();
  socket.join(userId); // Each user joins a room named after their user ID
  console.log(`User ${userId} joined room ${userId}`);

  // Handle sending a message
  socket.on("sendMessage", async (data, callback) => {
    try {
      const { recipientId, content } = data;

      // Validate input
      if (!recipientId || !content) {
        return callback({ error: "Recipient ID and content are required" });
      }

      // Create and save the message to MongoDB
      const message = new Message({
        senderId: userId,
        recipientId,
        content,
      });
      await message.save();

      // Populate sender and recipient details (optional, for richer message data)
      const populatedMessage = await Message.findById(message._id)
        .populate("senderId", "name email")
        .populate("recipientId", "name email");

      // Emit the message to the recipient's room
      io.to(recipientId).emit("receiveMessage", populatedMessage);

      // Emit the message back to the sender (for confirmation)
      socket.emit("receiveMessage", populatedMessage);

      // Callback to confirm message was sent
      callback({ success: true, message: populatedMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      callback({ error: "Failed to send message" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start the server (use the HTTP server instead of app.listen)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

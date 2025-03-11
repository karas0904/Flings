import dotenv from "dotenv"; // Import dotenv
dotenv.config(); // Load environment variables

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import fileUpload from "express-fileupload";
import MongoStore from "connect-mongo";
import authRoutes from "./routes/authRoutes.js"; // Import your routes
import discoveryRoutes from "./routes/discoveryRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

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

app.use(express.json());
app.use(fileUpload());
app.use(
  session({
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
  })
);

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
app.use("/api/profile", profileRoutes);
app.use("/api/discover", discoveryRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/messages", messageRoutes);

// Serve static files from the public directory
app.use(express.static("public"));

// A simple test route
app.get("/", (req, res) => {
  res.send("College Dating App API is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

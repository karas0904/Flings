require("dotenv").config(); // Load environment variables
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "Loaded" : "Missing"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "Loaded" : "Missing"
);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const fileUpload = require("express-fileupload");
const MongoStore = require("connect-mongo");
const validateFace = require("./middleware/faceValidation"); // Import the face validation middleware
require("./config/passport"); // Import Passport configuration

const authRoutes = require("./routes/authRoutes"); // Import auth routes
const profileRoutes = require("./routes/profileRoutes");
const discoveryRoutes = require("./routes/discoveryRoutes");
const interactionRoutes = require("./routes/interactionRoutes");
const messageRoutes = require("./routes/messageRoutes");

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

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true })); // Enable file upload middleware

// Express session (required for persistent login sessions)
if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET environment variable is not set!");
  process.exit(1); // Exit the application if the secret is missing
}

app.use(
  session({
    secret: process.env.SESSION_SECRET, // Use environment variable
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // Use your MongoDB connection string
      collectionName: "sessions", // Optional: name of the collection to store sessions
    }),
    cookie: { secure: false }, // Set to true in production with HTTPS
  })
);

// Initialize Passport and session handling
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/auth", authRoutes); // Authentication routes
app.use("/api/profile", profileRoutes);
app.use("/api/discover", discoveryRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/messages", messageRoutes);

// Route to handle image upload
app.post("/upload", validateFace, (req, res) => {
  // Handle the validated image (e.g., save to database)
  res.send("Image uploaded and validated successfully.");
});

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

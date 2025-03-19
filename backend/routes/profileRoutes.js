import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// POST /api/profile - Update user profile (existing route)
router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      firstName,
      email,
      birthday,
      gender,
      interestedIn,
      relationshipIntent,
      bio,
      year,
      loveLanguages,
      dealBreakers,
      hobbies,
      activities,
      preferences,
      electives,
      campusInvolvement,
      favoriteSpot,
      courseStudy,
      profileVisibility,
      dataConsent,
      photos,
      quotes, // Added quotes
    } = req.body;

    // Update fields only if they’re provided in the request
    if (firstName !== undefined) user.firstName = firstName;
    if (email !== undefined) user.email = email;
    if (birthday !== undefined) user.birthday = birthday;
    if (gender !== undefined) user.gender = gender;
    if (interestedIn !== undefined) user.interestedIn = interestedIn;
    if (relationshipIntent !== undefined)
      user.relationshipIntent = relationshipIntent;
    if (bio !== undefined) user.bio = bio;
    if (year !== undefined) user.year = year;
    if (loveLanguages !== undefined) user.loveLanguages = loveLanguages;
    if (dealBreakers !== undefined) user.dealBreakers = dealBreakers;
    if (hobbies !== undefined) user.hobbies = hobbies;
    if (activities !== undefined) user.activities = activities;
    if (preferences !== undefined) user.preferences = preferences;
    if (electives !== undefined) user.electives = electives;
    if (campusInvolvement !== undefined)
      user.campusInvolvement = campusInvolvement;
    if (favoriteSpot !== undefined) user.favoriteSpot = favoriteSpot;
    if (courseStudy !== undefined) user.courseStudy = courseStudy;
    if (profileVisibility !== undefined)
      user.profileVisibility = profileVisibility;
    if (dataConsent !== undefined) user.dataConsent = dataConsent;
    if (photos !== undefined) user.photos = photos;
    if (quotes !== undefined) user.quotes = quotes; // Added quotes update
    user.profileCompleted = true;

    await user.save();
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/profile - Fetch authenticated user's profile (existing route)
// POST /api/profile
router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { quotes /* other fields */ } = req.body;
    console.log("POST - User ID:", req.user.id, "Quotes to save:", quotes); // Add this
    if (quotes !== undefined) user.quotes = quotes;
    // ... other fields ...
    user.profileCompleted = true;

    await user.save();
    console.log("POST - Saved user:", user); // Add this
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id }).select(
      "firstName birthday year photos email quotes"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("GET - User ID:", req.user.id, "Raw user data:", user); // Add this

    const today = new Date();
    const birthDate = new Date(
      `${user.birthday.year}-${user.birthday.month}-${user.birthday.day}`
    );
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    const responseData = {
      firstName: user.firstName,
      age: age,
      year: user.year,
      email: user.email,
      photos: user.photos || [],
      quotes: user.quotes,
    };
    console.log("Sending profile data:", responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ... (previous imports and routes remain unchanged) ...

// GET /api/profiles - Fetch all completed profiles
router.get("/profiles", authenticateToken, async (req, res) => {
  try {
    // Fetch profiles where profileCompleted is true
    const profiles = await User.find({ profileCompleted: true }).select(
      "firstName photos bio courseStudy hobbies gender interestedIn birthday year quotes" // Add 'quotes' here
    );

    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ message: "No profiles found" });
    }

    const formattedProfiles = profiles.map((profile, index) => {
      const today = new Date();
      const birthDate = new Date(
        `${profile.birthday.year}-${profile.birthday.month}-${profile.birthday.day}`
      );
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return {
        id: index + 1,
        name: profile.firstName,
        age: age || "N/A",
        hometown: "N/A",
        year: profile.year || "N/A",
        department: profile.courseStudy || "N/A",
        bio: profile.bio || "No bio provided",
        image:
          profile.photos && profile.photos.length > 0
            ? profile.photos[0]
            : "https://via.placeholder.com/200",
        interests: profile.interestedIn ? [profile.interestedIn] : [],
        hobbies: profile.hobbies ? [profile.hobbies] : [],
        favoriteQuote: profile.quotes?.[0] || "N/A", // Use first quote as favoriteQuote
        additionalInfo: "N/A",
        quotes: profile.quotes || [], // Include all quotes here
      };
    });

    res.status(200).json(formattedProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// NEW POST /api/logout - Logout endpoint
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // Since JWT is stateless, logout typically just relies on client-side token removal.
    // If you maintain a token blacklist or session store, you could invalidate the token here.
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// NEW DELETE /api/delete-account - Delete account endpoint
router.delete("/delete-account", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.deleteOne({ _id: userId });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

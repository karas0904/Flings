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
    } = req.body;

    user.firstName = firstName;
    user.email = email;
    user.birthday = birthday;
    user.gender = gender;
    user.interestedIn = interestedIn;
    user.relationshipIntent = relationshipIntent;
    user.bio = bio;
    user.year = year;
    user.loveLanguages = loveLanguages;
    user.dealBreakers = dealBreakers;
    user.hobbies = hobbies;
    user.activities = activities;
    user.preferences = preferences;
    user.electives = electives;
    user.campusInvolvement = campusInvolvement;
    user.favoriteSpot = favoriteSpot;
    user.courseStudy = courseStudy;
    user.profileVisibility = profileVisibility;
    user.dataConsent = dataConsent;
    user.photos = photos;
    user.profileCompleted = true;

    await user.save();
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/profile - Fetch authenticated user's profile (existing route)
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id }).select(
      "firstName birthday year photos email"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate age from birthday
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

    res.status(200).json({
      firstName: user.firstName,
      age: age,
      year: user.year,
      email: user.email,
      photos: user.photos || [],
    });
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
      "firstName photos bio courseStudy hobbies gender interestedIn birthday year" // Changed 'photo' to 'photos'
    );

    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ message: "No profiles found" });
    }

    // Map the data to match the structure your frontend expects
    const formattedProfiles = profiles.map((profile, index) => {
      // Calculate age from birthday
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
        id: index + 1, // Temporary ID for frontend (you can use _id if preferred)
        name: profile.firstName,
        age: age || "N/A",
        hometown: "N/A", // Add this if you store it in the schema
        year: profile.year || "N/A",
        department: profile.courseStudy || "N/A",
        bio: profile.bio || "No bio provided",
        image:
          profile.photos && profile.photos.length > 0
            ? profile.photos[0]
            : "https://via.placeholder.com/200", // Use the first photo from photos array
        interests: profile.interestedIn ? [profile.interestedIn] : [],
        hobbies: profile.hobbies ? [profile.hobbies] : [],
        favoriteQuote: "N/A", // Add this if you store it in the schema
        additionalInfo: "N/A", // Add this if you store it in the schema
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

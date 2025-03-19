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

// POST /api/profile - Update user profile
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
      hometown,
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
      quotes,
      job, // New
      planTo, // New
      datingIntention, // New
      pets, // New
      language, // New
      drinking, // New
      smoking, // New
      partyPerson, // New
      age,
      height,
    } = req.body;

    if (firstName !== undefined) user.firstName = firstName;
    if (email !== undefined) user.email = email;
    if (birthday !== undefined) user.birthday = birthday;
    if (hometown !== undefined) user.hometown = hometown;
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
    if (quotes !== undefined) user.quotes = quotes;
    if (job !== undefined) user.job = job; // New
    if (planTo !== undefined) user.planTo = planTo; // New
    if (datingIntention !== undefined) user.datingIntention = datingIntention; // New
    if (pets !== undefined) user.pets = pets; // New
    if (language !== undefined) user.language = language; // New
    if (drinking !== undefined) user.drinking = drinking; // New
    if (smoking !== undefined) user.smoking = smoking; // New
    if (partyPerson !== undefined) user.partyPerson = partyPerson; // New
    if (age !== undefined) user.age = age; // New
    if (height !== undefined) user.height = height; // New

    user.profileCompleted = true;

    await user.save();
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/profile - Fetch authenticated user's profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id }).select(
      "firstName birthday year photos email quotes hometown job planTo datingIntention pets language drinking smoking partyPerson age height" // Updated
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
      age: user.age !== null ? user.age : age,
      year: user.year,
      email: user.email,
      photos: user.photos || [],
      quotes: user.quotes,
      hometown: user.hometown || "N/A",
      job: user.job || "None", // New
      planTo: user.planTo || "None", // New
      datingIntention: user.datingIntention || "None", // New
      pets: user.pets || "None", // New
      language: user.language || "None", // New
      drinking: user.drinking || "None", // New
      smoking: user.smoking || "None", // New
      partyPerson: user.partyPerson || "None", // New
      height: user.height || "None", // New
    };
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/profiles - Fetch all completed profiles
// GET /api/profiles - Fetch all completed profiles
router.get("/profiles", authenticateToken, async (req, res) => {
  try {
    const profiles = await User.find({ profileCompleted: true }).select(
      "firstName photos bio courseStudy hobbies gender interestedIn birthday year quotes height hometown" // Add hometown here
    );

    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ message: "No profiles found" });
    }

    const formattedProfiles = profiles.map((profile) => {
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
        _id: profile._id,
        name: profile.firstName,
        age: age || "N/A",
        hometown: profile.hometown || "N/A", // Use actual hometown value
        year: profile.year || "N/A",
        department: profile.courseStudy || "N/A",
        bio: profile.bio || "No bio provided",
        image:
          profile.photos && profile.photos.length > 0
            ? profile.photos[0]
            : "https://via.placeholder.com/200",
        interests: profile.interestedIn ? [profile.interestedIn] : [],
        hobbies: profile.hobbies ? [profile.hobbies] : [],
        favoriteQuote: profile.quotes?.[0] || "N/A",
        additionalInfo: "N/A",
        height: profile.height || "N/A",
        quotes: profile.quotes || [],
      };
    });

    res.status(200).json(formattedProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/save-profile - Save a profile
router.post("/save-profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileToSave = await User.findById(profileId);
    if (!profileToSave) {
      return res.status(404).json({ message: "Profile to save not found" });
    }

    const isAlreadySaved = user.savedProfiles.some(
      (saved) => saved.profileId.toString() === profileId
    );
    if (isAlreadySaved) {
      return res.status(400).json({ message: "Profile already saved" });
    }

    user.savedProfiles.push({
      profileId,
      saveDate: new Date(), // Ensure saveDate is included
    });
    await user.save();

    res.status(200).json({ message: "Profile saved successfully" });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/saved-profiles - Fetch user's saved profiles (with 7-day filter)
router.get("/saved-profiles", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate(
      "savedProfiles.profileId",
      "firstName photos bio courseStudy hobbies birthday year quotes height age"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const savedProfiles = user.savedProfiles
      .filter((saved) => new Date(saved.saveDate) >= oneWeekAgo)
      .map((saved) => {
        const profile = saved.profileId;
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
          _id: profile._id,
          name: profile.firstName,
          age: age || "N/A",
          year: profile.year || "N/A",
          department: profile.courseStudy || "N/A",
          bio: profile.bio || "No bio provided",
          image:
            profile.photos && profile.photos.length > 0
              ? profile.photos[0]
              : "https://via.placeholder.com/200",
          hobbies: profile.hobbies ? [profile.hobbies] : [],
          quotes: profile.quotes || [],
          saveDate: saved.saveDate,
        };
      });

    res.status(200).json(savedProfiles);
  } catch (error) {
    console.error("Error fetching saved profiles:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/saved-profiles/date/:date - Remove all saved profiles for a specific date
router.delete(
  "/saved-profiles/date/:date",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { date } = req.params; // e.g., "March 19"

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const originalLength = user.savedProfiles.length;
      user.savedProfiles = user.savedProfiles.filter((saved) => {
        const saveDate = new Date(saved.saveDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        });
        return saveDate !== date;
      });

      if (user.savedProfiles.length === originalLength) {
        return res
          .status(404)
          .json({ message: "No saved profiles found for this date" });
      }

      await user.save();
      res
        .status(200)
        .json({ message: "All profiles for this date removed successfully" });
    } catch (error) {
      console.error("Error deleting saved profiles for date:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// POST /api/logout - Logout endpoint
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/delete-account - Delete account endpoint
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

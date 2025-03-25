import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Like from "../models/Like.js";
import { getMatches } from "../utils/matching.js";

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

router.post("/like-profile", authenticateToken, async (req, res) => {
  const { profileId } = req.body;
  const userId = req.user.id;

  if (!profileId) {
    return res.status(400).json({ message: "Profile ID is required" });
  }

  try {
    const existingLike = await Like.findOne({ userId, profileId });
    if (existingLike) {
      return res
        .status(400)
        .json({ message: "You already liked this profile" });
    }

    const like = new Like({ userId, profileId });
    await like.save();
    res.status(201).json({ message: "Profile liked successfully", like });
  } catch (error) {
    console.error("Error saving like:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ... (existing imports and code)

router.get("/liked-profiles", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Current user's ID from JWT

  try {
    // Find all likes where this user's profile was liked
    const likes = await Like.find({ profileId: userId })
      .populate("userId", "firstName photos") // Populate the liker's details
      .lean();

    if (!likes.length) {
      return res
        .status(200)
        .json({ message: "No one has liked your profile yet", profiles: [] });
    }

    // Map to a format showing who liked you
    const likedByProfiles = likes.map((like) => ({
      id: like.userId._id,
      name: like.userId.firstName,
      photo: like.userId.photos[0] || "default-profile.jpg",
      timestamp: like.timestamp, // Optional: when they liked you
    }));

    res
      .status(200)
      .json({ message: "Profiles that liked you", profiles: likedByProfiles });
  } catch (error) {
    console.error("Error fetching liked profiles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/my-likes", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const likes = await Like.find({ userId }).lean();
    res.status(200).json(likes); // Returns array of like objects with profileId
  } catch (error) {
    console.error("Error fetching my likes:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/rose", authenticateToken, async (req, res) => {
  const { toUser, comment } = req.body;
  const fromUser = req.user.id;

  if (!toUser) {
    return res.status(400).json({ message: "Target profile ID is required" });
  }

  try {
    // Validate that toUser exists
    const targetUser = await User.findById(toUser);
    if (!targetUser) {
      console.log(`Target user not found: ${toUser}`);
      return res.status(404).json({ message: "Target user not found" });
    }

    // Validate that fromUser exists
    const sender = await User.findById(fromUser);
    if (!sender) {
      console.log(`Sender user not found: ${fromUser}`);
      return res.status(404).json({ message: "Sender user not found" });
    }

    const existingRose = await RoseInteraction.findOne({ fromUser, toUser });
    if (existingRose) {
      return res
        .status(400)
        .json({ message: "You already sent a Rose to this profile" });
    }

    const rose = new RoseInteraction({
      fromUser,
      toUser,
      comment,
    });
    await rose.save();
    console.log(
      `RoseInteraction created: ${rose._id}, fromUser: ${fromUser}, toUser: ${toUser}`
    );
    res.status(200).json({ message: "Rose sent successfully" });
  } catch (error) {
    console.error("Error sending Rose:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/efforts", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Logged-in user (receiver)

  try {
    const efforts = await RoseInteraction.find({
      toUser: userId,
      status: "pending",
    })
      .populate("fromUser", "firstName photos") // Change to firstName
      .lean();

    console.log("All efforts fetched:", JSON.stringify(efforts, null, 2)); // Debug

    const formattedEfforts = efforts
      .map((effort) => {
        console.log("Processing effort:", JSON.stringify(effort, null, 2));
        if (!effort.fromUser) {
          console.log(`No fromUser found for RoseInteraction ${effort._id}`);
          return null;
        }
        const fromUser = effort.fromUser;
        const photos = Array.isArray(fromUser.photos) ? fromUser.photos : [];
        return {
          id: effort._id,
          fromUserId: fromUser._id || "unknown",
          name: fromUser.firstName || "Unknown", // Change to firstName
          photo:
            photos.length > 0
              ? photos[0]
              : "http://localhost:3000/default-profile.jpg",
          comment: effort.comment || "",
        };
      })
      .filter((effort) => effort !== null);

    console.log("Formatted efforts:", formattedEfforts);
    res
      .status(200)
      .json({ message: "Pending efforts", efforts: formattedEfforts });
  } catch (error) {
    console.error("Error fetching efforts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/efforts/:id", authenticateToken, async (req, res) => {
  const effortId = req.params.id;
  const userId = req.user.id; // Logged-in user (receiver)

  try {
    // Find the effort by ID and ensure it belongs to the logged-in user
    const effort = await RoseInteraction.findOne({
      _id: effortId,
      toUser: userId,
    });

    if (!effort) {
      return res
        .status(404)
        .json({ message: "Effort not found or not authorized" });
    }

    // Delete the effort
    await RoseInteraction.deleteOne({ _id: effortId });
    res
      .status(200)
      .json({ message: "Effort declined and deleted successfully" });
  } catch (error) {
    console.error("Error deleting effort:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept an effort (rose interaction)
router.post("/efforts/:id/accept", authenticateToken, async (req, res) => {
  const effortId = req.params.id;
  const userId = req.user.id; // Logged-in user (receiver)

  try {
    // Find the effort by ID and ensure it belongs to the logged-in user
    const effort = await RoseInteraction.findOne({
      _id: effortId,
      toUser: userId,
      status: "pending",
    }).populate("fromUser", "firstName photos");

    if (!effort) {
      return res
        .status(404)
        .json({ message: "Effort not found or not authorized" });
    }

    // Update the status to "accepted"
    effort.status = "accepted";
    await effort.save();

    // Optionally, create a match or chat session (simplified here)
    // For simplicity, we'll assume accepting a rose creates a match
    const matchData = {
      matchId: effort._id, // Use the rose interaction ID as a unique identifier
      name: effort.fromUser.firstName || "Unknown",
      photo: effort.fromUser.photos[0] || "default-profile.jpg",
      snippet: effort.comment || "Rose accepted!",
      time: new Date().toLocaleTimeString(),
    };

    res.status(200).json({
      message: "Effort accepted successfully",
      match: matchData,
    });
  } catch (error) {
    console.error("Error accepting effort:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/sent-roses", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const sentRoses = await RoseInteraction.find({ fromUser: userId })
      .populate("toUser", "firstName photos")
      .lean();
    const formattedRoses = sentRoses.map((rose) => ({
      id: rose._id,
      toUserId: rose.toUser._id,
      name: rose.toUser.firstName || "Unknown",
      photo: rose.toUser.photos[0] || "default-profile.jpg",
      comment: rose.comment || "",
    }));
    res.status(200).json({ message: "Sent roses", roses: formattedRoses });
  } catch (error) {
    console.error("Error fetching sent roses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/rose/comment", authenticateToken, async (req, res) => {
  const { toUser, comment } = req.body;
  const fromUser = req.user.id; // Current user from JWT

  try {
    // Find the existing rose interaction
    const roseInteraction = await RoseInteraction.findOne({
      fromUser,
      toUser,
      status: "pending", // Only update pending roses
    });

    if (!roseInteraction) {
      return res.status(404).json({ message: "Rose interaction not found" });
    }

    // Update the comment
    roseInteraction.comment = comment;
    await roseInteraction.save();

    res.status(200).json({
      message: "Comment attached to rose successfully",
      rose: roseInteraction,
    });
  } catch (error) {
    console.error("Error attaching comment to rose:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//trending pages api
router.get("/trending-profiles", authenticateToken, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Aggregate likes from the past week
    const trendingProfiles = await Like.aggregate([
      { $match: { timestamp: { $gte: oneWeekAgo } } },
      { $group: { _id: "$profileId", likeCount: { $sum: 1 } } },
      { $sort: { likeCount: -1 } },
      { $limit: 10 },
    ]);

    const profileIds = trendingProfiles.map((profile) => profile._id);
    const profiles = await User.find({ _id: { $in: profileIds } }).select(
      "firstName photos age courseStudy height birthday year partyPerson smoking drinking pets bio"
    );

    console.log("Profiles from DB:", profiles); // Debugging

    const formattedProfiles = trendingProfiles.map((trend) => {
      const user = profiles.find((p) => p._id.equals(trend._id));
      console.log("User for profileId", trend._id, ":", user); // Debugging

      let calculatedAge = user.age;
      if (!calculatedAge && user.birthday) {
        const today = new Date();
        const birthDate = new Date(
          `${user.birthday.year}-${user.birthday.month}-${user.birthday.day}`
        );
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          calculatedAge--;
        }
      }

      return {
        id: trend._id,
        name: user ? user.firstName : "Unknown",
        photos:
          user && user.photos.length > 0
            ? user.photos
            : ["https://via.placeholder.com/200"], // Return full photos array
        likeCount: trend.likeCount,
        age: calculatedAge || "N/A",
        courseStudy: user ? user.courseStudy || "N/A" : "N/A",
        height: user ? user.height || "N/A" : "N/A",
        year: user ? user.year || "N/A" : "N/A",
        partyPerson: user ? user.partyPerson || "N/A" : "N/A",
        smoking: user ? user.smoking || "N/A" : "N/A",
        drinking: user ? user.drinking || "N/A" : "N/A",
        pets: user ? user.pets || "N/A" : "N/A",
        bio: user ? user.bio || "No bio provided" : "No bio provided",
      };
    });

    res.status(200).json({
      message: "Top trending profiles",
      profiles: formattedProfiles,
    });
  } catch (error) {
    console.error("Error fetching trending profiles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

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
    const matchedProfiles = await getMatches(req.user.id);
    res.status(200).json(matchedProfiles);
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
    const user = await User.findById(userId).populate({
      path: "savedProfiles.profileId",
      select:
        "firstName photos bio courseStudy hobbies birthday year quotes height age",
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const savedProfiles = user.savedProfiles
      .filter((saved) => {
        if (!saved.saveDate) {
          console.warn(
            `Missing saveDate for saved profile: ${saved.profileId}`
          );
          return false; // Skip if saveDate is missing
        }
        return new Date(saved.saveDate) >= oneWeekAgo;
      })
      .map((saved) => {
        if (!saved.profileId) {
          console.warn(`Invalid saved profile for user ${userId}`);
          return null; // Skip if profileId is missing
        }
        const profile = saved.profileId;
        const today = new Date();
        const birthDate = profile.birthday
          ? new Date(
              `${profile.birthday.year}-${profile.birthday.month}-${profile.birthday.day}`
            )
          : null;
        let age = "N/A";
        if (birthDate) {
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
        }

        return {
          _id: profile._id,
          name: profile.firstName || "Unknown",
          age: profile.age || age,
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
      })
      .filter((profile) => profile !== null); // Remove null entries

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

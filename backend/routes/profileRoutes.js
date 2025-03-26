import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Like from "../models/Like.js";
import { getMatches } from "../utils/matching.js";
import RoseInteraction from "../models/roseInteraction.js";

const router = express.Router();

// Middleware to authenticate JWT token
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

// Like a profile
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

    const like = new Like({ userId, profileId, status: "pending" });
    await like.save();
    res.status(201).json({ message: "Profile liked successfully", like });
  } catch (error) {
    console.error("Error saving like:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get liked profiles
router.get("/liked-profiles", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const incomingLikes = await Like.find({ profileId: userId })
      .populate("userId", "firstName photos")
      .lean();

    const outgoingMatches = await Like.find({
      userId,
      status: "matched",
    })
      .populate("profileId", "firstName photos")
      .lean();

    const profilesMap = new Map();

    incomingLikes.forEach((like) => {
      profilesMap.set(like.userId._id.toString(), {
        id: like.userId._id,
        name: like.userId.firstName,
        photo: like.userId.photos[0] || "default-profile.jpg",
        status: like.status,
        timestamp: like.timestamp,
        direction: "incoming",
      });
    });

    outgoingMatches.forEach((match) => {
      profilesMap.set(match.profileId._id.toString(), {
        id: match.profileId._id,
        name: match.profileId.firstName,
        photo: match.profileId.photos[0] || "default-profile.jpg",
        status: match.status,
        timestamp: match.timestamp,
        direction: "matched",
      });
    });

    const profiles = Array.from(profilesMap.values());

    if (!profiles.length) {
      return res
        .status(200)
        .json({ message: "No one has liked your profile yet", profiles: [] });
    }

    res.status(200).json({ message: "Profiles related to you", profiles });
  } catch (error) {
    console.error("Error fetching liked profiles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Toggle like status to match
router.post("/toggle-like", authenticateToken, async (req, res) => {
  const { profileId } = req.body;
  const userId = req.user.id;

  try {
    let like = await Like.findOne({ userId: profileId, profileId: userId });
    if (!like) {
      return res.status(404).json({ message: "Like not found" });
    }

    if (like.status === "pending") {
      like.status = "matched";
      like.timestamp = new Date();

      const matches = await getMatches(userId);
      const matchedProfile = matches.find(
        (p) => p._id.toString() === profileId
      );
      like.score = matchedProfile ? matchedProfile.score : 0;

      await like.save();

      let reverseLike = await Like.findOne({ userId, profileId });
      if (reverseLike && reverseLike.status === "pending") {
        reverseLike.status = "matched";
        reverseLike.timestamp = new Date();
        reverseLike.score = like.score;
        await reverseLike.save();
      }

      res.status(200).json({ message: "Match created", matchId: like._id });
    } else {
      res.status(400).json({ message: "Already matched" });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get matches
router.get("/matches", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const likeMatches = await Like.find({
      $and: [
        { status: "matched" },
        { $or: [{ userId }, { profileId: userId }] },
      ],
    })
      .populate("userId", "firstName photos")
      .populate("profileId", "firstName photos")
      .lean();

    const roseMatches = await RoseInteraction.find({
      $and: [
        { status: "accepted" },
        { $or: [{ fromUser: userId }, { toUser: userId }] },
      ],
    })
      .populate("fromUser", "firstName photos")
      .populate("toUser", "firstName photos")
      .lean();

    const allMatches = [...likeMatches, ...roseMatches];
    const uniqueMatches = new Map();

    allMatches.forEach((match) => {
      let matchId, otherUser, snippet, timestamp, score;
      if (match.userId) {
        const isCurrentUserInitiator = match.userId._id.toString() === userId;
        otherUser = isCurrentUserInitiator ? match.profileId : match.userId;
        matchId = match._id.toString();
        snippet = "Say hi!";
        timestamp = match.timestamp;
        score = match.score || 0;
      } else {
        const isSender = match.fromUser._id.toString() === userId;
        otherUser = isSender ? match.toUser : match.fromUser;
        matchId = match._id.toString();
        snippet = match.comment || "Rose accepted!";
        timestamp = match.updatedAt || match.createdAt;
        score = 0;
      }

      uniqueMatches.set(matchId, {
        matchId,
        name: otherUser.firstName || "Unknown",
        photo:
          otherUser.photos && otherUser.photos.length > 0
            ? otherUser.photos[0]
            : "default-profile.jpg",
        snippet,
        time: timestamp
          ? new Date(timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          : "Just now",
        score,
      });
    });

    const profiles = Array.from(uniqueMatches.values());

    if (!profiles.length) {
      return res.status(200).json({ message: "No matches yet", profiles: [] });
    }

    res.status(200).json({ message: "Your matches", profiles });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send a rose
router.post("/rose", authenticateToken, async (req, res) => {
  const { toUser, comment } = req.body;
  const fromUser = req.user.id;

  if (!toUser) {
    return res.status(400).json({ message: "Target profile ID is required" });
  }

  try {
    const targetUser = await User.findById(toUser);
    if (!targetUser) {
      console.log(`Target user not found: ${toUser}`);
      return res.status(404).json({ message: "Target user not found" });
    }

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

// Get pending efforts
router.get("/efforts", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const efforts = await RoseInteraction.find({
      toUser: userId,
      status: "pending",
    })
      .populate("fromUser", "firstName photos")
      .lean();

    const formattedEfforts = efforts
      .map((effort) => {
        if (!effort.fromUser) {
          console.log(`No fromUser found for RoseInteraction ${effort._id}`);
          return null;
        }
        const fromUser = effort.fromUser;
        const photos = Array.isArray(fromUser.photos) ? fromUser.photos : [];
        return {
          id: effort._id,
          fromUserId: fromUser._id || "unknown",
          name: fromUser.firstName || "Unknown",
          photo:
            photos.length > 0
              ? photos[0]
              : "http://localhost:3000/default-profile.jpg",
          comment: effort.comment || "",
        };
      })
      .filter((effort) => effort !== null);

    res
      .status(200)
      .json({ message: "Pending efforts", efforts: formattedEfforts });
  } catch (error) {
    console.error("Error fetching efforts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Decline an effort
router.delete("/efforts/:id", authenticateToken, async (req, res) => {
  const effortId = req.params.id;
  const userId = req.user.id;

  try {
    const effort = await RoseInteraction.findOne({
      _id: effortId,
      toUser: userId,
    });

    if (!effort) {
      return res
        .status(404)
        .json({ message: "Effort not found or not authorized" });
    }

    await RoseInteraction.deleteOne({ _id: effortId });
    res
      .status(200)
      .json({ message: "Effort declined and deleted successfully" });
  } catch (error) {
    console.error("Error deleting effort:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept an effort
router.post("/efforts/:id/accept", authenticateToken, async (req, res) => {
  const effortId = req.params.id;
  const userId = req.user.id;

  try {
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

    effort.status = "accepted";
    await effort.save();

    const matchData = {
      matchId: effort._id.toString(),
      name: effort.fromUser.firstName || "Unknown",
      photo:
        effort.fromUser.photos && effort.fromUser.photos.length > 0
          ? effort.fromUser.photos[0]
          : "default-profile.jpg",
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

// Get sent roses
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

// Add comment to a rose
router.post("/rose/comment", authenticateToken, async (req, res) => {
  const { toUser, comment } = req.body;
  const fromUser = req.user.id;

  try {
    const roseInteraction = await RoseInteraction.findOne({
      fromUser,
      toUser,
      status: "pending",
    });

    if (!roseInteraction) {
      return res.status(404).json({ message: "Rose interaction not found" });
    }

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

// Block a user and remove interactions
router.delete("/block/:matchId", authenticateToken, async (req, res) => {
  console.log(
    `Block endpoint hit: matchId = ${req.params.matchId}, userId = ${req.user.id}`
  );
  const { matchId } = req.params; // e.g., "67e3de94d4a875c1c79a67cf"
  const userId = req.user.id; // e.g., "67dad23fb177154b1a2504fa"

  try {
    const roseResult = await RoseInteraction.deleteMany({
      _id: matchId,
      $or: [{ fromUser: userId }, { toUser: userId }],
    });

    const likeResult = await Like.deleteMany({
      _id: matchId, // Match the Like document by its _id
      $or: [{ userId: userId }, { profileId: userId }],
    });

    if (roseResult.deletedCount === 0 && likeResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "No interactions found to block" });
    }

    res.status(200).json({ message: "User blocked and interactions removed" });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get trending profiles
router.get("/trending-profiles", authenticateToken, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const trendingProfiles = await Like.aggregate([
      { $match: { timestamp: { $gte: oneWeekAgo } } },
      { $group: { _id: "$profileId", likeCount: { $sum: 1 } } },
      { $sort: { likeCount: -1 } },
      { $limit: 10 },
    ]);

    if (!trendingProfiles.length) {
      return res
        .status(200)
        .json({ message: "No trending profiles found", profiles: [] });
    }

    const profileIds = trendingProfiles.map((profile) => profile._id);
    const profiles = await User.find({ _id: { $in: profileIds } }).select(
      "firstName photos age courseStudy height birthday year partyPerson smoking drinking pets bio"
    );

    const formattedProfiles = trendingProfiles.map((trend) => {
      const user = profiles.find((p) => p._id.equals(trend._id));
      if (!user) {
        return {
          id: trend._id,
          name: "Unknown",
          photos: ["https://via.placeholder.com/200"],
          likeCount: trend.likeCount,
          age: "N/A",
          courseStudy: "N/A",
          height: "N/A",
          year: "N/A",
          partyPerson: "N/A",
          smoking: "N/A",
          drinking: "N/A",
          pets: "N/A",
          bio: "No bio provided",
        };
      }

      let calculatedAge = user.age;
      if (
        !calculatedAge &&
        user.birthday &&
        user.birthday.year &&
        user.birthday.month &&
        user.birthday.day
      ) {
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
        name: user.firstName || "Unknown",
        photos:
          user.photos.length > 0
            ? user.photos
            : ["https://via.placeholder.com/200"],
        likeCount: trend.likeCount,
        age: calculatedAge || "N/A",
        courseStudy: user.courseStudy || "N/A",
        height: user.height || "N/A",
        year: user.year || "N/A",
        partyPerson: user.partyPerson || "N/A",
        smoking: user.smoking || "N/A",
        drinking: user.drinking || "N/A",
        pets: user.pets || "N/A",
        bio: user.bio || "No bio provided",
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

// Get profile by ID
router.get("/profile/:id", authenticateToken, async (req, res) => {
  try {
    const profileId = req.params.id;
    const user = await User.findById(profileId).select(
      "firstName birthday year photos email quotes hometown job planTo datingIntention pets language drinking smoking partyPerson height bio"
    );
    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    let age = "N/A";
    if (
      user.birthday &&
      user.birthday.year &&
      user.birthday.month &&
      user.birthday.day
    ) {
      const today = new Date();
      const birthDate = new Date(
        `${user.birthday.year}-${user.birthday.month}-${user.birthday.day}`
      );
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    const responseData = {
      firstName: user.firstName,
      age: age,
      year: user.year,
      email: user.email,
      photos: user.photos || [],
      quotes: user.quotes || [],
      hometown: user.hometown || "N/A",
      job: user.job || "None",
      planTo: user.planTo || "None",
      datingIntention: user.datingIntention || "None",
      pets: user.pets || "None",
      language: user.language || "None",
      drinking: user.drinking || "None",
      smoking: user.smoking || "None",
      partyPerson: user.partyPerson || "None",
      height: user.height || "None",
      bio: user.bio || "No bio provided",
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching profile by ID:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update profile
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
      job,
      planTo,
      datingIntention,
      pets,
      language,
      drinking,
      smoking,
      partyPerson,
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
    if (job !== undefined) user.job = job;
    if (planTo !== undefined) user.planTo = planTo;
    if (datingIntention !== undefined) user.datingIntention = datingIntention;
    if (pets !== undefined) user.pets = pets;
    if (language !== undefined) user.language = language;
    if (drinking !== undefined) user.drinking = drinking;
    if (smoking !== undefined) user.smoking = smoking;
    if (partyPerson !== undefined) user.partyPerson = partyPerson;
    if (age !== undefined) user.age = age;
    if (height !== undefined) user.height = height;

    user.profileCompleted = true;

    await user.save();
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get current user's profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id }).select(
      "firstName birthday year photos email quotes hometown job planTo datingIntention pets language drinking smoking partyPerson height"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let age = "N/A";
    if (
      user.birthday &&
      user.birthday.year &&
      user.birthday.month &&
      user.birthday.day
    ) {
      const today = new Date();
      const birthDate = new Date(
        `${user.birthday.year}-${user.birthday.month}-${user.birthday.day}`
      );
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    const responseData = {
      firstName: user.firstName,
      age: age,
      year: user.year,
      email: user.email,
      photos: user.photos || [],
      quotes: user.quotes || [],
      hometown: user.hometown || "N/A",
      job: user.job || "None",
      planTo: user.planTo || "None",
      datingIntention: user.datingIntention || "None",
      pets: user.pets || "None",
      language: user.language || "None",
      drinking: user.drinking || "None",
      smoking: user.smoking || "None",
      partyPerson: user.partyPerson || "None",
      height: user.height || "None",
    };
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all matched profiles
router.get("/profiles", authenticateToken, async (req, res) => {
  try {
    const matchedProfiles = await getMatches(req.user.id);
    res.status(200).json(matchedProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Save a profile
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
      saveDate: new Date(),
    });
    await user.save();

    res.status(200).json({ message: "Profile saved successfully" });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get saved profiles
router.get("/saved-profiles", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate({
      path: "savedProfiles.profileId",
      select:
        "firstName photos bio courseStudy hobbies birthday year quotes height",
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
          return false;
        }
        return new Date(saved.saveDate) >= oneWeekAgo;
      })
      .map((saved) => {
        if (!saved.profileId) {
          console.warn(`Invalid saved profile for user ${userId}`);
          return null;
        }
        const profile = saved.profileId;

        let age = "N/A";
        if (
          profile.birthday &&
          profile.birthday.year &&
          profile.birthday.month &&
          profile.birthday.day
        ) {
          const today = new Date();
          const birthDate = new Date(
            `${profile.birthday.year}-${profile.birthday.month}-${profile.birthday.day}`
          );
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
          age: age,
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
      .filter((profile) => profile !== null);

    res.status(200).json(savedProfiles);
  } catch (error) {
    console.error("Error fetching saved profiles:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete account
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

// Remove liked profile
router.post("/remove-liked-profile", authenticateToken, async (req, res) => {
  const { profileId } = req.body; // "67ddecd9e2d30367593d155a" (User B)
  const userId = req.user.id; // "67dad23fb177154b1a2504fa" (User A)

  if (!profileId) {
    return res.status(400).json({ message: "Profile ID is required" });
  }

  try {
    console.log(`Removing like: liker=${profileId}, target=${userId}`);
    const result = await Like.deleteOne({
      userId: profileId, // User B (liker)
      profileId: userId, // User A (target)
      status: "pending", // Only remove pending likes
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "No pending like found to remove" });
    }

    res.status(200).json({ message: "Liked profile removed successfully" });
  } catch (error) {
    console.error("Error removing liked profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

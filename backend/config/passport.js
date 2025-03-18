import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose"; // Add this import
import User from "../models/User.js";

dotenv.config();

// Single GoogleStrategy implementation
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get email from profile
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        // Check if email exists and is from srmist.edu.in domain
        if (!email || !email.endsWith("@srmist.edu.in")) {
          console.log("Authentication failed: Non-SRM email attempted:", email);
          return done(null, false, {
            message:
              "Only SRM Institute of Science and Technology email addresses are allowed.",
          });
        }

        // Check if the user already exists in MongoDB
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If the user doesn't exist, create a new user
          user = new User({
            googleId: profile.id, // Ensure googleId is a string
            email: email,
            displayName: profile.displayName,
            photo:
              profile.photos && profile.photos[0]
                ? profile.photos[0].value
                : null,
          });
          await user.save();
        }

        // Generate a JWT token
        const token = jwt.sign(
          { id: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" } // Token expires in 1 hour
        );

        // Create a plain JS object with the user data and token
        const userWithToken = {
          ...user.toObject(), // Convert Mongoose document to plain JS object
          token, // Add the token
        };

        // Log the user and token before passing to done
        console.log("MongoDB User:", user.toObject());
        console.log("User with token:", userWithToken);
        return done(null, userWithToken);
      } catch (error) {
        console.error("Error in Google OAuth:", error);
        return done(error, null);
      }
    }
  )
);

// In your passport.js file

// Serialize user to store in session
// Fix the serialization/deserialization issue
passport.serializeUser((user, done) => {
  // The user object might be userWithToken which has _id in the nested user object
  const userId = user._id ? user._id : user.id;
  console.log("Serializing user with ID:", userId);
  done(null, userId);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user with ID:", id);
    // Make sure id is a valid ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("Invalid ObjectId:", id);
      return done(null, false);
    }

    const user = await User.findById(id);
    if (!user) {
      console.error("User not found for ID:", id);
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    console.error("Error in deserializeUser:", error);
    done(error, null);
  }
});

export default passport;

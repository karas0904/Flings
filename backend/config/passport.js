import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
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

      // Authentication successful, proceed with user profile
      console.log("Google Profile:", profile);
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;

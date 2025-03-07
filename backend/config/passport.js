const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      proxy: true,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Get email from profile
        const email = profile.emails[0].value;

        // Check if email is from srmist.edu.in domain
        if (!email.endsWith("@srmist.edu.in")) {
          return done(null, false, {
            message:
              "Only SRM Institute of Science and Technology email addresses are allowed.",
          });
        }

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // After successful authentication, store the redirect URL in the session
          req.session.redirectTo = "http://127.0.0.1:5500/test.html";
          return done(null, user);
        }

        // Create new user if doesn't exist
        user = await new User({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          profilePicture: profile.photos?.[0]?.value || "",
          // Other required fields with default values
          gender: "",
          bio: "",
          interests: [],
          preferences: {
            gender: "",
            ageRange: {
              min: 18,
              max: 30,
            },
          },
        }).save();

        // After successful authentication, store the redirect URL in the session
        req.session.redirectTo = "http://127.0.0.1:5500/test.html";
        return done(null, user);
      } catch (error) {
        console.error("Error in Google strategy callback:", error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

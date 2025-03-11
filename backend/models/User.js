import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    googleId: { type: String, required: true, unique: true },
    profilePicture: { type: String },
    gender: { type: String },
    bio: { type: String },
    interests: [{ type: String }],
    preferences: {
      gender: { type: String },
      ageRange: {
        min: { type: Number },
        max: { type: Number },
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User; // ✅ Use ES module export

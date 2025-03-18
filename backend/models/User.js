import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  photo: { type: String },
  createdAt: { type: Date, default: Date.now },
  profileCompleted: { type: Boolean, default: false },
  firstName: { type: String },
  birthday: {
    month: { type: String },
    day: { type: String },
    year: { type: String },
  },
  gender: { type: String },
  interestedIn: { type: String },
  relationshipIntent: { type: String },
  bio: { type: String },
  year: { type: String },
  loveLanguages: { type: String },
  dealBreakers: { type: String },
  hobbies: { type: String },
  activities: { type: String },
  preferences: { type: String },
  electives: {
    elective1: { type: String },
    elective2: { type: String },
    elective3: { type: String },
  },
  campusInvolvement: { type: String },
  favoriteSpot: { type: String },
  courseStudy: { type: String },
  profileVisibility: { type: String },
  dataConsent: { type: Boolean },
  photos: { type: [String], default: [] },
});

const User = mongoose.model("User", userSchema);

export default User;

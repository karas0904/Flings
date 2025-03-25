import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // References your 'users' collection
      required: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Also references 'users' since profiles are users
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now, // Automatically set to current time
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

export default mongoose.model("Like", likeSchema);

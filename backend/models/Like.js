import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: { type: String, enum: ["pending", "matched"], default: "pending" },
  timestamp: { type: Date, default: Date.now },
  score: { type: Number, default: 0 }, // New field for score
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 3 * 24 * 60 * 60 * 1000),
  }, // Add 3 days to current date
  fromDetailSection: { type: Boolean, default: false }, // New field
});

// Add index for automatic expiration
likeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Like", likeSchema);

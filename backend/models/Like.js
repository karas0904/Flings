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
});

export default mongoose.model("Like", likeSchema);

import mongoose from "mongoose";

const muteStatusSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
  },
  muterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mutedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure unique mute status per match
muteStatusSchema.index(
  { matchId: 1, muterId: 1, mutedId: 1 },
  { unique: true }
);

export default mongoose.model("MuteStatus", muteStatusSchema);

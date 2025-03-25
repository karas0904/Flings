import mongoose from "mongoose";

const roseInteractionSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  comment: { type: String, default: "" },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "accepted", "declined"],
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("RoseInteraction", roseInteractionSchema);

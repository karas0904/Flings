import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, enum: ["like", "dislike"], required: true },
  },
  { timestamps: true }
);

const Interaction = mongoose.model("Interaction", interactionSchema);
export default Interaction;

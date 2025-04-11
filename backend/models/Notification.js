import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    required: true,
    enum: ["like", "match", "rose", "photo_like"],
  }, // Added "photo_like"
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  }, // 3 days
  read: { type: Boolean, default: false },
});

export default mongoose.model("Notification", notificationSchema);

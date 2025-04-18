import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  matchId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  reaction: {
    type: String,
    default: null,
  },
  isImage: {
    type: Boolean,
    default: false,
  },
  mimeType: {
    type: String,
    default: null,
  },
});

export default mongoose.model("Message", messageSchema);

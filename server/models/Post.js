import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    ownerEmail: String,
    caption: { type: String, required: true, trim: true, maxlength: 2200 },
    hashtags: [String],
    prompt: { type: String, maxlength: 500 },
    tone: String,
    platform: { type: String, default: "Instagram" },
    imagePath: String,
    status: { type: String, enum: ["draft", "scheduled", "published"], default: "draft", index: true },
    scheduledAt: Date,
    notify: {
      enabled: { type: Boolean, default: true },
      leadMinutes: { type: Number, default: 15, min: 0, max: 10080 },
      email: String,
      note: { type: String, maxlength: 500 },
    },
    confirmationSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    dueSent: { type: Boolean, default: false },
    drive: { fileId: String, syncedAt: Date },
  },
  { timestamps: true },
);

export default mongoose.model("Post", PostSchema);

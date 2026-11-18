import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    notifyEnabled: { type: Boolean, default: true },
    notifyEmail: String,
    defaultLeadMinutes: { type: Number, default: 15, min: 0, max: 10080 },
    driveFolderId: String,
  },
  { timestamps: true },
);

export default mongoose.model("Settings", SettingsSchema);

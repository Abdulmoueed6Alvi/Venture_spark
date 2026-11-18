import toast from "react-hot-toast";

// Explains what happened to Drive sync + email after a create/update.
export function reportSaved(data, { markDriveExpired, verb = "saved" } = {}) {
  const parts = [`Post ${verb}`];
  const drive = data?.drive;
  if (drive?.synced) parts.push("synced to Google Drive");
  if (data?.emailSent) parts.push("confirmation email sent");
  toast.success(parts.join(" · "));

  if (drive && !drive.synced) {
    if (drive.reason === "auth_expired") {
      markDriveExpired?.();
      toast("Google Drive session expired. Click “Connect Drive” to sync again.", { icon: "⚠️", duration: 6000 });
    } else if (drive.reason === "not_connected") {
      toast("Not synced to Drive yet. Click “Connect Drive” in the top bar.", { icon: "☁️", duration: 5000 });
    } else {
      toast.error(`Drive sync failed: ${drive.message || "unknown error"}`);
    }
  }
}

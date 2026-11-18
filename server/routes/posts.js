import { Router } from "express";
import { body, param, query } from "express-validator";
import multer from "multer";
import requireAuth from "../middleware/requireAuth.js";
import { asyncHandler, validate } from "../middleware/common.js";
import { HttpError } from "../lib/httpError.js";
import Post from "../models/Post.js";
import Settings from "../models/Settings.js";
import { notify } from "../lib/notifications.js";
import { DriveAuthError, ensureFolder, upsertPostFile, deleteFile } from "../lib/drive.js";
import { uploadImage, signedImageUrl, removeImage } from "../lib/storage.js";

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function serialize(post, extra = {}) {
  const p = post.toObject ? post.toObject() : post;
  return {
    id: String(p._id),
    caption: p.caption,
    hashtags: p.hashtags || [],
    prompt: p.prompt,
    tone: p.tone,
    platform: p.platform,
    status: p.status,
    scheduledAt: p.scheduledAt,
    notify: p.notify,
    imagePath: p.imagePath,
    imageUrl: await signedImageUrl(p.imagePath),
    driveSynced: Boolean(p.drive?.fileId),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ...extra,
  };
}

async function syncToDrive(req, post) {
  const token = req.headers["x-google-token"];
  if (!token) return { synced: false, reason: "not_connected" };
  try {
    const settings = await Settings.findOne({ uid: req.user.uid });
    const folderId = await ensureFolder(token, settings?.driveFolderId);
    if (folderId !== settings?.driveFolderId) {
      await Settings.updateOne({ uid: req.user.uid }, { $set: { driveFolderId: folderId } }, { upsert: true });
    }
    const fileId = await upsertPostFile(token, folderId, post, post.drive?.fileId);
    post.drive = { fileId, syncedAt: new Date() };
    await post.save();
    return { synced: true };
  } catch (e) {
    if (e instanceof DriveAuthError) return { synced: false, reason: "auth_expired" };
    console.error("drive sync failed:", e.message);
    return { synced: false, reason: "error", message: e.message };
  }
}

const rules = (creating) => {
  const opt = (chain) => (creating ? chain.optional() : chain.optional());
  return [
    creating
      ? body("caption").isString().trim().isLength({ min: 1, max: 2200 }).withMessage("Caption is required (max 2200 characters)")
      : body("caption").optional().isString().trim().isLength({ min: 1, max: 2200 }).withMessage("Caption must be 1-2200 characters"),
    opt(body("hashtags")).isArray({ max: 15 }).withMessage("Hashtags must be a list of up to 15"),
    opt(body("hashtags.*")).isString().trim().isLength({ min: 1, max: 60 }).withMessage("Invalid hashtag"),
    opt(body("status")).isIn(["draft", "scheduled"]).withMessage("Status must be draft or scheduled"),
    opt(body("scheduledAt")).isISO8601().withMessage("Pick a valid date and time"),
    opt(body("platform")).isIn(["Instagram", "Twitter/X", "LinkedIn", "Facebook", "TikTok"]).withMessage("Invalid platform"),
    opt(body("prompt")).isString().isLength({ max: 500 }),
    opt(body("notify.enabled")).isBoolean().withMessage("notify.enabled must be true or false"),
    opt(body("notify.leadMinutes")).isInt({ min: 0, max: 10080 }).withMessage("Reminder must be 0-10080 minutes before"),
    opt(body("notify.email")).optional({ values: "falsy" }).isEmail().withMessage("Enter a valid notification email"),
    opt(body("notify.note")).isString().isLength({ max: 500 }).withMessage("Note must be 500 characters or fewer"),
  ];
};

function checkSchedule(status, scheduledAt) {
  if (status === "scheduled") {
    if (!scheduledAt) throw new HttpError(400, "Pick a date and time to schedule this post");
    if (new Date(scheduledAt).getTime() < Date.now() - 60_000) throw new HttpError(400, "Scheduled time must be in the future");
  }
}

function ownImage(uid, imagePath) {
  if (imagePath && !imagePath.startsWith(`${uid}/`)) throw new HttpError(400, "Invalid image");
}

// ---- image upload (Supabase Storage) ----
router.post("/upload", upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Choose an image to upload");
  const path = await uploadImage(req.user.uid, req.file);
  res.status(201).json({ path, url: await signedImageUrl(path) });
}));

// ---- CREATE ----
router.post("/", rules(true), validate, asyncHandler(async (req, res) => {
  const { caption, hashtags = [], prompt, tone, platform, imagePath, scheduledAt, notify: n = {} } = req.body;
  const status = req.body.status || "draft";
  checkSchedule(status, scheduledAt);
  ownImage(req.user.uid, imagePath);

  const settings = await Settings.findOne({ uid: req.user.uid }).lean();
  const post = await Post.create({
    uid: req.user.uid,
    ownerEmail: req.user.email,
    caption, hashtags, prompt, tone, platform, imagePath,
    status,
    scheduledAt: status === "scheduled" ? new Date(scheduledAt) : scheduledAt ? new Date(scheduledAt) : undefined,
    notify: {
      enabled: n.enabled ?? settings?.notifyEnabled ?? true,
      leadMinutes: n.leadMinutes ?? settings?.defaultLeadMinutes ?? 15,
      email: n.email || undefined,
      note: n.note || undefined,
    },
  });

  let emailSent = false;
  if (post.status === "scheduled") {
    try { emailSent = await notify(post, "confirmation"); if (emailSent) { post.confirmationSent = true; await post.save(); } }
    catch (e) { console.error("confirmation mail failed:", e.message); }
  }
  const drive = await syncToDrive(req, post);
  res.status(201).json(await serialize(post, { emailSent, drive }));
}));

// ---- READ (list + one) ----
router.get("/", query("status").optional().isIn(["draft", "scheduled", "published"]), validate, asyncHandler(async (req, res) => {
  const filter = { uid: req.user.uid };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.caption = { $regex: String(req.query.q).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const posts = await Post.find(filter).sort({ scheduledAt: -1, createdAt: -1 }).limit(200);
  res.json(await Promise.all(posts.map((p) => serialize(p))));
}));

router.get("/:id", param("id").isMongoId().withMessage("Invalid id"), validate, asyncHandler(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, uid: req.user.uid });
  if (!post) throw new HttpError(404, "Post not found");
  res.json(await serialize(post));
}));

// ---- UPDATE ----
router.put("/:id", param("id").isMongoId().withMessage("Invalid id"), rules(false), validate, asyncHandler(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, uid: req.user.uid });
  if (!post) throw new HttpError(404, "Post not found");

  const b = req.body;
  const status = b.status ?? post.status;
  const when = b.scheduledAt ?? post.scheduledAt;
  const rescheduled = b.scheduledAt !== undefined || b.status !== undefined || b.notify?.leadMinutes !== undefined;
  if (rescheduled && status === "scheduled") checkSchedule("scheduled", when);
  if (b.imagePath !== undefined) {
    ownImage(req.user.uid, b.imagePath);
    if (post.imagePath && post.imagePath !== b.imagePath) await removeImage(post.imagePath);
    post.imagePath = b.imagePath || undefined;
  }

  for (const k of ["caption", "hashtags", "prompt", "platform"]) if (b[k] !== undefined) post[k] = b[k];
  if (b.notify) {
    for (const k of ["enabled", "leadMinutes", "email", "note"]) if (b.notify[k] !== undefined) post.notify[k] = b.notify[k] || (k === "enabled" ? false : undefined);
    post.markModified("notify");
  }
  if (b.scheduledAt !== undefined) post.scheduledAt = new Date(b.scheduledAt);
  post.status = status;
  if (rescheduled) { post.reminderSent = false; post.dueSent = false; }

  await post.save();
  let emailSent = false;
  if (rescheduled && post.status === "scheduled") {
    try { emailSent = await notify(post, "confirmation"); } catch (e) { console.error("confirmation mail failed:", e.message); }
  }
  const drive = await syncToDrive(req, post);
  res.json(await serialize(post, { emailSent, drive }));
}));

// ---- DELETE ----
router.delete("/:id", param("id").isMongoId().withMessage("Invalid id"), validate, asyncHandler(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, uid: req.user.uid });
  if (!post) throw new HttpError(404, "Post not found");

  let drive = { synced: false, reason: "not_connected" };
  const token = req.headers["x-google-token"];
  if (post.drive?.fileId && token) {
    try { await deleteFile(token, post.drive.fileId); drive = { removed: true }; }
    catch (e) { drive = { removed: false, reason: e instanceof DriveAuthError ? "auth_expired" : "error" }; }
  }
  await removeImage(post.imagePath);
  await post.deleteOne();
  res.json({ ok: true, drive });
}));

export default router;

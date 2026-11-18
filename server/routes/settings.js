import { Router } from "express";
import { body } from "express-validator";
import requireAuth from "../middleware/requireAuth.js";
import { asyncHandler, validate } from "../middleware/common.js";
import Settings from "../models/Settings.js";

const router = Router();

const view = (s, user) => ({
  notifyEnabled: s?.notifyEnabled ?? true,
  notifyEmail: s?.notifyEmail || user.email || "",
  defaultLeadMinutes: s?.defaultLeadMinutes ?? 15,
});

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  res.json(view(await Settings.findOne({ uid: req.user.uid }).lean(), req.user));
}));

router.put(
  "/",
  requireAuth,
  body("notifyEnabled").optional().isBoolean().withMessage("notifyEnabled must be true or false"),
  body("notifyEmail").optional({ values: "falsy" }).isEmail().withMessage("Enter a valid email address"),
  body("defaultLeadMinutes").optional().isInt({ min: 0, max: 10080 }).withMessage("Lead time must be 0-10080 minutes"),
  validate,
  asyncHandler(async (req, res) => {
    const { notifyEnabled, notifyEmail, defaultLeadMinutes } = req.body;
    const update = {};
    if (notifyEnabled !== undefined) update.notifyEnabled = notifyEnabled;
    if (notifyEmail !== undefined) update.notifyEmail = notifyEmail;
    if (defaultLeadMinutes !== undefined) update.defaultLeadMinutes = Number(defaultLeadMinutes);
    const s = await Settings.findOneAndUpdate({ uid: req.user.uid }, { $set: update }, { returnDocument: "after", upsert: true }).lean();
    res.json(view(s, req.user));
  }),
);

export default router;

import { Router } from "express";
import { body } from "express-validator";
import requireAuth from "../middleware/requireAuth.js";
import { asyncHandler, validate, rateLimit } from "../middleware/common.js";
import { generateCaptions } from "../lib/gemini.js";

const router = Router();

router.post(
  "/captions",
  requireAuth,
  rateLimit("ai", 12, 60),
  body("prompt").isString().trim().isLength({ min: 3, max: 500 }).withMessage("Describe your post in 3-500 characters"),
  body("tone").optional().isIn(["friendly", "professional", "funny", "inspirational", "bold"]).withMessage("Invalid tone"),
  body("platform").optional().isIn(["Instagram", "Twitter/X", "LinkedIn", "Facebook", "TikTok"]).withMessage("Invalid platform"),
  validate,
  asyncHandler(async (req, res) => {
    const { prompt, tone, platform } = req.body;
    const result = await generateCaptions({ prompt, tone, platform, count: 3 });
    res.json(result);
  }),
);

export default router;

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import aiRoutes from "./routes/ai.js";
import postRoutes from "./routes/posts.js";
import settingsRoutes from "./routes/settings.js";
import { errorHandler } from "./middleware/common.js";
import { startScheduler, tick } from "./lib/notifications.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim()),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-google-token"],
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/ai", aiRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/settings", settingsRoutes);

// Secret-protected helpers (owner only). Recipient is always SMTP_USER.
const secretOk = (req) => process.env.JWT_SECRET && req.headers["x-diag-secret"] === process.env.JWT_SECRET;

app.post("/api/diagnostics/test-email", async (req, res) => {
  if (!secretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { sendMail } = await import("./lib/mailer.js");
    const info = await sendMail({
      to: process.env.SMTP_USER,
      subject: "Venture Spark: LIVE server test email",
      html: "<h2>Venture Spark</h2><p>Ye email Render (live backend) se aayi hai ✅</p>",
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Lets an external pinger (e.g. cron-job.org) wake the free Render instance and run due reminders.
app.post("/api/cron/tick", async (req, res) => {
  if (!secretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  res.json(await tick());
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => console.log(`Server on ${port}`));
    startScheduler();
  })
  .catch((e) => console.error("DB error:", e.message));

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Diagnostic: protected by JWT_SECRET header, always sends only to SMTP_USER (the owner).
app.post("/api/diagnostics/test-email", async (req, res) => {
  if (!process.env.JWT_SECRET || req.headers["x-diag-secret"] !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
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

const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(port, () => console.log(`Server on ${port}`)))
  .catch((e) => console.error("DB error:", e.message));

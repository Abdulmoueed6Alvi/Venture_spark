import Post from "../models/Post.js";
import Settings from "../models/Settings.js";
import { sendMail } from "./mailer.js";

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (d) => (d ? new Date(d).toUTCString().replace("GMT", "UTC") : "—");

function layout(title, intro, post) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
  <h2 style="margin:0 0 8px">${esc(title)}</h2><p style="color:#555">${intro}</p>
  <div style="border:1px solid #e5e5e5;border-radius:10px;padding:14px;background:#fafafa">
    <p style="margin:0 0 8px;white-space:pre-wrap">${esc(post.caption)}</p>
    <p style="margin:0;color:#6d28d9">${esc((post.hashtags || []).join(" "))}</p>
  </div>
  <p style="color:#555">Scheduled for: <b>${esc(fmt(post.scheduledAt))}</b> · ${esc(post.platform || "")}</p>
  ${post.notify?.note ? `<p style="color:#555">Your note: <i>${esc(post.notify.note)}</i></p>` : ""}
  <p style="color:#999;font-size:12px">Sent by Venture Spark</p></div>`;
}

const templates = {
  confirmation: (p) => ({ subject: "Post scheduled ✅", html: layout("Your post is scheduled", "We saved it and will remind you before it is due.", p) }),
  reminder: (p) => ({ subject: `Reminder: post due in ${p.notify.leadMinutes} min ⏰`, html: layout("Your post is coming up", `It is due in about ${p.notify.leadMinutes} minutes.`, p) }),
  due: (p) => ({ subject: "It's time to post 🚀", html: layout("It's time to post", "Your scheduled post is now due and marked as published.", p) }),
};

export async function recipientFor(post) {
  if (post.notify?.email) return post.notify.email;
  const s = await Settings.findOne({ uid: post.uid }).lean();
  return s?.notifyEmail || post.ownerEmail;
}

export async function notify(post, kind) {
  if (!post.notify?.enabled) return false;
  const to = await recipientFor(post);
  if (!to) return false;
  const { subject, html } = templates[kind](post);
  await sendMail({ to, subject: `Venture Spark: ${subject}`, html });
  return true;
}

// Called every 30s. Atomic claims make it safe if two ticks overlap.
export async function tick(now = new Date()) {
  const out = { reminders: 0, due: 0, errors: 0 };

  for (;;) {
    const p = await Post.findOneAndUpdate(
      {
        status: "scheduled", reminderSent: false, "notify.enabled": true,
        $expr: { $lte: [{ $subtract: ["$scheduledAt", { $multiply: ["$notify.leadMinutes", 60000] }] }, now] },
        scheduledAt: { $gt: now },
      },
      { reminderSent: true },
      { returnDocument: "after" },
    );
    if (!p) break;
    try { await notify(p, "reminder"); out.reminders++; } catch (e) { out.errors++; console.error("reminder mail failed:", e.message); }
  }

  for (;;) {
    const p = await Post.findOneAndUpdate(
      { status: "scheduled", scheduledAt: { $lte: now } },
      { status: "published", dueSent: true, reminderSent: true },
      { returnDocument: "after" },
    );
    if (!p) break;
    try { await notify(p, "due"); out.due++; } catch (e) { out.errors++; console.error("due mail failed:", e.message); }
  }
  return out;
}

export function startScheduler() {
  setInterval(() => tick().catch((e) => console.error("scheduler:", e.message)), 30000);
  console.log("Scheduler running (every 30s)");
}

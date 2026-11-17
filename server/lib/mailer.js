import nodemailer from "nodemailer";

// SMTP transport (works locally; blocked on Render free plan).
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// "Name <a@b.com>" -> { name, email }
const parseFrom = (from = "") => {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || undefined, email: m[2].trim() } : { email: from.trim() };
};

// Brevo transactional email over HTTPS (port 443), works on Render free plan.
async function sendViaBrevo({ to, subject, html, text }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseFrom(process.env.MAIL_FROM || process.env.SMTP_USER),
      to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${data.message || "send failed"}`);
  return { messageId: data.messageId };
}

export const sendMail = (opts) =>
  process.env.BREVO_API_KEY
    ? sendViaBrevo(opts)
    : transporter.sendMail({ from: process.env.MAIL_FROM, ...opts });

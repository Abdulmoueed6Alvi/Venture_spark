import "dotenv/config";
import { transporter, sendMail } from "../lib/mailer.js";

try {
  await transporter.verify();
  console.log("SMTP login OK");
  const info = await sendMail({
    to: process.env.SMTP_USER,
    subject: "Venture Spark: test email",
    html: "<h2>Venture Spark</h2><p>Email setup kaam kar raha hai ✅</p>",
  });
  console.log("Mail sent OK, id:", info.messageId);
} catch (e) { console.log("Mail FAIL:", e.message); }

import { HttpError } from "./httpError.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callModel(model, body) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Gemini error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const cleanTag = (t) => "#" + String(t).replace(/[^\p{L}\p{N}_]/gu, "");

function normalise(parsed, count) {
  const list = Array.isArray(parsed) ? parsed : parsed?.options;
  if (!Array.isArray(list)) throw new Error("Unexpected AI response shape");
  return list
    .map((o) => ({
      caption: String(o.caption ?? "").trim().slice(0, 2000),
      hashtags: (Array.isArray(o.hashtags) ? o.hashtags : [])
        .map(cleanTag)
        .filter((t) => t.length > 1)
        .slice(0, 8),
    }))
    .filter((o) => o.caption)
    .slice(0, count);
}

export async function generateCaptions({ prompt, tone = "friendly", platform = "Instagram", count = 3 }) {
  if (!process.env.GEMINI_API_KEY) throw new HttpError(503, "AI is not configured on the server (missing GEMINI_API_KEY).");

  const instruction =
    `You are a social media copywriter. Write exactly ${count} different ${platform} caption options ` +
    `for the topic below, in a ${tone} tone. Each option must have a catchy caption (no hashtags inside it) ` +
    `and 3 to 6 relevant hashtags (without the # symbol). Reply as JSON: ` +
    `{"options":[{"caption":"...","hashtags":["..."]}]}.\n\nTopic: ${prompt}`;

  const body = {
    contents: [{ parts: [{ text: instruction }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
  };

  const models = [process.env.GEMINI_MODEL || "gemini-3.1-flash-lite", process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);
  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await callModel(model, body);
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        const options = normalise(JSON.parse(text), count);
        if (!options.length) throw new Error("AI returned no captions");
        return { options, model };
      } catch (e) {
        lastErr = e;
        const retryable = e.status === 503 || e.status === 429;
        if (retryable && attempt === 0) { await sleep(800); continue; }
        break; // try next model
      }
    }
  }
  const status = lastErr?.status === 429 ? 429 : 502;
  throw new HttpError(status, status === 429
    ? "The AI service is rate limited right now. Please try again in a minute."
    : "The AI service could not generate captions right now. Please try again.");
}

# Venture Spark: AI Social Media Caption Generator & Scheduler

Generate social media captions with Google Gemini, pick one, schedule it, get email reminders, and keep every draft synced to your Google Drive.

**Live app:** https://venture-spark-eight.vercel.app
**API:** https://venture-spark-api.onrender.com/api/health

> The API runs on Render's free plan and sleeps after ~15 min idle. The first request after that can take up to a minute.

---

## Features (mapped to the brief)

| Requirement | How it is done |
|---|---|
| **AI caption generator** | Topic + tone + platform → Gemini returns 3 captions with hashtags. Fallback model, retries, 15 s timeout, per-user rate limit (Redis) and clear error/retry UI. |
| **Google Drive storage & scheduler** | Pick a caption, edit it, pick a date/time. Each post is saved in MongoDB and synced as `post-<id>.json` into a **“Venture Spark Posts”** folder in the user's Drive (created on first save). Edits update the file, deletes remove it. Uses the least-privilege `drive.file` scope. |
| **Feed / list preview** | “My posts”: filter by Draft / Scheduled / Published, search, edit in a modal, delete with confirmation. Shows status, platform, Drive sync state, schedule time and reminder. |
| **Email notifications & customisation** | Confirmation when scheduled, reminder *N* minutes before, and “time to post” when due. Per post: on/off, minutes before, recipient email, task note. Global defaults on the Settings page. |
| **Deployment** | Frontend on Vercel, API on Render. Auto-deploy on push to `main`. |

### Competition rubric coverage
- **Auth:** Firebase Auth (email/password sign-up & sign-in, Google sign-in), logout, protected client routes, and every API route verifies the Firebase ID token (`server/middleware/requireAuth.js`).
- **Database & CRUD:** MongoDB Atlas via Mongoose: create, read (list + one), update, delete posts; upsert settings. Users can only access their own posts.
- **Cloud storage:** Optional post image upload to Supabase Storage (private bucket, signed URLs, 5 MB / image-type checks, path ownership check).
- **External API:** Google Gemini (captions) and Google Drive REST API, plus Brevo email API.
- **Validation:** Client (react-hook-form + zod) and server (express-validator) with readable messages.

---

## Architecture

```
React (Vite, Tailwind)  ──Firebase ID token──►  Express API (Render)
  │  Firebase Auth (popup also returns              ├─ MongoDB Atlas  (posts, settings)
  │  a Google Drive access token)                   ├─ Redis          (rate limit, keys "vs:*")
  │                                                 ├─ Supabase       (post images)
  └─ x-google-token header ───────────────────────► ├─ Google Drive   (post JSON backups)
                                                    ├─ Gemini API     (captions)
                                                    └─ Brevo API      (emails) ◄─ scheduler (every 30 s)
```

```
client/src
  components/   AppShell (collapsible sidebar), PostEditor, ui (Button, Modal, ...)
  context/      AuthContext (Firebase auth + Drive token)
  lib/          api (axios + auth headers), firebase, theme
  pages/        Login, Create, Posts, Settings
server
  routes/       ai.js, posts.js, settings.js
  lib/          gemini, drive, storage, notifications (emails + scheduler), mailer, redis, supabase
  models/       Post, Settings
  middleware/   requireAuth, common (validate, rateLimit, errorHandler)
```

### API

All routes need `Authorization: Bearer <Firebase ID token>`. Drive sync additionally uses `x-google-token`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai/captions` | `{ prompt, tone, platform }` → `{ options: [{ caption, hashtags }] }` |
| GET | `/api/posts?status=&q=` | List own posts |
| GET | `/api/posts/:id` | One post |
| POST | `/api/posts` | Create (draft or scheduled) |
| PUT | `/api/posts/:id` | Update |
| DELETE | `/api/posts/:id` | Delete (also removes Drive file and image) |
| POST | `/api/posts/upload` | Multipart `image` → Supabase |
| GET/PUT | `/api/settings` | Notification defaults |
| POST | `/api/cron/tick` | Run due reminders now (header `x-diag-secret`), for an external pinger |

---

## Run locally

Requirements: Node 20+, and accounts for MongoDB Atlas, Redis, Supabase, Firebase, Google AI Studio (Gemini) and Brevo.

```bash
git clone https://github.com/Abdulmoueed6Alvi/Venture_spark.git
cd Venture_spark

# API
cd server
cp .env.example .env      # fill in the values (see below)
npm install
npm run dev               # http://localhost:5000

# Web (new terminal)
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Useful checks: `npm run test:services` (Redis + Supabase), `node scripts/test-db.js` (Mongo + Redis), `npm run test:mail` (email).

### Environment variables

**server/.env** (see `server/.env.example`)

| Variable | What it is |
|---|---|
| `PORT` | API port (Render sets it automatically) |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS, comma-separated |
| `JWT_SECRET` | Secret for owner-only diagnostic and cron routes |
| `MONGO_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Redis connection URL |
| `FIREBASE_PROJECT_ID` | Firebase project id (to verify ID tokens) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Supabase project URL and secret key (server only) |
| `SUPABASE_BUCKET` | Bucket for post images (`images`) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Gemini models to use |
| `BREVO_API_KEY` | Brevo API key (Transactional email permission only) |
| `MAIL_FROM` | Sender, must be verified in Brevo |
| `SMTP_*` | Optional SMTP fallback when Brevo is not set |

**client/.env** (see `client/.env.example`)

| Variable | What it is |
|---|---|
| `VITE_API_URL` | API base URL |
| `VITE_FIREBASE_*` | Firebase web app config |

### One-time cloud setup
1. **Firebase:** enable Email/Password and Google providers; add your Vercel domain under *Authentication → Settings → Authorized domains*.
2. **Google Cloud (same project as Firebase):** enable the **Google Drive API**.
3. **Supabase:** create the `images` bucket (private).
4. **MongoDB Atlas:** allow network access from your host (Render uses dynamic IPs).
5. **Brevo:** verify the sender email and create an API key with *Transactional email* permission.

---

## Deployment
- **Vercel** (frontend): root directory `client`, framework Vite, env vars `VITE_*`. `client/vercel.json` rewrites all routes to `index.html` for client-side routing.
- **Render** (API): root directory `server`, build `npm install`, start `npm start`, env vars from the table above.
- Free Render instances sleep, so the in-process scheduler pauses too. For reliable reminders, point a free pinger (e.g. cron-job.org) at `POST /api/cron/tick` every few minutes with the `x-diag-secret` header.

## Security notes
- No secrets in the repo: `.env` files and the local credentials folder are git-ignored. Only `.env.example` templates are committed.
- Server-side ownership checks on every post and image path; Drive access limited to files this app created (`drive.file`).
- Helmet, CORS allow-list, JSON body size limit, Redis rate limit on AI requests.

## Screenshots
See [`docs/screenshots`](docs/screenshots) for the step-by-step flow: sign in → generate → pick & schedule → my posts → edit/delete → settings.

# PulsePing (Web)

A dark-mode uptime & latency monitor for founders who need to know their platform is live — without refreshing a browser tab.

## Stack

- **Backend:** Node.js + Express + Mongoose (MongoDB)
- **Auth:** JWT + bcrypt
- **Health checks:** `node-cron` sweeps every 30s, axios does the actual request
- **Frontend:** Plain HTML/CSS/JS (no build step), Chart.js via CDN for latency graphs

## How the monitoring actually works

1. Every monitor has its own `intervalSeconds` (min 30s).
2. `services/pingService.js` runs a cron job every 30 seconds. On each tick it finds monitors that are "due" (i.e. `now - lastCheckedAt >= intervalSeconds`) and pings them in parallel.
3. Each check makes an HTTP request to the monitor's URL, measures latency with `process.hrtime`, and classifies status as `up` (2xx–3xx) or `down` (anything else, timeout, or network error).
4. The result is written to `PingLog` (full history) and cached onto the `Monitor` document (`status`, `lastLatencyMs`, `lastCheckedAt`) so the dashboard list doesn't need to aggregate on every page load.
5. `Monitor.totalChecks` / `totalUpChecks` are running counters — uptime % is O(1) to compute instead of scanning ping history every time.

## Local setup

```bash
cd pulseping
npm install
cp .env.example .env
# edit .env: set MONGO_URI (Atlas or local), JWT_SECRET
npm run dev    # nodemon, or `npm start` for plain node
```

Visit `http://localhost:5000`.

You'll need a MongoDB connection string — either a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (same pattern you used for ChatApp) or a local `mongod`.

## Deploying (Railway — same flow as your other projects)

1. Push this folder to a GitHub repo.
2. On [Railway](https://railway.app), "New Project" → "Deploy from GitHub repo".
3. Add environment variables in Railway's dashboard: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` (Railway sets `PORT` automatically, but `server.js` falls back to it correctly either way).
4. Railway auto-detects `npm start` from `package.json` — no extra config needed.
5. Once deployed, your app is live at `https://<your-app>.up.railway.app`. Public status pages will be shareable at `.../s/<slug>`.

## API reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Log in, get JWT |
| GET | `/api/auth/me` | ✔ | Current user |
| GET | `/api/monitors` | ✔ | List your monitors |
| POST | `/api/monitors` | ✔ | Create a monitor |
| GET | `/api/monitors/:id` | ✔ | Monitor detail |
| PUT | `/api/monitors/:id` | ✔ | Update a monitor |
| DELETE | `/api/monitors/:id` | ✔ | Delete a monitor + its history |
| GET | `/api/monitors/:id/pings?limit=50` | ✔ | Latency history for charting |
| POST | `/api/monitors/:id/check-now` | ✔ | Force an immediate check |
| GET | `/api/status/:slug` | — | Public status data (no login) |

## What's next: the iOS companion app

This backend is designed to be consumed by both the web dashboard (already built) and a native SwiftUI app. The pieces that matter for that phase:

- `GET /api/monitors` and `GET /api/status/:slug` are the two endpoints the iOS app and its widgets will poll.
- JWT auth works the same way from Swift — store the token in Keychain, send it as `Authorization: Bearer <token>`.
- For the Home Screen Widget, `WidgetKit`'s `TimelineProvider` will call `GET /api/status/:slug` (public, no auth needed — simplest path for widgets) on a timeline refresh policy.
- For push notifications on status change, we'll add an `APNs` device-token field to `User`, and trigger a push from `pingService.js` whenever a monitor's status flips `up` → `down` or back.

We'll scope and build that as its own phase once the web app is deployed and you've kicked the tyres on it.

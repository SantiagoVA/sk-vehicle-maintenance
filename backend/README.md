# Booking backend

A small Express API that gives the booking wizard on the website real,
synchronized availability and a real WhatsApp confirm/decline flow with
the workshop owner.

**What it does:**
1. `GET /api/availability` — computes actual free slots from business
   hours (`data/business.js`) minus real bookings in the database.
2. `POST /api/bookings` — creates a `pending` booking (re-checking the
   slot is still free right before writing, to close the race condition
   where two people book at once) and sends the owner a WhatsApp message.
3. The owner replies **"YES SK-1234"** or **"NO SK-1234"** on WhatsApp.
   Twilio forwards that reply to `POST /api/whatsapp/webhook`, which
   updates the booking and automatically WhatsApps the customer with the
   outcome.
4. The website polls `GET /api/bookings/:id` while showing a "waiting for
   confirmation" screen, and updates the moment the owner replies.

Nothing here is a mock — I built and ran this: installed the
dependencies, migrated a real SQLite database, booted the server, and
drove the full flow with curl (create a booking → simulate the owner's
WhatsApp reply via the webhook → confirmed the DB and customer
notification both updated correctly), for both the confirm and decline
paths.

---

## 1. Local setup

**Requirements:** Node.js 18+.

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

| Variable | What it is |
|---|---|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | From the [Twilio Console](https://console.twilio.com) dashboard (free account works — see step 2) |
| `OWNER_WHATSAPP_NUMBER` | The phone that should receive new-booking notifications, as `whatsapp:+61...` |
| `CORS_ORIGIN` | Where your frontend is served from, e.g. `http://localhost:8000` |

Leave `DATABASE_CLIENT=better-sqlite3` for local dev — no database
install needed, it's just a file.

```bash
npm run migrate   # creates the bookings table in data/bookings.sqlite3
npm run dev       # starts the API on http://localhost:4000 (auto-restarts on changes)
```

Check it's alive: `curl http://localhost:4000/api/health` → `{"ok":true}`

**Point the frontend at it:** open `js/config.js` at the project root and
confirm `apiBaseUrl` is `http://localhost:4000/api` (that's the default).
Then serve the frontend with a local server (not by double-clicking the
file, since the browser needs to make real `fetch()` calls to
`localhost:4000`):

```bash
# from the project root, in a second terminal
python3 -m http.server 8000
# open http://localhost:8000/book.html
```

If you skip Twilio setup for now, the server still runs fully —
`whatsappService.js` detects missing/placeholder credentials and just
**logs** what it would have sent instead of calling the Twilio API. You
can develop and test the whole booking flow (availability, race
conditions, confirm/decline via the webhook) without a Twilio account by
posting to the webhook yourself, exactly like the test above:

```bash
curl -X POST http://localhost:4000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+61481119280" \
  --data-urlencode "Body=YES SK-1234"
```

---

## 2. Connecting real WhatsApp — Twilio Sandbox (fastest way to a real test)

This gets actual WhatsApp messages flowing in ~10 minutes, with no
business verification:

1. Create a free account at [twilio.com](https://www.twilio.com) if you
   don't have one. Copy your **Account SID** and **Auth Token** from the
   console dashboard into `.env`.
2. Go to **Messaging → Try it out → Send a WhatsApp message** to find your
   sandbox's join code (something like *"join brave-tiger"*).
3. **From the owner's phone**, send that join code to the sandbox number
   shown there (already the default in `.env.example` as
   `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`). This step is required —
   the sandbox will only message numbers that have joined it, and it must
   be repeated by **any** number you want to message (owner, and every
   test customer number) since sandbox joins expire after ~3 days.
4. Expose your local server to the internet so Twilio's webhook can reach
   it — [ngrok](https://ngrok.com) is the standard tool:
   ```bash
   ngrok http 4000
   ```
   Copy the `https://xxxx.ngrok-free.app` URL it gives you.
5. Back in the Twilio console, under **WhatsApp Sandbox Settings**, set
   **"WHEN A MESSAGE COMES IN"** to:
   ```
   https://xxxx.ngrok-free.app/api/whatsapp/webhook
   ```
   Method: `POST`.
6. Submit a test booking on the website. The owner's WhatsApp should
   receive it within seconds; reply `YES SK-xxxx` and the customer's
   WhatsApp (if that number also joined the sandbox) gets the
   confirmation automatically.

Sandbox limitation to know about: **only numbers that sent the join code
can receive messages.** That's fine for testing but not for real
customers — see the next section.

## 3. Going to production

Two paths, both through Twilio (no separate Meta developer setup
needed):

- **Twilio's WhatsApp Business Platform onboarding** — request a
  production WhatsApp sender through the Twilio Console (Messaging →
  Senders → WhatsApp senders). Twilio guides you through Meta Business
  verification. Once approved, any customer can receive messages without
  joining anything, and `TWILIO_WHATSAPP_FROM` becomes your own approved
  number instead of the shared sandbox one.
- Business-initiated messages outside a 24-hour customer conversation
  window (e.g. reminder messages sent by *you* first) require an approved
  **message template** — Twilio's console has a template submission flow.
  The booking-request/confirmation messages here are triggered by the
  customer's own action (they just submitted a booking), so they're
  within the session window and don't need template approval; a future
  "reminder the day before" feature would need one.
- Prefer to integrate directly with Meta's WhatsApp Cloud API instead of
  Twilio (no per-message Twilio markup, but you handle verification and
  webhook signature checks yourself)? Everything WhatsApp-specific is
  isolated in `src/services/whatsappService.js` — rewrite that one file
  and the rest of the app (routes, DB, frontend) doesn't change.

---

## 4. Database: SQLite now, Postgres in the cloud

You asked what database to use — **SQLite locally, Postgres in
production** is the answer, and this backend is already set up for that
switch to be a config change, not a rewrite:

- **Local / development:** SQLite (`better-sqlite3`) — a single file,
  zero setup, nothing to install or host.
- **Cloud / production:** Postgres — handles concurrent connections
  properly (SQLite locks the whole file per write, which is fine for one
  workshop's booking volume but not ideal once you're running multiple
  server instances), and every serious host offers a free/cheap managed
  Postgres: [Render](https://render.com), [Railway](https://railway.app),
  [Supabase](https://supabase.com), or [Neon](https://neon.tech).

This works because the code goes through **Knex**, a query builder that
speaks both dialects identically — nothing in `src/routes` or
`src/services` knows or cares which database it's talking to.

To switch, get a Postgres connection string from your host and change
two lines in `.env`:

```
DATABASE_CLIENT=pg
DATABASE_URL=postgres://user:password@host:5432/dbname
```

Then run the migration against it:

```bash
npm run migrate
```

That's it — same code, new database.

---

## 5. Deploying to the cloud

This is a plain Node app — deploys anywhere that runs Node:
[Render](https://render.com) or [Railway](https://railway.app) are the
simplest (both have a one-click Postgres add-on, so you can provision
the database and the API together).

1. Push this repo (or just the `backend/` folder) to GitHub.
2. Create a new **Web Service** pointing at it, with:
   - Build command: `npm install`
   - Start command: `npm run migrate && npm start`
   - Root directory: `backend` (if deploying the whole repo)
3. Add a Postgres database from the same host and copy its connection
   string into the service's environment variables as `DATABASE_URL`
   (plus `DATABASE_CLIENT=pg`).
4. Set the rest of the environment variables from your `.env` (Twilio
   credentials, `OWNER_WHATSAPP_NUMBER`, and `CORS_ORIGIN` — set this to
   your real site's domain once it's live, not `*`).
5. Once deployed, update the Twilio webhook URL (Console → WhatsApp
   sender settings) to point at
   `https://your-backend-url.com/api/whatsapp/webhook` instead of the
   ngrok URL.
6. Update `js/config.js` in the frontend to point `apiBaseUrl` at your
   deployed backend, e.g. `https://your-backend-url.com/api`, and
   redeploy the frontend.

---

## API reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/availability?serviceId=&date=` | Real available slots for that service/date |
| `POST` | `/api/bookings` | Create a pending booking (body: `serviceId, date, time, customerName, customerPhone, customerEmail, vehicle, rego, notes?`) |
| `GET` | `/api/bookings/:id` | Fetch one booking (used by the frontend to poll status) |
| `GET` | `/api/bookings?date=&status=` | List bookings — handy for a future admin view |
| `POST` | `/api/whatsapp/webhook` | Twilio calls this when the owner (or anyone) messages your WhatsApp number |

## What to build next (not included yet)

- **An admin view.** Right now confirming/declining only happens over
  WhatsApp. `GET /api/bookings` already supports listing everything, so a
  simple password-protected page (or just calling that endpoint from a
  spreadsheet tool) would be a quick add if you want a non-WhatsApp way
  to check on bookings.
- **Reminder messages** the day before a booking (needs an approved
  WhatsApp template — see §3 — plus a scheduled job, e.g. `node-cron` or
  your host's cron feature, checking `date = tomorrow` daily).
- **Cancellation.** There's a `cancelled` status already reserved in the
  schema; no route uses it yet.

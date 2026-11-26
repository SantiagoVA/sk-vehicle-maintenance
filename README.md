# Vehicle Maintenance Site — with real booking backend

A two-page marketing + booking site for a vehicle maintenance / mechanic
business, plus a working backend: real availability from a database, and
a WhatsApp confirm/decline flow with the workshop owner.

- **Frontend** (`/`) — plain HTML/CSS/JavaScript, no build step, no
  framework. Home page + a 3-step booking wizard, EN/ES language switch,
  WhatsApp click-to-chat.
- **Backend** (`/backend`) — Node/Express API + a real database
  (SQLite locally, Postgres in the cloud) + Twilio WhatsApp integration.
  See **`backend/README.md`** for full setup — that's the part that turns
  this from a static demo into something that actually takes bookings.

**The frontend alone (without running the backend) still opens and looks
right, but the booking wizard needs the backend running to fetch real
availability and submit bookings** — see [Running it locally](#running-it-locally).

---

## What's included

| Path | Purpose |
|---|---|
| `index.html` | Home page: hero, services grid, why-us, how-it-works, reviews, CTA band, footer with hours/contact/map |
| `book.html` | 3-step booking wizard: choose service → pick date & time (live availability from the API) → enter details → submit → waits for the owner's WhatsApp confirm/decline |
| `backend/` | The API — see `backend/README.md` |

### Design concept — "The Job Card"

Every workshop hands you a paper docket when you drop off your car: a
ticket number, a checklist, a status stamp. That object is this site's
visual signature — the same `.ticket` component (torn/punched edges,
dashed rules, monospaced ticket number) is reused for the hero panel,
the sample inspection report, and the live booking summary, so the
booking flow visually *is* the job card being filled out.

- **Colors** — near-black "bay" charcoal, concrete-grey background,
  amber accent (hazard/caution tone), teal secondary accent, red
  reserved only for "fail" states. See the token table at the top of
  `css/styles.css`.
- **Type** — `Oswald` (condensed, uppercase, signage-like) for
  headings, `Work Sans` for body copy, `IBM Plex Mono` for ticket
  numbers, prices, and time slots.

## File structure

```
vehicle-maintenance-site/
├── index.html            Home page (markup + data-hooks, no hardcoded content)
├── book.html              Booking wizard page — calls the backend API
├── css/
│   └── styles.css         All styling — one file, organized by component
├── js/
│   ├── main.js             Renders index.html's dynamic sections from business.js
│   ├── booking.js           Booking wizard: steps, live availability, submit, poll for owner's decision
│   ├── i18n.js               EN/ES text switching (shared by both pages)
│   └── config.js              apiBaseUrl — the one line to change when you deploy the backend
├── data/
│   └── business.js         ← EDIT THIS to rebrand the whole site (shared with the backend too)
├── assets/
│   ├── logo.svg             Brand mark (used in nav + footer)
│   ├── favicon.svg
│   └── icons.svg            Reference copy of the icon sprite (see note below)
├── backend/                 The booking API — see backend/README.md
│   ├── src/                   Express routes, DB access, availability + WhatsApp logic
│   ├── knexfile.js             DB connection config (SQLite locally / Postgres in the cloud)
│   └── .env.example             Copy to .env and fill in (Twilio, DB, CORS)
└── README.md
```

## Customizing for your business

**Almost everything you'd want to change lives in one file:
`data/business.js`.** It's a plain JavaScript object assigned to
`window.BUSINESS` in the browser **and** a regular `require()`-able
module in the backend — the same file is the single source of truth for
both, so services/prices/hours can never drift out of sync between the
site and the booking logic.

```js
window.BUSINESS = {
  business: {
    name: "SK Vehicle Maintenance",
    phoneDisplay: "0481 119 280",
    whatsappLink: "https://wa.me/61481119280",
    address: { line1: "Unit 13, 10 Gibbs Street", ... },
    ...
  },
  hours: [ { day: "Monday", open: "09:00", close: "17:00" }, ... ],
  services: [
    { id: "oil-filter", name: "Oil & Filter Change", priceFrom: 120, durationMinutes: 45, ... },
    ...
  ],
  whyUs: [...],
  process: [...],
  reviews: [...],
  sampleInspection: {...},
};
```

Edit the values, save, refresh the page — both `index.html` and
`book.html` read from this file at load time. You do **not** need to
touch the HTML/CSS/JS to:

- Change the business name, phone, email, address, socials
- Add/remove/reprice a service (the booking wizard, service grid, and
  slot-duration logic all update automatically)
- Change opening hours (also drives which days/slots are bookable)
- Swap the sample inspection report or the reviews shown

### Why plain JS instead of a `.json` file?

A JSON file would need to be `fetch()`-ed, which browsers block for
security reasons (CORS) when a page is opened directly from disk
(`file://...`). Using a `.js` file that just sets `window.BUSINESS = {...}`
avoids that entirely — the site works whether you double-click
`index.html` or serve it from a real webserver.

### Logo & icons

- `assets/logo.svg` — replace with your own logo (keep it roughly
  square; it's used at ~34–40px).
- Service/contact icons are inline `<symbol>` definitions pasted near
  the top of each HTML file's `<body>` (a "sprite"), referenced via
  `<svg><use href="#icon-name"></use></svg>`. They're duplicated at the
  top of `index.html` and `book.html` rather than loaded from
  `assets/icons.svg` for the same file:// reason as above — external
  `<use href="file.svg#id">` references are blocked by most browsers
  outside of a real server. `assets/icons.svg` is kept as a single
  readable reference copy; if you add/edit an icon, update it in all
  three places (or switch to a build step / real server and load it
  externally once).

### Photos

No photos are included — the design leans on icons, type, and the
job-card motif instead. To add real photos (workshop, team, vehicles),
drop images into `assets/`, then reference them with an `<img>` tag,
e.g. in the hero next to the ticket panel.

### Translations (EN/ES)

- All **interface copy** (nav labels, buttons, form labels, headings)
  is translated — see the two language blocks (`en` / `es`) inside
  `js/i18n.js`. Add a third language by duplicating a block, adding its
  code to `LANGS`, and adding a button to `.lang-toggle` in both HTML
  files.
- **Content from `business.js`** (service names/descriptions, review
  quotes) is data, not interface chrome, and is shown as-is regardless
  of language. If you need that bilingual too, the simplest approach is
  to store `name_en` / `name_es` fields in `business.js` and have
  `main.js`/`booking.js` pick the right one based on
  `SK_I18N.getLang()`.

### Colors, type, spacing

All design tokens (colors, fonts, radii, spacing) are CSS custom
properties at the top of `css/styles.css` under `:root`. Change a
token once and it updates everywhere it's used.

## The booking flow — how it works

`js/booking.js` runs the 3-step wizard, backed by the real API in
`backend/`:

1. **Service** — cards generated from `business.js › services`.
2. **Time** — a 14-day date strip (days with `open: null` in
   `business.js › hours`, e.g. Sunday, render disabled). The slot grid for
   the selected day is fetched live from `GET /api/availability`, which
   the backend computes from business hours minus real bookings in the
   database — not a local guess. Re-fetches automatically if you change
   the service (duration affects which slots still fit before closing).
3. **Details** — a form with inline validation (name, phone, email,
   vehicle, rego required; phone/email format-checked on blur and on
   submit).

A sticky **summary ticket** on the right mirrors the job-card visual and
updates live as you make selections.

On submit, `POST /api/bookings` creates the booking as **pending** and
messages the workshop owner on WhatsApp. The page then shows a waiting
screen and polls `GET /api/bookings/:id` every few seconds. The moment
the owner replies `YES`/`NO` on WhatsApp (handled server-side by
`backend/src/routes/whatsappWebhook.js`), the booking flips to
**confirmed** or **declined**, the customer gets an automatic WhatsApp
message, and this page updates without a refresh. If the slot got taken
by someone else between fetching availability and submitting, the server
rejects it (`409`) and the page bounces back to the time picker with a
clear message instead of silently double-booking.

See **`backend/README.md`** for how to run and configure the backend
(Twilio WhatsApp setup, database, deployment).

## Running it locally

**The backend must be running for the booking wizard to work** — see
`backend/README.md` (short version: `cd backend && npm install && cp
.env.example .env && npm run migrate && npm run dev`).

The frontend needs a local server too now (not double-clicking the file),
since `book.html` makes real `fetch()` calls to the backend and browsers
restrict that from a `file://` page:

```bash
# from the project root, in a second terminal (keep the backend running in the first)
python3 -m http.server 8000
# open http://localhost:8000/book.html
```

or, with Node installed:

```bash
npx serve .
```

`index.html` (the marketing page, no API calls) still works fine opened
directly from disk if you just want to preview the design.

## Deploying

Two separate deployments:

- **Frontend** — static files, deploy anywhere that serves them:
  Cloudflare Pages (what the reference demo uses), Netlify, Vercel,
  GitHub Pages, or a plain web host. Nothing to build — upload the folder
  as-is with `index.html` at the root. Before deploying, update
  `js/config.js`'s `apiBaseUrl` to point at your deployed backend.
- **Backend** — a real Node process + database, needs an actual server
  host (Render, Railway, etc. — not a static host). Full walkthrough in
  `backend/README.md`.

## Browser support & accessibility notes

- Responsive from ~360px mobile width up through desktop; the services
  grid, service/date/time pickers, and footer all reflow at defined
  breakpoints in `css/styles.css`.
- Keyboard focus is visible (`:focus-visible` outline) on all
  interactive elements, including the custom service/date/time picker
  buttons.
- `prefers-reduced-motion` is respected — animations and smooth
  scrolling are disabled for users who request it.
- The map embed and all icons include appropriate `alt`/`title` text or
  are decorative (`aria-hidden` not needed since icons always sit next
  to a text label).

## What's a placeholder vs. real

To be upfront about what would need real data/integration before launch:

- **Reviews** — the three review quotes are copy placeholders (this
  mirrors the reference demo, which stated the same). Replace with real
  reviews, or wire up the Google Places API to pull them live.
- **Map** — the embedded Google Map uses the address in `business.js`
  and needs no API key (it's the no-key `maps?q=...&output=embed`
  form), but swap in your real address.
- **Booking backend — real, not a placeholder,** once you follow
  `backend/README.md`: real availability from a database, real WhatsApp
  messages to the owner and customer. What's still on you: creating a
  Twilio account and (for real customers, not just test numbers) going
  through Twilio's WhatsApp Business Platform approval — see
  `backend/README.md` §2–3.
- **WhatsApp number / phone / email / socials** — all placeholders from
  the reference business; update in `business.js`.

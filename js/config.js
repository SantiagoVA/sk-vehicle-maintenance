/**
 * config.js — the one setting you need to change when you deploy the backend.
 *
 * Local development: leave this pointing at your local backend
 * (`npm run dev` inside backend/, see backend/README.md).
 *
 * Production: change apiBaseUrl to your deployed backend's URL, e.g.
 *   apiBaseUrl: "https://api.skvehiclemaintenance.com.au/api"
 */
window.SK_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api",
  // "auto" uses the real backend on localhost, and switches to interactive
  // demo mode automatically when hosted statically (e.g. GitHub Pages)
  // while apiBaseUrl still points to localhost.
  demoMode: "auto",
};

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const availabilityRoutes = require("./routes/availability");
const bookingsRoutes = require("./routes/bookings");
const whatsappWebhookRoutes = require("./routes/whatsappWebhook");
const { startReminderScheduler } = require("./services/reminderService");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
const allowAll = allowedOrigins.length === 0 || allowedOrigins.includes("*");
app.use(
  cors({
    origin: allowAll ? true : allowedOrigins,
  })
);

// Meta posts webhooks as JSON.
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/whatsapp", whatsappWebhookRoutes);

// Central error handler — anything passed to next(err) in a route lands here.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`SK Vehicle booking API listening on http://localhost:${port}`);
  if (!process.env.META_ACCESS_TOKEN) {
    console.log("→ Meta WhatsApp Cloud API not configured yet: WhatsApp messages will just be logged to this console.");
  }
  startReminderScheduler();
});

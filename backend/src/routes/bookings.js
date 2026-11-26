const express = require("express");
const db = require("../db");
const { isSlotStillFree, getService } = require("../services/availabilityService");
const whatsapp = require("../services/whatsappService");

const router = express.Router();

function generateTicketNo() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SK-${n}`;
}

function validateBody(body) {
  const required = ["serviceId", "date", "time", "customerName", "customerPhone", "customerEmail", "vehicle", "rego"];
  const missing = required.filter((k) => !body[k] || String(body[k]).trim() === "");
  if (missing.length) return `Missing required field(s): ${missing.join(", ")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return "date must be YYYY-MM-DD";
  if (!/^\d{2}:\d{2}$/.test(body.time)) return "time must be HH:MM";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail)) return "customerEmail is invalid";
  return null;
}

// POST /api/bookings
router.post("/", async (req, res, next) => {
  try {
    const err = validateBody(req.body);
    if (err) return res.status(400).json({ error: err });

    const { serviceId, date, time, customerName, customerPhone, customerEmail, vehicle, rego, notes } = req.body;

    const service = getService(serviceId);
    if (!service) return res.status(400).json({ error: "Unknown service id" });

    // Re-check availability server-side right before writing — closes the
    // race condition where two people grab the same slot at once, or the
    // slot was fetched a while ago and has since been taken.
    const free = await isSlotStillFree(serviceId, date, time);
    if (!free) {
      return res.status(409).json({ error: "That slot was just taken. Please pick another time." });
    }

    let ticket_no;
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      ticket_no = generateTicketNo();
      try {
        await db("bookings").insert({
          ticket_no,
          service_id: service.id,
          service_name: service.name,
          duration_minutes: service.durationMinutes,
          price_from: service.priceFrom ?? null,
          date,
          time,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          vehicle,
          rego,
          notes: notes || null,
          status: "pending",
        });
        inserted = true;
      } catch (e) {
        if (attempt === 4) throw e; // give up after 5 collisions (astronomically unlikely)
      }
    }

    const booking = await db("bookings").where({ ticket_no }).first();

    // Fire-and-log: don't fail the booking if WhatsApp delivery hiccups —
    // the booking still exists and the owner can see it via /api/bookings.
    whatsapp.notifyOwnerOfNewBooking(booking).catch((e) => console.error("[whatsapp] owner notify failed:", e.message));

    res.status(201).json({ booking: serializeBooking(booking) });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id — used by the frontend to poll for the owner's decision
router.get("/:id", async (req, res, next) => {
  try {
    const booking = await db("bookings").where({ id: req.params.id }).first();
    if (!booking) return res.status(404).json({ error: "Not found" });
    res.json({ booking: serializeBooking(booking) });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings?date=2026-08-25&status=pending — simple admin/listing view
router.get("/", async (req, res, next) => {
  try {
    let query = db("bookings").orderBy("date", "desc").orderBy("time", "desc");
    if (req.query.date) query = query.where({ date: req.query.date });
    if (req.query.status) query = query.where({ status: req.query.status });
    const rows = await query.limit(200);
    res.json({ bookings: rows.map(serializeBooking) });
  } catch (err) {
    next(err);
  }
});

function serializeBooking(b) {
  return {
    id: b.id,
    ticketNo: b.ticket_no,
    serviceId: b.service_id,
    serviceName: b.service_name,
    durationMinutes: b.duration_minutes,
    priceFrom: b.price_from,
    date: b.date,
    time: b.time,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    customerEmail: b.customer_email,
    vehicle: b.vehicle,
    rego: b.rego,
    notes: b.notes,
    status: b.status,
    decidedBy: b.decided_by || null,
    reminderSentAt: b.reminder_sent_at || null,
    createdAt: b.created_at,
  };
}

module.exports = router;

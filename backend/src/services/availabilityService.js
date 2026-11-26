const db = require("../db");
const BUSINESS = require("../../../data/business.js");

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_STEP_MIN = 30;
const PENDING_TTL_MINUTES = Number(process.env.PENDING_TTL_MINUTES || 30);
const MAX_CONCURRENT_BOOKINGS = Number(process.env.MAX_CONCURRENT_BOOKINGS || 3);

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minutesToHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function hoursForDateStr(dateStr) {
  // dateStr: "YYYY-MM-DD" — parsed as local, not UTC, to match how the
  // frontend's date picker builds dates.
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES[date.getDay()];
  return { date, dayHours: BUSINESS.hours.find((h) => h.day === dayName) };
}

function getService(serviceId) {
  return BUSINESS.services.find((s) => s.id === serviceId);
}

function parseDbTimestamp(val) {
  if (val instanceof Date) return val.getTime();
  const s = String(val || "").trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return Date.parse(s.replace(" ", "T") + "Z");
  }
  return Date.parse(s);
}

/**
 * Returns [{ time: "HH:MM", available: bool, spotsLeft: number, capacity: number }]
 * for a given service+date, treating any booking in that same window with status
 * "pending" (and not expired) or "confirmed" as occupying one bay out of
 * MAX_CONCURRENT_BOOKINGS.
 */
async function getAvailability(serviceId, dateStr) {
  const service = getService(serviceId);
  if (!service) {
    const err = new Error("Unknown service id");
    err.status = 400;
    throw err;
  }

  const { date, dayHours } = hoursForDateStr(dateStr);
  if (!dayHours || !dayHours.open) {
    return { date: dateStr, closed: true, slots: [] };
  }

  const openMin = hhmmToMinutes(dayHours.open);
  const closeMin = hhmmToMinutes(dayHours.close);
  const lastStart = closeMin - service.durationMinutes;

  const isToday = new Date().toDateString() === date.toDateString();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  // Pull existing bookings for that date that still hold a slot: confirmed
  // always holds it; pending holds it only while still inside its TTL.
  const ttlCutoffMs = Date.now() - PENDING_TTL_MINUTES * 60 * 1000;
  const candidates = await db("bookings")
    .where({ date: dateStr })
    .whereIn("status", ["confirmed", "pending"])
    .select("time", "duration_minutes", "status", "created_at");

  const existing = candidates.filter(
    (b) => b.status === "confirmed" || parseDbTimestamp(b.created_at) >= ttlCutoffMs
  );

  const existingIntervals = existing.map((b) => {
    const start = hhmmToMinutes(b.time);
    return { start, end: start + b.duration_minutes };
  });

  function overlaps(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
  }

  const slots = [];
  for (let t = openMin; t <= lastStart; t += SLOT_STEP_MIN) {
    if (isToday && t <= nowMin + 30) continue; // no booking in the past / next 30 min today

    const slotEnd = t + service.durationMinutes;
    const overlapping = existingIntervals.filter((b) => overlaps(t, slotEnd, b.start, b.end));

    // Peak concurrency across [t, slotEnd) can only occur at t or at the start
    // of an overlapping booking that begins inside (t, slotEnd).
    const checkPoints = new Set([t]);
    for (const b of overlapping) {
      if (b.start > t && b.start < slotEnd) {
        checkPoints.add(b.start);
      }
    }

    let maxConcurrent = 0;
    for (const p of checkPoints) {
      let count = 0;
      for (const b of overlapping) {
        if (b.start <= p && p < b.end) count++;
      }
      if (count > maxConcurrent) maxConcurrent = count;
    }

    const spotsLeft = Math.max(0, MAX_CONCURRENT_BOOKINGS - maxConcurrent);
    slots.push({
      time: minutesToHHMM(t),
      available: maxConcurrent < MAX_CONCURRENT_BOOKINGS,
      spotsLeft,
      capacity: MAX_CONCURRENT_BOOKINGS,
    });
  }

  return { date: dateStr, closed: false, slots };
}

/** Re-check a single slot is still free right before committing a booking (closes the race-condition window). */
async function isSlotStillFree(serviceId, dateStr, time) {
  const { slots, closed } = await getAvailability(serviceId, dateStr);
  if (closed) return false;
  const slot = slots.find((s) => s.time === time);
  return !!slot && slot.available;
}

module.exports = { getAvailability, isSlotStillFree, getService, PENDING_TTL_MINUTES, MAX_CONCURRENT_BOOKINGS };

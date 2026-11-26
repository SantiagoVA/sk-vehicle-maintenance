const db = require("../db");
const whatsapp = require("./whatsappService");

const CHECK_INTERVAL_MS = 60 * 1000;
let isProcessing = false;
let schedulerHandle = null;

function getReminderHoursBefore() {
  return Number(process.env.REMINDER_HOURS_BEFORE || 6);
}

function getWorkshopTimezone() {
  const tz = (process.env.WORKSHOP_TIMEZONE || "").trim();
  return tz || null;
}

function normalizeDateStr(dateVal) {
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, "0");
    const d = String(dateVal.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(dateVal).slice(0, 10);
}

function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
}

/**
 * Converts a booking's date ("YYYY-MM-DD") and time ("HH:MM") into a Date
 * in WORKSHOP_TIMEZONE (or local system time if unset).
 */
function parseBookingDateTime(dateVal, timeStr, timeZone) {
  const dateStr = normalizeDateStr(dateVal);
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);

  if (!timeZone) {
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const offset1 = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let targetUtc = utcGuess - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(targetUtc), timeZone);
  if (offset2 !== offset1) {
    targetUtc = utcGuess - offset2;
  }
  return new Date(targetUtc);
}

/**
 * Finds confirmed bookings within the next REMINDER_HOURS_BEFORE hours that
 * haven't received a reminder yet, marks reminder_sent_at, and notifies the customer.
 */
async function processDueReminders(now = new Date()) {
  if (isProcessing) return { sent: 0 };
  isProcessing = true;

  let sent = 0;
  try {
    const windowMinutes = getReminderHoursBefore() * 60;
    const timeZone = getWorkshopTimezone();

    const candidates = await db("bookings")
      .where({ status: "confirmed" })
      .whereNull("reminder_sent_at")
      .select("*");

    for (const booking of candidates) {
      const apptDate = parseBookingDateTime(booking.date, booking.time, timeZone);
      const diffMinutes = (apptDate.getTime() - now.getTime()) / (60 * 1000);

      if (diffMinutes > 0 && diffMinutes <= windowMinutes) {
        // Atomic claim prevents duplicate reminders if another worker overlaps
        const claimed = await db("bookings")
          .where({ id: booking.id })
          .whereNull("reminder_sent_at")
          .update({
            reminder_sent_at: db.fn.now(),
            updated_at: db.fn.now(),
          });

        if (claimed === 0) continue;

        try {
          const normalizedBooking = {
            ...booking,
            date: normalizeDateStr(booking.date),
          };
          await whatsapp.notifyCustomerReminder(normalizedBooking);
          sent++;
          console.log(`[reminder] Sent 6h reminder for ticket ${booking.ticket_no}`);
        } catch (err) {
          console.error(`[reminder] Failed to send reminder for ${booking.ticket_no}:`, err.message);
          await db("bookings")
            .where({ id: booking.id })
            .update({ reminder_sent_at: null, updated_at: db.fn.now() });
        }
      }
    }

    return { sent };
  } finally {
    isProcessing = false;
  }
}

function startReminderScheduler() {
  if (schedulerHandle) return schedulerHandle;

  processDueReminders().catch((err) => {
    console.error("[reminder] Initial check failed:", err.message);
  });

  schedulerHandle = setInterval(() => {
    processDueReminders().catch((err) => {
      console.error("[reminder] Scheduled check failed:", err.message);
    });
  }, CHECK_INTERVAL_MS);

  // Don't keep the event loop alive solely for this timer if the server shuts down
  if (typeof schedulerHandle.unref === "function") {
    schedulerHandle.unref();
  }

  console.log(
    `[reminder] Scheduler started (window=${getReminderHoursBefore()}h, timezone=${getWorkshopTimezone() || "system local"})`
  );
  return schedulerHandle;
}

function stopReminderScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}

module.exports = {
  processDueReminders,
  startReminderScheduler,
  stopReminderScheduler,
  parseBookingDateTime,
};

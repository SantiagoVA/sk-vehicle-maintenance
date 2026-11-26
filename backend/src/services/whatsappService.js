/**
 * WhatsApp messaging, via Meta's WhatsApp Cloud API.
 * 
 * This uses the official Graph API to send messages directly from a
 * Meta-registered phone number.
 */
const BUSINESS = require("../../../data/business.js");

const accessToken = process.env.META_ACCESS_TOKEN;
const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

const looksLikePlaceholder = !accessToken || !phoneNumberId || accessToken.includes("xxxx");

if (looksLikePlaceholder) {
  console.warn(
    "[whatsapp] Meta Cloud API credentials not set (or still the .env placeholders) — running in LOG-ONLY mode. " +
      "Messages will be printed to the console instead of actually sent."
  );
}

/**
 * Returns a deduplicated list of authorized staff/owner WhatsApp numbers
 * (digits only) from OWNER_WHATSAPP_NUMBERS and OWNER_WHATSAPP_NUMBER.
 */
function getOwnerNumbers() {
  const raw = [process.env.OWNER_WHATSAPP_NUMBERS, process.env.OWNER_WHATSAPP_NUMBER]
    .filter(Boolean)
    .join(",");
  const nums = raw
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean);
  return Array.from(new Set(nums));
}

async function send(to, body) {
  if (looksLikePlaceholder) {
    console.log(`\n[whatsapp:LOG-ONLY] would send to ${to}:\n${body}\n`);
    return { sid: "log-only", to, body };
  }

  // Meta requires the phone number exactly as a numeric string (no +, no whatsapp:)
  const toNum = String(to).replace(/\D/g, "");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toNum,
    type: "text",
    text: { preview_url: false, body: body }
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error(`[whatsapp] Meta API error:`, JSON.stringify(data, null, 2));
      throw new Error(`Meta API error: ${data.error?.message || "Unknown error"}`);
    }

    return data;
  } catch (err) {
    console.error(`[whatsapp] Failed to send message to ${to}:`, err.message);
    throw err;
  }
}

/** Sent to all authorized workshop numbers when a customer submits a new booking request. */
async function notifyOwnerOfNewBooking(booking) {
  const owners = getOwnerNumbers();
  if (!owners.length) {
    console.warn("[whatsapp] No OWNER_WHATSAPP_NUMBERS configured; skipping booking notification.");
    return [];
  }
  const body = [
    `🔧 New booking request — ${BUSINESS.business.shortName}`,
    ``,
    `Ticket: ${booking.ticket_no}`,
    `Service: ${booking.service_name}`,
    `When: ${booking.date} at ${booking.time}`,
    `Customer: ${booking.customer_name} (${booking.customer_phone})`,
    `Vehicle: ${booking.vehicle} — ${booking.rego}`,
    booking.notes ? `Notes: ${booking.notes}` : null,
    ``,
    `Reply:`,
    `YES ${booking.ticket_no}  → confirm`,
    `NO ${booking.ticket_no}   → decline`,
  ]
    .filter(Boolean)
    .join("\n");
  return Promise.allSettled(owners.map((num) => send(num, body)));
}

/** Notifies the rest of the authorized team once one member confirms or declines. */
async function notifyOtherOwnersOfDecision(booking, decidedByNumber, decision) {
  const actor = String(decidedByNumber || "").replace(/\D/g, "");
  const others = getOwnerNumbers().filter((num) => num !== actor);
  if (!others.length) return [];

  const statusLabel = decision === "confirmed" ? "CONFIRMADO ✅" : "RECHAZADO ❌";
  const body = `ℹ️ Ticket ${booking.ticket_no} (${booking.customer_name} — ${booking.date} ${booking.time}) ya fue ${statusLabel} por +${actor}.`;
  return Promise.allSettled(others.map((num) => send(num, body)));
}

/** Sent to the customer once the owner confirms. */
function notifyCustomerConfirmed(booking) {
  const body = [
    `✅ Your booking is confirmed — ${BUSINESS.business.shortName}`,
    ``,
    `Ticket: ${booking.ticket_no}`,
    `Service: ${booking.service_name}`,
    `When: ${booking.date} at ${booking.time}`,
    `Where: ${BUSINESS.business.address.line1}, ${BUSINESS.business.address.line2}`,
    ``,
    `See you then! Reply here anytime if you need to change it.`,
  ].join("\n");
  return send(formatCustomerWa(booking.customer_phone), body);
}

/** Sent to the customer as an automated reminder before the appointment. */
function notifyCustomerReminder(booking) {
  const body = [
    `⏰ Reminder: your booking is coming up soon — ${BUSINESS.business.shortName}`,
    ``,
    `Ticket: ${booking.ticket_no}`,
    `Service: ${booking.service_name}`,
    `When: ${booking.date} at ${booking.time}`,
    `Vehicle: ${booking.vehicle} — ${booking.rego}`,
    `Where: ${BUSINESS.business.address.line1}, ${BUSINESS.business.address.line2}`,
    ``,
    `See you soon! Reply here if anything changes.`,
  ].join("\n");
  return send(formatCustomerWa(booking.customer_phone), body);
}

/** Sent to the customer if the owner declines. */
function notifyCustomerDeclined(booking) {
  const body = [
    `We're sorry — we can't take your ${booking.date} ${booking.time} booking (ticket ${booking.ticket_no}).`,
    `Please pick another time: book again at the website.`,
  ].join("\n");
  return send(formatCustomerWa(booking.customer_phone), body);
}

/** Meta expects just the digits with country code. */
function formatCustomerWa(phone) {
  let p = String(phone).replace(/[^\d+]/g, "");
  if (!p.startsWith("+")) {
    // Default to Australia (+61) if no country code provided
    p = p.startsWith("0") ? "+61" + p.slice(1) : "+61" + p;
  }
  return p.replace(/\D/g, "");
}

module.exports = {
  getOwnerNumbers,
  notifyOwnerOfNewBooking,
  notifyOtherOwnersOfDecision,
  notifyCustomerConfirmed,
  notifyCustomerDeclined,
  notifyCustomerReminder,
  formatCustomerWa,
  send,
};

const express = require("express");
const db = require("../db");
const whatsapp = require("../services/whatsappService");

const router = express.Router();

/**
 * Endpoint GET para la verificación inicial de Meta Webhook.
 * Meta envía una solicitud GET con un token de verificación.
 */
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("[whatsapp webhook] Webhook verified by Meta.");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

/**
 * Endpoint POST para recibir mensajes de Meta WhatsApp Cloud API.
 */
router.post("/webhook", async (req, res) => {
  try {
    // Meta exige recibir un HTTP 200 OK inmediatamente
    res.sendStatus(200);

    const body = req.body;

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages && change.value.messages[0]) {
            const msg = change.value.messages[0];

            // Solo procesamos mensajes de texto
            if (msg.type === "text") {
              const fromDigits = String(msg.from || "").replace(/\D/g, ""); // e.g. "61481119280"
              const text = (msg.text && msg.text.body ? msg.text.body : "").trim();

              console.log(`[whatsapp webhook] Incoming message from ${fromDigits}: "${text}"`);

              const authorizedOwners = whatsapp.getOwnerNumbers();

              // Validación de seguridad multi-encargado
              if (authorizedOwners.length > 0 && !authorizedOwners.includes(fromDigits)) {
                console.warn(`[whatsapp webhook] Ignored message from unauthorized number: ${fromDigits}`);
                continue;
              }

              const match = text.match(/^(yes|no|si|sí|confirmar|rechazar|ok)\b\s*(SK-\d+)?/i);
              if (!match) {
                continue; // Ignorar mensajes que no sean respuestas
              }

              const decision = /^(yes|si|sí|confirmar|ok)$/i.test(match[1]) ? "confirmed" : "declined";
              let ticketNo = match[2] ? match[2].toUpperCase() : null;

              if (!ticketNo) {
                const pending = await db("bookings").where({ status: "pending" }).orderBy("created_at", "desc");
                if (pending.length !== 1) {
                  // Múltiples pendientes o ninguno
                  const replyText = pending.length === 0
                    ? "No hay citas pendientes."
                    : `Hay múltiples citas pendientes. Responde con el número de ticket, ej. "YES SK-1234".`;
                  await whatsapp.send(fromDigits, replyText);
                  continue;
                }
                ticketNo = pending[0].ticket_no;
              }

              const booking = await db("bookings").where({ ticket_no: ticketNo }).first();
              if (!booking) {
                await whatsapp.send(fromDigits, `No se encontró la cita con el ticket ${ticketNo}.`);
                continue;
              }
              if (booking.status !== "pending") {
                const byInfo = booking.decided_by ? ` por +${booking.decided_by}` : "";
                await whatsapp.send(
                  fromDigits,
                  `El ticket ${ticketNo} ya está "${booking.status}"${byInfo}. No se hicieron cambios.`
                );
                continue;
              }

              // Bloqueo atómico: solo gana el primer encargado que actualiza desde "pending"
              const updatedCount = await db("bookings")
                .where({ id: booking.id, status: "pending" })
                .update({
                  status: decision,
                  decided_by: fromDigits,
                  updated_at: db.fn.now(),
                });

              if (updatedCount === 0) {
                const latest = await db("bookings").where({ id: booking.id }).first();
                const byInfo = latest && latest.decided_by ? ` por +${latest.decided_by}` : "";
                await whatsapp.send(
                  fromDigits,
                  `El ticket ${ticketNo} ya fue procesado${byInfo} (${latest ? latest.status : "actualizado"}). No se hicieron cambios.`
                );
                continue;
              }

              const updated = await db("bookings").where({ id: booking.id }).first();

              let customerNotified = true;
              try {
                if (decision === "confirmed") {
                  await whatsapp.notifyCustomerConfirmed(updated);
                } else {
                  await whatsapp.notifyCustomerDeclined(updated);
                }
              } catch (notifyErr) {
                customerNotified = false;
                console.error(`[whatsapp webhook] Failed to notify customer for ${ticketNo}:`, notifyErr.message);
              }

              await Promise.allSettled([
                whatsapp.send(
                  fromDigits,
                  customerNotified
                    ? `Ticket ${ticketNo} marcado como ${decision}. El cliente ha sido notificado.`
                    : `Ticket ${ticketNo} marcado como ${decision}, pero hubo un error al notificar al cliente.`
                ),
                whatsapp.notifyOtherOwnersOfDecision(updated, fromDigits, decision),
              ]);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp webhook] error:", err);
  }
});

module.exports = router;

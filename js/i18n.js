/**
 * i18n.js — minimal EN/ES text switcher.
 *
 * How it works:
 *  - Any element with a `data-i18n="key"` attribute gets its text content
 *    replaced with STRINGS[lang][key] on load and whenever the language
 *    is switched.
 *  - Any element with `data-i18n-attr="attr:key"` gets that attribute
 *    (e.g. placeholder, aria-label) set instead of text content.
 *  - The chosen language is remembered in localStorage so it persists
 *    across pages (index.html <-> book.html).
 *
 * To add a new language: duplicate the "en" block below, translate the
 * values, add its code to LANGS, and add a matching button in the nav's
 * .lang-toggle in both HTML files.
 */
(function () {
  const LANGS = ["en", "es"];
  const STORAGE_KEY = "sk-lang";

  const STRINGS = {
    en: {
      nav_services: "Services",
      nav_why: "Why SK",
      nav_process: "How it works",
      nav_reviews: "Reviews",
      nav_contact: "Contact",
      nav_book: "Book Now",

      hero_badge: "Licensed {licence} · ABN {abn}",
      hero_h1_1: "Honest mechanics.",
      hero_h1_2: "No surprises.",
      hero_lede: "Family-run workshop in {suburb}, serving {city} drivers with transparent pricing, thorough inspections and care for every vehicle we touch.",
      hero_cta_book: "Book your service",
      hero_cta_call: "Call {phone}",
      hero_stat_rating: "on {source}",
      hero_stat_inspection: "Point inspection",
      hero_stat_sameday: "Most services",
      hero_stat_sameday_label: "Same day",
      hero_status_open: "Open now",
      hero_status_hours: "Mon–Fri · 9am–5pm",
      hero_ticket_stamp: "17-POINT\nCHECK",

      services_eyebrow: "What we do",
      services_h2: "Everything your car needs, under one roof",
      services_p: "From a quick oil change to full diagnostics — we keep your vehicle safe, smooth and road-ready.",
      services_note: "Prices shown are starting estimates. We always provide a transparent quote after inspection — no work goes ahead without your approval.",
      services_quote_only: "Quote on inspection",
      services_fair: "Fair pricing",
      services_from: "from",

      why_eyebrow: "Why choose SK",
      why_h2: "A workshop that treats your car like its own.",
      why_p: "We built {name} on a simple idea: do the job right, tell the truth, charge fair. Every car gets a 17-point inspection — not just the one thing you came in for — so you leave knowing what's ahead.",
      why_ticket_label: "Sample inspection report",
      why_ticket_more: "+ {n} more items inspected",
      why_ticket_footer: "Full report sent to your inbox — every visit",

      process_eyebrow: "How it works",
      process_h2: "Simple, start to finish",
      process_p: "From booking to keys-in-hand, here's what to expect.",

      reviews_eyebrow: "Reviews",
      reviews_h2: "{score} on {source} — and counting.",
      reviews_count: "{count} Google reviews · Perth WA",
      reviews_disclaimer: "Review quotes shown as design placeholders pending approval — real reviews import on launch.",

      cta_h2: "Ready to book your next service?",
      cta_p: "Pick a time in under a minute. We'll confirm by WhatsApp and send a reminder before your visit.",
      cta_book: "Book online",
      cta_whatsapp: "WhatsApp us",

      footer_hours: "Opening hours",
      footer_contact: "Get in touch",
      footer_find: "Find us",
      footer_directions: "Get directions",
      footer_rights: "All rights reserved.",
      closed: "Closed",

      book_eyebrow: "Online booking",
      book_h1: "Book your service.",
      book_lede: "Pick a service and a time that works. We'll confirm by WhatsApp.",
      step1_label: "Service",
      step2_label: "Time",
      step3_label: "Details",
      step1_h2: "Choose your service",
      step1_hint: "Not sure? Pick \"Diagnostic scan\" and our team will guide you.",
      step2_h2: "Pick a time",
      step2_hint: "Times shown are workshop bays available for your selected service.",
      step3_h2: "Your details",
      step3_hint: "We'll only use this to confirm and remind you about your booking.",
      legend_available: "Available",
      legend_selected: "Selected",
      legend_booked: "Booked",
      label_name: "Full name",
      label_phone: "Mobile (for WhatsApp confirmation)",
      label_email: "Email (receipt & inspection report)",
      label_vehicle: "Vehicle make & model",
      label_rego: "Rego",
      label_notes: "Notes for the workshop (optional)",
      back: "Back",
      next: "Continue",
      confirm_booking: "Confirm booking",
      form_privacy: "Your info stays private. No spam.",
      summary_title: "Your booking",
      summary_service: "Service",
      summary_date: "Date",
      summary_time: "Time",
      summary_duration: "Estimated duration",
      summary_from: "Estimated from",
      summary_footnote: "Final quote after inspection. No work without your approval.",
      wa_prefer: "Prefer WhatsApp?",
      wa_chat: "Chat with the team — we reply in minutes.",
      wa_open: "Open WhatsApp",
      confirm_title: "Booking confirmed",
      confirm_body: "We'll send a WhatsApp confirmation to {phone} — right away, with a reminder the day before.",
      pending_title: "Request sent",
      pending_body: "Waiting for the workshop to confirm your booking — this will update automatically. You can close this and we'll still message you on WhatsApp.",
      pending_body_slow: "Still waiting on the workshop — this can take a little while during busy periods. Feel free to message us directly if it's urgent.",
      declined_title: "Not available",
      declined_body: "Sorry — the workshop couldn't take this booking. Please choose another time.",
      pick_another: "Choose another time",
      err_network: "Couldn't reach the booking server. Check your connection and try again.",
      err_slot_taken: "That time was just taken by someone else — please pick another.",
      sending: "Sending…",
      confirm_where: "Where",
      back_to_site: "Back to site",
      done: "Done",
      select_placeholder: "—",
      err_required: "Required",
      err_phone: "Enter a valid mobile number",
      err_email: "Enter a valid email",
    },

    es: {
      nav_services: "Servicios",
      nav_why: "Por qué SK",
      nav_process: "Cómo funciona",
      nav_reviews: "Reseñas",
      nav_contact: "Contacto",
      nav_book: "Reservar",

      hero_badge: "Licencia {licence} · ABN {abn}",
      hero_h1_1: "Mecánicos honestos.",
      hero_h1_2: "Sin sorpresas.",
      hero_lede: "Taller familiar en {suburb}, atendiendo a conductores de {city} con precios transparentes, inspecciones minuciosas y cuidado por cada vehículo.",
      hero_cta_book: "Reserva tu servicio",
      hero_cta_call: "Llamar {phone}",
      hero_stat_rating: "en {source}",
      hero_stat_inspection: "Puntos de inspección",
      hero_stat_sameday: "La mayoría de servicios",
      hero_stat_sameday_label: "Mismo día",
      hero_status_open: "Abierto ahora",
      hero_status_hours: "Lun–Vie · 9am–5pm",
      hero_ticket_stamp: "17 PUNTOS\nDE CHEQUEO",

      services_eyebrow: "Qué hacemos",
      services_h2: "Todo lo que tu auto necesita, bajo un mismo techo",
      services_p: "Desde un cambio de aceite rápido hasta diagnósticos completos — mantenemos tu vehículo seguro y listo para la carretera.",
      services_note: "Los precios mostrados son estimaciones iniciales. Siempre entregamos una cotización transparente tras la inspección — ningún trabajo comienza sin tu aprobación.",
      services_quote_only: "Cotización tras inspección",
      services_fair: "Precio justo",
      services_from: "desde",

      why_eyebrow: "Por qué elegir SK",
      why_h2: "Un taller que trata tu auto como propio.",
      why_p: "Construimos {name} sobre una idea simple: hacer el trabajo bien, decir la verdad, cobrar justo. Cada auto recibe una inspección de 17 puntos — no solo lo que trajiste — así te vas sabiendo qué sigue.",
      why_ticket_label: "Ejemplo de informe de inspección",
      why_ticket_more: "+ {n} ítems más inspeccionados",
      why_ticket_footer: "Informe completo enviado a tu correo — en cada visita",

      process_eyebrow: "Cómo funciona",
      process_h2: "Simple, de principio a fin",
      process_p: "Desde la reserva hasta las llaves en tu mano, esto es lo que puedes esperar.",

      reviews_eyebrow: "Reseñas",
      reviews_h2: "{score} en {source} — y sigue sumando.",
      reviews_count: "{count} reseñas de Google · Perth WA",
      reviews_disclaimer: "Reseñas mostradas como referencia de diseño pendiente de aprobación — las reseñas reales se importan al lanzamiento.",

      cta_h2: "¿Listo para reservar tu próximo servicio?",
      cta_p: "Elige un horario en menos de un minuto. Confirmamos por WhatsApp y enviamos un recordatorio antes de tu visita.",
      cta_book: "Reservar en línea",
      cta_whatsapp: "Escríbenos por WhatsApp",

      footer_hours: "Horario de atención",
      footer_contact: "Contáctanos",
      footer_find: "Encuéntranos",
      footer_directions: "Cómo llegar",
      footer_rights: "Todos los derechos reservados.",
      closed: "Cerrado",

      book_eyebrow: "Reserva en línea",
      book_h1: "Reserva tu servicio.",
      book_lede: "Elige un servicio y un horario. Confirmamos por WhatsApp.",
      step1_label: "Servicio",
      step2_label: "Horario",
      step3_label: "Datos",
      step1_h2: "Elige tu servicio",
      step1_hint: "¿No estás seguro? Elige \"Escaneo diagnóstico\" y te guiaremos.",
      step2_h2: "Elige un horario",
      step2_hint: "Los horarios mostrados son bahías del taller disponibles para el servicio elegido.",
      step3_h2: "Tus datos",
      step3_hint: "Solo los usaremos para confirmar y recordarte tu reserva.",
      legend_available: "Disponible",
      legend_selected: "Seleccionado",
      legend_booked: "Reservado",
      label_name: "Nombre completo",
      label_phone: "Celular (confirmación por WhatsApp)",
      label_email: "Correo (recibo e informe de inspección)",
      label_vehicle: "Marca y modelo del vehículo",
      label_rego: "Patente",
      label_notes: "Notas para el taller (opcional)",
      back: "Atrás",
      next: "Continuar",
      confirm_booking: "Confirmar reserva",
      form_privacy: "Tu información es privada. Sin spam.",
      summary_title: "Tu reserva",
      summary_service: "Servicio",
      summary_date: "Fecha",
      summary_time: "Hora",
      summary_duration: "Duración estimada",
      summary_from: "Estimado desde",
      summary_footnote: "Cotización final tras inspección. Sin trabajos sin tu aprobación.",
      wa_prefer: "¿Prefieres WhatsApp?",
      wa_chat: "Chatea con el equipo — respondemos en minutos.",
      wa_open: "Abrir WhatsApp",
      confirm_title: "Reserva confirmada",
      confirm_body: "Enviaremos una confirmación por WhatsApp a {phone} — de inmediato, con un recordatorio el día anterior.",
      pending_title: "Solicitud enviada",
      pending_body: "Esperando que el taller confirme tu reserva — esto se actualizará automáticamente. Puedes cerrar esta ventana y aun así te escribiremos por WhatsApp.",
      pending_body_slow: "Seguimos esperando al taller — puede tardar un poco en horarios de mucha demanda. Escríbenos directamente si es urgente.",
      declined_title: "No disponible",
      declined_body: "Lo sentimos — el taller no pudo tomar esta reserva. Por favor elige otro horario.",
      pick_another: "Elegir otro horario",
      err_network: "No pudimos conectar con el servidor de reservas. Verifica tu conexión e intenta de nuevo.",
      err_slot_taken: "Ese horario fue tomado por otra persona — por favor elige otro.",
      sending: "Enviando…",
      confirm_where: "Ubicación",
      back_to_site: "Volver al sitio",
      done: "Listo",
      select_placeholder: "—",
      err_required: "Obligatorio",
      err_phone: "Ingresa un celular válido",
      err_email: "Ingresa un correo válido",
    },
  };

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || "en";
  }

  function t(key, vars) {
    const lang = getLang();
    const dict = STRINGS[lang] || STRINGS.en;
    const raw = dict[key] !== undefined ? dict[key] : (STRINGS.en[key] || key);
    return interpolate(raw, vars);
  }

  function applyStaticStrings(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = t(key).replace(/\n/g, "<br>");
      } else {
        el.textContent = t(key);
      }
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        el.setAttribute(attr, t(key));
      });
    });
    document.documentElement.lang = getLang();
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyStaticStrings();
    document.querySelectorAll(".lang-toggle button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    document.dispatchEvent(new CustomEvent("sk:langchange", { detail: { lang } }));
  }

  function initLangToggle() {
    document.querySelectorAll(".lang-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
      btn.classList.toggle("active", btn.dataset.lang === getLang());
    });
  }

  window.SK_I18N = { t, getLang, setLang, applyStaticStrings, initLangToggle };

  document.addEventListener("DOMContentLoaded", () => {
    initLangToggle();
    applyStaticStrings();
  });
})();

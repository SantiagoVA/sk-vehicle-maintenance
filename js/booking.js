/**
 * booking.js — powers book.html's 3-step wizard, backed by the real API
 * in backend/ (see backend/README.md to run it).
 *
 * Flow:
 *   1. Pick a service (from business.js, same as before).
 *   2. Pick a date/time — the slot grid is fetched live from
 *      GET /api/availability, which reflects actual bookings in the
 *      database, not a local guess.
 *   3. Enter details, submit → POST /api/bookings creates a *pending*
 *      booking and messages the owner on WhatsApp. The page then shows a
 *      waiting screen and polls GET /api/bookings/:id every few seconds
 *      until the owner replies YES/NO on WhatsApp, at which point the
 *      status flips to "confirmed" or "declined" and the customer also
 *      gets a WhatsApp message automatically (sent server-side).
 *
 * If the backend isn't running, every API call below fails with a clear
 * "couldn't reach the booking server" message rather than silently
 * pretending to succeed — this page no longer fakes availability locally.
 */
(function () {
  const B = window.BUSINESS;
  const API = (window.SK_CONFIG && window.SK_CONFIG.apiBaseUrl) || "http://localhost:4000/api";
  const DEMO_MODE = (() => {
    const cfg = window.SK_CONFIG && window.SK_CONFIG.demoMode;
    if (cfg === true) return true;
    if (cfg === false) return false;
    const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(API);
    const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
    return isLocalApi && !isLocalHost;
  })();
  const DEMO_STORAGE_KEY = "sk-demo-bookings";
  const DEMO_CAPACITY = 3;
  const ICONS_BY_SERVICE = {
    logbook: "icon-logbook",
    "oil-filter": "icon-oil",
    brakes: "icon-brakes",
    "battery-electrical": "icon-battery",
    "tyres-alignment": "icon-tyres",
    diagnostic: "icon-diagnostic",
    "ac-service": "icon-ac",
    "pre-purchase": "icon-inspect",
    "general-repairs": "icon-wrench",
  };
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const POLL_INTERVAL_MS = 4000;
  const POLL_SLOW_AFTER_MS = 90000; // switch to "still waiting" copy after 90s
  const POLL_GIVE_UP_AFTER_MS = 30 * 60 * 1000; // matches backend PENDING_TTL_MINUTES default

  const state = {
    step: 1,
    service: null,
    date: null,
    time: null,
    submitting: false,
    bookingId: null,
    bookingTicketNo: null,
    pollTimer: null,
    pollStartedAt: null,
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function money(n) {
    return "$" + Number(n).toFixed(0);
  }
  function hoursFor(date) {
    const dayName = DAY_NAMES[date.getDay()];
    return B.hours.find((h) => h.day === dayName);
  }
  function fmtDateHuman(date) {
    return date.toLocaleDateString(SK_I18N.getLang() === "es" ? "es-ES" : "en-AU", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }
  function toDateStr(date) {
    // Local YYYY-MM-DD (not toISOString, which shifts by timezone offset).
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /* ======================================================== API calls */
  function ApiError(message, status) {
    this.message = message;
    this.status = status;
  }
  ApiError.prototype = Object.create(Error.prototype);

  async function apiGet(path) {
    let res;
    try {
      res = await fetch(API + path);
    } catch (e) {
      throw new ApiError(SK_I18N.t("err_network"), 0);
    }
    const body = await safeJson(res);
    if (!res.ok) throw new ApiError((body && body.error) || res.statusText, res.status);
    return body;
  }
  async function apiPost(path, data) {
    let res;
    try {
      res = await fetch(API + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (e) {
      throw new ApiError(SK_I18N.t("err_network"), 0);
    }
    const body = await safeJson(res);
    if (!res.ok) throw new ApiError((body && body.error) || res.statusText, res.status);
    return body;
  }
  async function safeJson(res) {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  /* ======================================================== DEMO MODE = */
  function hhmmToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function minutesToHHMM(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  function readDemoBookings() {
    try {
      return JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveDemoBooking(booking) {
    try {
      const list = readDemoBookings();
      list.push(booking);
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }
  function getDemoAvailability(service, dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayHours = hoursFor(date);
    if (!dayHours || !dayHours.open) {
      return { date: dateStr, closed: true, slots: [] };
    }
    const openMin = hhmmToMinutes(dayHours.open);
    const closeMin = hhmmToMinutes(dayHours.close);
    const lastStart = closeMin - service.durationMinutes;
    const isToday = new Date().toDateString() === date.toDateString();
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

    const existing = readDemoBookings()
      .filter((b) => b.date === dateStr)
      .map((b) => {
        const start = hhmmToMinutes(b.time);
        return { start, end: start + b.durationMinutes };
      });

    const slots = [];
    for (let t = openMin; t <= lastStart; t += 30) {
      if (isToday && t <= nowMin + 30) continue;
      const slotEnd = t + service.durationMinutes;
      const overlapping = existing.filter((b) => t < b.end && b.start < slotEnd);
      const checkPoints = new Set([t]);
      overlapping.forEach((b) => {
        if (b.start > t && b.start < slotEnd) checkPoints.add(b.start);
      });
      let maxConcurrent = 0;
      checkPoints.forEach((p) => {
        const c = overlapping.filter((b) => b.start <= p && p < b.end).length;
        if (c > maxConcurrent) maxConcurrent = c;
      });
      slots.push({
        time: minutesToHHMM(t),
        available: maxConcurrent < DEMO_CAPACITY,
        spotsLeft: Math.max(0, DEMO_CAPACITY - maxConcurrent),
        capacity: DEMO_CAPACITY,
      });
    }
    return { date: dateStr, closed: false, slots };
  }
  async function submitDemoBooking(payload) {
    const avail = getDemoAvailability(state.service, payload.date);
    const slot = avail.slots.find((s) => s.time === payload.time);
    if (!slot || !slot.available) {
      throw new ApiError(SK_I18N.t("err_slot_taken"), 409);
    }
    const booking = {
      id: Date.now(),
      ticketNo: `SK-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceId: state.service.id,
      serviceName: state.service.name,
      durationMinutes: state.service.durationMinutes,
      priceFrom: state.service.priceFrom ?? null,
      date: payload.date,
      time: payload.time,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      vehicle: payload.vehicle,
      rego: payload.rego,
      notes: payload.notes || null,
      status: "pending",
    };
    saveDemoBooking(booking);
    return { booking };
  }

  /* ======================================================= STEP 1 ==== */
  function renderServiceGrid() {
    const grid = $("#svcGrid");
    grid.innerHTML = B.services
      .map((svc) => {
        const iconId = ICONS_BY_SERVICE[svc.id] || "icon-wrench";
        const priceLabel = svc.priceFrom ? `${SK_I18N.t("services_from")} ${money(svc.priceFrom)}` : SK_I18N.t("services_quote_only");
        const selected = state.service && state.service.id === svc.id ? " selected" : "";
        return `
          <button type="button" class="svc-pick${selected}" data-svc-id="${svc.id}">
            <div class="row1"><span>${svc.ticket}</span><svg width="18" height="18"><use href="#${iconId}"></use></svg></div>
            <div class="name">${escapeHtml(svc.name)}</div>
            <div class="desc">${escapeHtml(svc.shortDesc)}</div>
            <div class="row2"><span>${escapeHtml(svc.duration)}</span><span>${priceLabel}</span></div>
          </button>`;
      })
      .join("");
    $$(".svc-pick", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        const svc = B.services.find((s) => s.id === btn.dataset.svcId);
        state.service = svc;
        state.time = null;
        $$(".svc-pick", grid).forEach((b) => b.classList.toggle("selected", b === btn));
        $("#toStep2").disabled = false;
        renderSummary();
        if (state.date) loadSlots(); // duration may have changed, re-fetch
      });
    });
  }

  /* ======================================================= STEP 2 ==== */
  function renderDateRow() {
    const row = $("#dateRow");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    row.innerHTML = days
      .map((d) => {
        const h = hoursFor(d);
        const closed = !h || !h.open;
        const isSelected = state.date && d.getTime() === state.date.getTime();
        const dow = d.toLocaleDateString(SK_I18N.getLang() === "es" ? "es-ES" : "en-AU", { weekday: "short" });
        return `<button type="button" class="date-pill${isSelected ? " selected" : ""}" data-date="${d.toISOString()}" ${closed ? "disabled" : ""}>
          <span class="dow">${dow}</span><span class="dnum">${d.getDate()}</span>
        </button>`;
      })
      .join("");
    $$(".date-pill", row).forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        state.date = new Date(btn.dataset.date);
        state.date.setHours(0, 0, 0, 0);
        state.time = null;
        $$(".date-pill", row).forEach((b) => b.classList.toggle("selected", b === btn));
        $("#toStep3").disabled = true;
        renderSummary();
        loadSlots();
      });
    });
  }

  let slotRequestSeq = 0;
  async function loadSlots() {
    const grid = $("#slotGrid");
    if (!state.service || !state.date) {
      grid.innerHTML = "";
      return;
    }
    const seq = ++slotRequestSeq;
    grid.innerHTML = `<p class="step-hint" style="grid-column:1/-1;">${SK_I18N.getLang() === "es" ? "Cargando horarios…" : "Loading times…"}</p>`;
    try {
      const data = DEMO_MODE
        ? getDemoAvailability(state.service, toDateStr(state.date))
        : await apiGet(`/availability?serviceId=${encodeURIComponent(state.service.id)}&date=${toDateStr(state.date)}`);
      if (seq !== slotRequestSeq) return; // a newer request superseded this one
      renderSlotGrid(data);
    } catch (e) {
      if (seq !== slotRequestSeq) return;
      grid.innerHTML = `<p class="step-hint" style="grid-column:1/-1; color: var(--brake-red);">${escapeHtml(e.message || SK_I18N.t("err_network"))}
        &nbsp;<button type="button" class="btn btn-sm btn-ghost-dark" id="retrySlots">${SK_I18N.getLang() === "es" ? "Reintentar" : "Retry"}</button></p>`;
      const retry = $("#retrySlots");
      if (retry) retry.addEventListener("click", loadSlots);
    }
  }

  function renderSlotGrid(data) {
    const grid = $("#slotGrid");
    if (data.closed || !data.slots.length) {
      grid.innerHTML = `<p class="step-hint" style="grid-column:1/-1;">${SK_I18N.getLang() === "es" ? "No hay horarios disponibles ese día — prueba otra fecha." : "No slots available that day — try another date."}</p>`;
      return;
    }
    grid.innerHTML = data.slots
      .map((s) => {
        const selected = state.time === s.time;
        return `<button type="button" class="slot${selected ? " selected" : ""}" data-time="${s.time}" ${s.available ? "" : "disabled"}>${s.time}</button>`;
      })
      .join("");
    $$(".slot", grid).forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        state.time = btn.dataset.time;
        $$(".slot", grid).forEach((b) => b.classList.toggle("selected", b === btn));
        $("#toStep3").disabled = false;
        renderSummary();
      });
    });
  }

  /* ======================================================= STEP 3 ==== */
  const FIELD_VALIDATORS = {
    fName: (v) => v.trim().length > 1,
    fPhone: (v) => /^[+\d][\d\s-]{7,}$/.test(v.trim()),
    fEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    fVehicle: (v) => v.trim().length > 1,
    fRego: (v) => v.trim().length > 0,
  };
  const FIELD_ERROR_KEY = {
    fName: "err_required",
    fPhone: "err_phone",
    fEmail: "err_email",
    fVehicle: "err_required",
    fRego: "err_required",
  };

  function validateField(id) {
    const input = $("#" + id);
    const errEl = $(`[data-err-for="${id}"]`);
    const ok = FIELD_VALIDATORS[id](input.value);
    errEl.textContent = ok ? "" : SK_I18N.t(FIELD_ERROR_KEY[id]);
    input.style.borderColor = ok ? "" : "var(--brake-red)";
    return ok;
  }
  function validateAll() {
    return Object.keys(FIELD_VALIDATORS).map(validateField).every(Boolean);
  }
  function showFormError(msg) {
    const el = $("#formError");
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.textContent = msg;
    el.style.display = "block";
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ==================================================== SUMMARY TICKET */
  function renderSummary() {
    $("#sumTicketNo").textContent = state.bookingTicketNo || "SK-····";
    $("#sumStatus").textContent = state.service ? "OPEN" : SK_I18N.t("select_placeholder");
    $("#sumService").textContent = state.service ? state.service.name : SK_I18N.t("select_placeholder");
    $("#sumDate").textContent = state.date ? fmtDateHuman(state.date) : SK_I18N.t("select_placeholder");
    $("#sumTime").textContent = state.time || SK_I18N.t("select_placeholder");
    $("#sumDuration").textContent = state.service ? state.service.duration : SK_I18N.t("select_placeholder");
    $("#sumPrice").textContent = state.service
      ? state.service.priceFrom
        ? money(state.service.priceFrom)
        : SK_I18N.t("services_quote_only")
      : "—";
  }

  /* ========================================================= STEPPER = */
  function goToStep(n) {
    state.step = n;
    $$(".book-step").forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === n));
    $$(".stepper-item").forEach((s) => {
      const i = Number(s.dataset.stepIndicator);
      s.classList.toggle("active", i === n);
      s.classList.toggle("done", i < n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ====================================================== WHATSAPP === */
  function refreshWaFab() {
    $$("[data-wa-fab]").forEach((a) => (a.href = B.business.whatsappLink));
    $$("[data-wa-link]").forEach((a) => (a.href = B.business.whatsappLink));
  }

  /* =============================================== SUBMIT & POLLING === */
  async function submitBooking() {
    if (state.submitting) return;
    showFormError(null);
    if (!validateAll()) return;

    state.submitting = true;
    const submitBtn = $("#submitBooking");
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = SK_I18N.t("sending");

    const payload = {
      serviceId: state.service.id,
      date: toDateStr(state.date),
      time: state.time,
      customerName: $("#fName").value.trim(),
      customerPhone: $("#fPhone").value.trim(),
      customerEmail: $("#fEmail").value.trim(),
      vehicle: $("#fVehicle").value.trim(),
      rego: $("#fRego").value.trim(),
      notes: $("#fNotes").value.trim(),
    };

    try {
      const { booking } = DEMO_MODE
        ? await submitDemoBooking(payload)
        : await apiPost("/bookings", payload);
      state.bookingId = booking.id;
      state.bookingTicketNo = booking.ticketNo;
      renderSummary();
      openOverlay("pending", booking);
      startPolling(booking);
    } catch (e) {
      if (e.status === 409) {
        showFormError(SK_I18N.t("err_slot_taken"));
        goToStep(2);
        loadSlots();
      } else {
        showFormError(e.message || SK_I18N.t("err_network"));
      }
    } finally {
      state.submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  }

  function startPolling(demoBooking) {
    stopPolling();
    if (DEMO_MODE && demoBooking) {
      state.pollTimer = setTimeout(() => {
        stopPolling();
        openOverlay("confirmed", { ...demoBooking, status: "confirmed" });
      }, 2000);
      return;
    }
    state.pollStartedAt = Date.now();
    state.pollTimer = setInterval(async () => {
      const elapsed = Date.now() - state.pollStartedAt;
      if (elapsed > POLL_GIVE_UP_AFTER_MS) {
        stopPolling();
        return;
      }
      try {
        const { booking } = await apiGet(`/bookings/${state.bookingId}`);
        if (booking.status === "confirmed") {
          stopPolling();
          openOverlay("confirmed", booking);
        } else if (booking.status === "declined") {
          stopPolling();
          openOverlay("declined", booking);
        } else if (elapsed > POLL_SLOW_AFTER_MS) {
          $("#confirmBody").textContent = SK_I18N.t("pending_body_slow");
        }
      } catch (e) {
        // Transient network hiccup while polling — keep trying silently;
        // the user still sees the "pending" screen either way.
      }
    }, POLL_INTERVAL_MS);
  }
  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      clearTimeout(state.pollTimer);
    }
    state.pollTimer = null;
  }

  /* ===================================================== OVERLAY UI === */
  function openOverlay(status, booking) {
    const stamp = $("#confirmStamp");
    const icon = $("#confirmStampIcon");
    const waBtn = $("#confirmWaBtn");
    const pickAnotherBtn = $("#pickAnotherBtn");
    const doneBtn = $("#confirmDoneBtn");

    stamp.className = "confirm-stamp state-" + status;
    $("#cTicketNo").textContent = booking.ticketNo;
    $("#cStatusBadge").textContent = status.toUpperCase();
    $("#cService").textContent = booking.serviceName;
    $("#cWhen").textContent = `${booking.date} · ${booking.time}`;
    $("#cWhere").textContent = `${B.business.address.line1}, ${B.business.address.line2}`;

    const waMessage = `Hi ${B.business.shortName}, following up on my booking (${booking.ticketNo}).`;
    waBtn.href = B.business.whatsappLink + "?text=" + encodeURIComponent(waMessage);

    if (status === "pending") {
      icon.innerHTML = '<use href="#icon-clock"></use>';
      $("#confirmTitle").textContent = SK_I18N.t("pending_title");
      $("#confirmBody").textContent = SK_I18N.t("pending_body");
      waBtn.style.display = "";
      pickAnotherBtn.style.display = "none";
      doneBtn.style.display = "none";
    } else if (status === "confirmed") {
      icon.innerHTML = '<use href="#icon-check-stamp"></use>';
      $("#confirmTitle").textContent = SK_I18N.t("confirm_title");
      const demoNote = DEMO_MODE
        ? (SK_I18N.getLang() === "es"
            ? " (Vista demo — integración de WhatsApp pendiente)"
            : " (Demo preview — WhatsApp integration pending)")
        : "";
      $("#confirmBody").textContent = SK_I18N.t("confirm_body", { phone: booking.customerPhone }) + demoNote;
      waBtn.style.display = "";
      pickAnotherBtn.style.display = "none";
      doneBtn.style.display = "";
    } else if (status === "declined") {
      icon.innerHTML = '<use href="#icon-x-stamp"></use>';
      $("#confirmTitle").textContent = SK_I18N.t("declined_title");
      $("#confirmBody").textContent = SK_I18N.t("declined_body");
      waBtn.style.display = "";
      pickAnotherBtn.style.display = "";
      doneBtn.style.display = "none";
    }

    $("#confirmOverlay").classList.add("open");
  }
  function closeOverlayAndPickAnother() {
    $("#confirmOverlay").classList.remove("open");
    state.time = null;
    goToStep(2);
    loadSlots();
  }

  /* ============================================================ INIT = */
  function bindNav() {
    $("#toStep2").addEventListener("click", () => state.service && goToStep(2));
    $("#toStep1").addEventListener("click", () => goToStep(1));
    $("#toStep3").addEventListener("click", () => state.time && goToStep(3));
    $("#toStep2b").addEventListener("click", () => goToStep(2));
    $("#submitBooking").addEventListener("click", submitBooking);
    $("#pickAnotherBtn").addEventListener("click", closeOverlayAndPickAnother);
    Object.keys(FIELD_VALIDATORS).forEach((id) => {
      $("#" + id).addEventListener("blur", () => validateField(id));
    });
  }

  function renderAllDynamic() {
    renderServiceGrid();
    renderDateRow();
    renderSummary();
    refreshWaFab();
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderAllDynamic();
    bindNav();
  });
  document.addEventListener("sk:langchange", renderAllDynamic);
})();

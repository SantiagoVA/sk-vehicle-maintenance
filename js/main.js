/**
 * main.js — powers index.html.
 *
 * Everything that comes from data/business.js (services, hours, reviews,
 * contact details) is rendered here at runtime, so editing that one file
 * updates the whole page. Static UI copy ("Book Now", "Services", etc.)
 * lives in js/i18n.js instead.
 *
 * NOTE ON TRANSLATION SCOPE: the EN/ES toggle translates all interface
 * copy (nav, labels, buttons). Content that comes from business.js
 * (service names/descriptions, review quotes) is data, not UI chrome, and
 * is not auto-translated — add an `.es` variant per field in business.js
 * if you need that content bilingual too.
 */
(function () {
  const B = window.BUSINESS;
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
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function money(n) {
    return "$" + Number(n).toFixed(0);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------------------------------------------------- nav ---- */
  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  /* ------------------------------------------------------- hero meta -- */
  function renderHeroBadge() {
    const badge = document.querySelector("[data-hero-badge]");
    if (badge) {
      badge.textContent = SK_I18N.t("hero_badge", {
        licence: B.business.licence,
        abn: B.business.abn,
      });
    }
    const phoneLinks = document.querySelectorAll("[data-hero-call]");
    phoneLinks.forEach((a) => {
      a.href = "tel:" + B.business.phoneIntl;
      a.textContent = SK_I18N.t("hero_cta_call", { phone: B.business.phoneDisplay });
    });
    const ratingScore = document.querySelectorAll("[data-rating-score]");
    ratingScore.forEach((n) => (n.textContent = B.business.rating.score));
  }

  /* -------------------------------------------------------- services -- */
  function renderServices() {
    const grid = document.querySelector("[data-services-grid]");
    if (!grid) return;
    grid.innerHTML = "";
    grid.innerHTML = B.services
      .map((svc) => {
        const iconId = ICONS_BY_SERVICE[svc.id] || "icon-wrench";
        const priceHtml = svc.priceFrom
          ? `<span class="price"><span class="from">${SK_I18N.t("services_from")}</span>${money(svc.priceFrom)}</span>`
          : `<span class="price">${SK_I18N.t("services_quote_only")}</span>`;
        return `
          <div class="service-ticket">
            <div class="service-ticket-top">
              <svg class="service-icon"><use href="#${iconId}"></use></svg>
              <span class="tno">${svc.ticket}</span>
            </div>
            <h3>${escapeHtml(svc.name)}</h3>
            <p>${escapeHtml(svc.shortDesc)}</p>
            <div class="meta-row">
              <span class="duration">${escapeHtml(svc.duration)}</span>
              ${priceHtml}
            </div>
          </div>`;
      })
      .join("");
  }

  /* --------------------------------------------------------- why us --- */
  function renderWhy() {
    const list = document.querySelector("[data-why-list]");
    if (!list) return;
    list.innerHTML = "";
    B.whyUs.forEach((item, i) => {
      list.appendChild(
        el("div", { class: "why-item" }, [
          el("h3", {}, [document.createTextNode(item.title)]),
          el("p", {}, [document.createTextNode(item.desc)]),
        ])
      );
    });
  }

  function renderSampleInspection() {
    const wrap = document.querySelector("[data-sample-inspection]");
    if (!wrap) return;
    const s = B.sampleInspection;
    wrap.innerHTML = "";
    const list = el("ul", { class: "checklist" });
    s.items.forEach((item) => {
      list.appendChild(
        el("li", {}, [
          el("span", { class: `dot ${item.status}` }),
          el("span", {}, [document.createTextNode(item.label)]),
        ])
      );
    });
    list.appendChild(
      el("li", { class: "more" }, [
        document.createTextNode(SK_I18N.t("why_ticket_more", { n: s.moreCount })),
      ])
    );
    wrap.appendChild(list);
    const idEl = wrap.closest(".ticket").querySelector("[data-ticket-id]");
    if (idEl) idEl.innerHTML = `<b>${s.ticket}</b> · ${s.vehicle}`;
  }

  /* --------------------------------------------------------- process -- */
  function renderProcess() {
    const rail = document.querySelector("[data-process-rail]");
    if (!rail) return;
    rail.innerHTML = "";
    B.process.forEach((step, i) => {
      rail.appendChild(
        el("div", { class: "process-step" }, [
          el("div", { class: "step-no" }, [document.createTextNode(String(i + 1).padStart(2, "0"))]),
          el("h3", {}, [document.createTextNode(step.title)]),
          el("p", {}, [document.createTextNode(step.desc)]),
        ])
      );
    });
  }

  /* --------------------------------------------------------- reviews -- */
  function renderReviews() {
    const grid = document.querySelector("[data-reviews-grid]");
    if (!grid) return;
    grid.innerHTML = "";
    B.reviews.forEach((r) => {
      grid.appendChild(
        el("div", { class: "review-card" }, [
          el("span", { class: "quote-mark" }, [document.createTextNode("\u201C")]),
          el("p", { class: "quote" }, [document.createTextNode(r.quote)]),
          el("p", { class: "who" }, [
            el("b", {}, [document.createTextNode(r.author)]),
            document.createTextNode(" · " + r.meta),
          ]),
        ])
      );
    });
    document.querySelectorAll("[data-review-count]").forEach((n) => {
      n.textContent = SK_I18N.t("reviews_count", { count: B.business.rating.count });
    });
    document.querySelectorAll("[data-review-score]").forEach((n) => {
      n.textContent = SK_I18N.t("reviews_h2", {
        score: B.business.rating.score,
        source: B.business.rating.source,
      });
    });
  }

  /* ----------------------------------------------------------- hours -- */
  function renderHours() {
    const list = document.querySelector("[data-hours-list]");
    if (!list) return;
    list.innerHTML = "";
    B.hours.forEach((h) => {
      const isClosed = !h.open;
      list.appendChild(
        el("li", {}, [
          el("span", {}, [document.createTextNode(h.day)]),
          isClosed
            ? el("span", { class: "closed" }, [document.createTextNode(SK_I18N.t("closed"))])
            : el("span", {}, [document.createTextNode(`${h.open} – ${h.close}`)]),
        ])
      );
    });
  }

  /* --------------------------------------------------------- contact -- */
  function renderContact() {
    const list = document.querySelector("[data-contact-list]");
    if (!list) return;
    const b = B.business;
    list.innerHTML = "";
    const rows = [
      { icon: "icon-phone", text: formatPhoneIntl(b.phoneIntl), href: "tel:" + b.phoneIntl },
      { icon: "icon-whatsapp", text: "WhatsApp", href: b.whatsappLink },
      { icon: "icon-mail", text: b.email, href: "mailto:" + b.email },
      { icon: "icon-instagram", text: "@" + b.instagram.split("/").filter(Boolean).pop(), href: b.instagram },
      { icon: "icon-facebook", text: b.shortName + " on Facebook", href: b.facebook },
    ];
    list.innerHTML = rows
      .map(
        (r) => `
        <li>
          <svg><use href="#${r.icon}"></use></svg>
          <a href="${r.href}" ${r.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${escapeHtml(r.text)}</a>
        </li>`
      )
      .join("");

    document.querySelectorAll("[data-address]").forEach((n) => {
      n.innerHTML = `${b.address.line1}<br>${b.address.line2}<br>${b.address.line3}`;
    });
    document.querySelectorAll("[data-directions-link]").forEach((a) => {
      a.href = "https://maps.google.com/?q=" + encodeURIComponent(b.address.mapsDirectionsQuery);
    });
    document.querySelectorAll("[data-map-frame]").forEach((iframe) => {
      iframe.src = "https://www.google.com/maps?q=" + b.address.mapsEmbedQuery + "&output=embed";
      iframe.title = "Map to " + b.name;
      iframe.loading = "lazy";
    });
    document.querySelectorAll("[data-wa-fab]").forEach((a) => (a.href = b.whatsappLink));
    document.querySelectorAll("[data-wa-link]").forEach((a) => (a.href = b.whatsappLink));
  }

  function formatPhoneIntl(intl) {
    // "+61481119280" -> "+61 481 119 280" (best-effort cosmetic formatting)
    const m = intl.match(/^(\+\d{2})(\d{3})(\d{3})(\d{3})$/);
    return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : intl;
  }

  function renderBrandFields() {
    document.querySelectorAll("[data-brand-name]").forEach((n) => (n.textContent = B.business.name));
    document.querySelectorAll("[data-brand-short]").forEach((n) => (n.textContent = B.business.shortName));
    document.querySelectorAll("[data-abn]").forEach((n) => (n.textContent = B.business.abn));
    document.querySelectorAll("[data-licence]").forEach((n) => (n.textContent = B.business.licence));
    document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
  }

  function renderAll() {
    renderBrandFields();
    renderHeroBadge();
    renderServices();
    renderWhy();
    renderSampleInspection();
    renderProcess();
    renderReviews();
    renderHours();
    renderContact();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    renderAll();
  });
  // Re-render translated bits (prices "from", "quote on inspection", counts) on language change.
  document.addEventListener("sk:langchange", renderAll);
})();

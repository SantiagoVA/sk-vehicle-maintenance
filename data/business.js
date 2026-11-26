// Single source of truth for business info, services, hours, and copy.
// Edit this file to re-brand the whole site — index.html, book.html,
// js/main.js + js/booking.js (browser) AND backend/src (Node) all read
// this same file, so services/prices/hours can never drift out of sync
// between the site and the booking backend.
//
// Universal module: works as `window.BUSINESS` in the browser (loaded via
// a plain <script> tag, so it also works opened directly from disk with
// no server) and as a require()-able CommonJS module in Node.

var BUSINESS = {
  "_comment": "Edit this file to re-brand the entire site. Every value here is read by js/main.js and js/booking.js and written into the page at load time \u2014 you should not need to touch the HTML to change business details, services or prices.",
  "business": {
    "name": "SK Vehicle Maintenance",
    "shortName": "SK Vehicle",
    "tagline": "Honest mechanics. No surprises.",
    "licence": "MRB 12703",
    "abn": "30 690 436 643",
    "phoneDisplay": "0481 119 280",
    "phoneIntl": "+61481119280",
    "whatsappLink": "https://wa.me/61481119280",
    "email": "skvehiclemaintenance1@gmail.com",
    "instagram": "https://www.instagram.com/skvehiclemaintenance/",
    "facebook": "https://www.facebook.com/people/SK-Vehicle/61588179783478/",
    "address": {
      "line1": "Unit 13, 10 Gibbs Street",
      "line2": "East Cannington WA 6107",
      "line3": "Australia",
      "mapsEmbedQuery": "Unit+13,+10+Gibbs+Street,+East+Cannington+WA+6107",
      "mapsDirectionsQuery": "Unit 13, 10 Gibbs Street, East Cannington WA 6107"
    },
    "rating": {
      "score": "5.0",
      "count": 3,
      "source": "Google"
    }
  },
  "hours": [
    {
      "day": "Monday",
      "open": "09:00",
      "close": "17:00"
    },
    {
      "day": "Tuesday",
      "open": "09:00",
      "close": "17:00"
    },
    {
      "day": "Wednesday",
      "open": "09:00",
      "close": "17:00"
    },
    {
      "day": "Thursday",
      "open": "09:00",
      "close": "17:00"
    },
    {
      "day": "Friday",
      "open": "09:00",
      "close": "17:00"
    },
    {
      "day": "Saturday",
      "open": "09:00",
      "close": "13:00"
    },
    {
      "day": "Sunday",
      "open": null,
      "close": null
    }
  ],
  "services": [
    {
      "id": "logbook",
      "ticket": "SK-101",
      "name": "Logbook Service",
      "shortDesc": "Manufacturer-spec service that keeps your warranty intact.",
      "duration": "~2 hrs",
      "durationMinutes": 120,
      "priceFrom": 250
    },
    {
      "id": "oil-filter",
      "ticket": "SK-102",
      "name": "Oil & Filter Change",
      "shortDesc": "Quality engine oil and genuine filters, done fast.",
      "duration": "~45 min",
      "durationMinutes": 45,
      "priceFrom": 120
    },
    {
      "id": "brakes",
      "ticket": "SK-103",
      "name": "Brakes",
      "shortDesc": "Pads, rotors, fluid flush. Safety never waits.",
      "duration": "~1.5 hrs",
      "durationMinutes": 90,
      "priceFrom": 280
    },
    {
      "id": "battery-electrical",
      "ticket": "SK-104",
      "name": "Battery & Electrical",
      "shortDesc": "Battery replacement, alternator and starter checks.",
      "duration": "~30 min",
      "durationMinutes": 30,
      "priceFrom": 180
    },
    {
      "id": "tyres-alignment",
      "ticket": "SK-105",
      "name": "Tyres & Alignment",
      "shortDesc": "Rotation, balancing and precision wheel alignment.",
      "duration": "~45 min",
      "durationMinutes": 45,
      "priceFrom": 90
    },
    {
      "id": "diagnostic",
      "ticket": "SK-106",
      "name": "Diagnostic Scan",
      "shortDesc": "DTC scan, road test and plain-English report.",
      "duration": "~45 min",
      "durationMinutes": 45,
      "priceFrom": 100
    },
    {
      "id": "ac-service",
      "ticket": "SK-107",
      "name": "A/C Service",
      "shortDesc": "Regas, leak check and cabin filter replacement.",
      "duration": "~1 hr",
      "durationMinutes": 60,
      "priceFrom": 180
    },
    {
      "id": "pre-purchase",
      "ticket": "SK-108",
      "name": "Pre-Purchase Inspection",
      "shortDesc": "Buying used? Let us check it before you commit.",
      "duration": "~1 hr",
      "durationMinutes": 60,
      "priceFrom": 180
    },
    {
      "id": "general-repairs",
      "ticket": "SK-109",
      "name": "General Repairs",
      "shortDesc": "Clutch, timing belt, suspension, exhaust and more.",
      "duration": "Quote on inspection",
      "durationMinutes": 90,
      "priceFrom": null
    }
  ],
  "whyUs": [
    {
      "title": "Licensed and insured",
      "desc": "WA MRB 12703 \u2014 real accountability."
    },
    {
      "title": "Transparent reports",
      "desc": "Written inspection notes, every visit."
    },
    {
      "title": "No surprise bills",
      "desc": "Quote first \u2014 approval before work starts."
    },
    {
      "title": "Local family team",
      "desc": "Same faces, every time you come back."
    }
  ],
  "sampleInspection": {
    "ticket": "INV-0089",
    "vehicle": "Hyundai Tucson",
    "items": [
      {
        "label": "All lights working",
        "status": "pass"
      },
      {
        "label": "Front & rear brake pads OK",
        "status": "pass"
      },
      {
        "label": "DTC scan \u2014 no codes found",
        "status": "pass"
      },
      {
        "label": "Rear tyres \u2014 replacement recommended",
        "status": "warn"
      },
      {
        "label": "Rear right shock absorber leaking",
        "status": "fail"
      },
      {
        "label": "Coolant low % glycol \u2014 replacement recommended",
        "status": "warn"
      }
    ],
    "moreCount": 11
  },
  "process": [
    {
      "title": "Book online",
      "desc": "Pick a service and a time that suits you \u2014 takes under a minute."
    },
    {
      "title": "Confirm by WhatsApp",
      "desc": "We confirm automatically and send reminders \u2014 no missed appointments."
    },
    {
      "title": "Drop off & inspect",
      "desc": "We inspect your vehicle and send a transparent quote before starting."
    },
    {
      "title": "Fixed & ready",
      "desc": "Pay online, pick up your keys, drive safe."
    }
  ],
  "reviews": [
    {
      "quote": "Thorough, honest and fairly priced. The inspection report they send after every service is gold \u2014 no guessing about what's next.",
      "author": "Manuel G.",
      "meta": "Hyundai Tucson owner"
    },
    {
      "quote": "Friendly team, clear explanations and no pressure to do extras. Exactly what you want from a local mechanic.",
      "author": "Perth driver",
      "meta": "verified via Google"
    },
    {
      "quote": "Brought in my car thinking it needed a major repair \u2014 they diagnosed a simple fix and saved me hundreds. Earned a customer for life.",
      "author": "Local customer",
      "meta": "East Cannington"
    }
  ]
};

if (typeof window !== "undefined") window.BUSINESS = BUSINESS;
if (typeof module !== "undefined" && module.exports) module.exports = BUSINESS;


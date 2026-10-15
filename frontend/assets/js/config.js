/* =====================================================================
   AdmitPath — config.js
   Central runtime configuration. In the full-stack build this file points
   at the FastAPI backend; in this front-end-only build it switches the API
   client to a localStorage-backed mock so every form still works.
   ===================================================================== */
(function () {
  "use strict";

  window.AP = window.AP || {};

  AP.config = {
    brand: "AdmitPath",
    tagline: "Your Journey. Your Future.",

    /* Backend base URL for the full-stack version. */
    apiBaseUrl: "/api/v1",

    /* Front-end-only demo mode: requests are served by assets/js/api.js
       mock layer backed by localStorage. Set to false + run FastAPI to use
       the real backend. */
    demoMode: true,

    /* ---- Configurable embeds / placeholders ---- */
    // Google Maps embed pinned to the AdmitPath office building (no API key needed).
    googleMapsEmbedUrl:
      "https://www.google.com/maps?q=Apex%20Towers%2C%20MG%20Road%2C%20Bengaluru%2C%20Karnataka%20560001%2C%20India&z=16&output=embed",
    officeAddressConfigured: true,
    officeAddressPlaceholder:
      "AdmitPath Admissions, 4th Floor, Apex Towers, MG Road, Bengaluru, Karnataka 560001, India",

    /* Launch date for the Coming Soon countdown. Set to an ISO date to
       enable the countdown; leave null to hide it (per requirements). */
    launchDate: null,

    /* Upload rules (mirrored on the (future) backend). */
    essayUpload: {
      allowedExtensions: ["pdf", "doc", "docx", "txt", "rtf"],
      maxSizeMb: 5,
    },

    /* Demo accounts for the front-end-only build. These are SAMPLE
       credentials shown on the login page. Passwords are stored obfuscated
       for demonstration only — this is NOT secure and is replaced by the
       FastAPI + Argon2 backend in the full-stack build. */
    demoAccounts: [
      { name: "Aarav Sharma", email: "student@admitpath.test", password: "Student@123", role: "STUDENT" },
    ],

    roles: { STUDENT: "STUDENT" },

    /* Canonical origin placeholder for SEO tags. */
    canonicalOrigin: "https://www.admitpath.example",
  };
})();

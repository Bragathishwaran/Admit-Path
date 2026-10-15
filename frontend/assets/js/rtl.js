/* =====================================================================
   AdmitPath — rtl.js
   Right-to-left support. Toggles <html dir> and lang, mirrors the layout
   via CSS logical properties, and persists the choice.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const KEY = "admitpath.dir";
  const root = document.documentElement;

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  function apply(dir) {
    root.setAttribute("dir", dir);
    root.setAttribute("lang", dir === "rtl" ? "ar" : "en");
    document.querySelectorAll("[data-rtl-toggle]").forEach((btn) => {
      const isRtl = dir === "rtl";
      btn.setAttribute("aria-pressed", isRtl ? "true" : "false");
      let icon = btn.querySelector("i");
      if (!icon) {
        icon = document.createElement("i");
        btn.prepend(icon);
      }
      icon.className = `bi ${isRtl ? "bi-text-right" : "bi-text-left"}`;
      btn.setAttribute("aria-label", isRtl ? "Switch to left-to-right layout" : "Switch to right-to-left layout");
    });
    document.dispatchEvent(new CustomEvent("ap:dir", { detail: { dir } }));
  }

  let current = stored() || "ltr";
  apply(current);

  function toggle() {
    current = current === "rtl" ? "ltr" : "rtl";
    try { localStorage.setItem(KEY, current); } catch (e) {}
    apply(current);
  }

  function wire() {
    document.querySelectorAll("[data-rtl-toggle]").forEach((btn) => {
      if (btn.__rtlBound) return;
      btn.__rtlBound = true;
      btn.addEventListener("click", toggle);
    });
    apply(current);
  }

  document.addEventListener("DOMContentLoaded", wire);
  document.addEventListener("ap:partials-loaded", wire);

  AP.rtl = { get: () => current, set: apply, toggle };
})();

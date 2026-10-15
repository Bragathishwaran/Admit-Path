/* =====================================================================
   AdmitPath — theme.js
   Light/dark theme switching. Applies the saved (or system) theme as early
   as possible to avoid a flash, then wires up every [data-theme-toggle].
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const KEY = "admitpath.theme";
  const root = document.documentElement;

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function systemPref() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      const icon = btn.querySelector("i");
      if (icon) icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    });
    document.dispatchEvent(new CustomEvent("ap:theme", { detail: { theme } }));
  }

  let current = stored() || systemPref();
  apply(current);

  function toggle() {
    current = current === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, current); } catch (e) {}
    apply(current);
  }

  function wire() {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      if (btn.__themeBound) return;
      btn.__themeBound = true;
      btn.addEventListener("click", toggle);
    });
    apply(current);
  }

  // Keep in sync with system changes only when the user hasn't chosen.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!stored()) { current = e.matches ? "dark" : "light"; apply(current); }
    });
  }

  document.addEventListener("DOMContentLoaded", wire);
  document.addEventListener("ap:partials-loaded", wire);

  AP.theme = { get: () => current, set: apply, toggle };
})();

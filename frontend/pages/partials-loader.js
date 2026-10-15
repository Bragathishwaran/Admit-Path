/* =====================================================================
   AdmitPath — partials-loader.js
   Loads shared HTML partials (header, footer, etc.) into every page.

   WHY: Browsers do not resolve HTML includes over file://. Serve the
   frontend through a local HTTP server (or the FastAPI static mount) so
   these fetch() calls succeed. See frontend/README.md.

   Usage in a page:
     <div data-include="components/header.html"></div>

   The loader injects the fetched markup (trusted, same-origin templates —
   never user content) and dispatches `ap:partials-loaded` when finished so
   navigation.js / theme.js / main.js can (re)initialise.
   ===================================================================== */
(function () {
  "use strict";

  function resolvePath(path) {
    // Pages live at the frontend root, so component paths are relative
    // to the document already (e.g. "components/header.html").
    return path;
  }

  async function loadPartial(el) {
    const path = resolvePath(el.getAttribute("data-include"));
    try {
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      el.innerHTML = await res.text();
      el.removeAttribute("data-include");
      el.setAttribute("data-include-loaded", path);
    } catch (err) {
      console.error("[AdmitPath] Failed to load partial:", path, err);
      el.innerHTML =
        '<div style="padding:1rem;margin:1rem;border:1px dashed var(--error);border-radius:12px;color:var(--error);font-family:var(--font-body)">' +
        '<strong>Could not load ' + path + '.</strong><br>Serve the site over HTTP (not file://). ' +
        'Run <code>python -m http.server 5500</code> inside the <code>frontend</code> folder.</div>';
    }
  }

  async function init() {
    const targets = Array.prototype.slice.call(document.querySelectorAll("[data-include]"));
    if (!targets.length) { document.dispatchEvent(new CustomEvent("ap:partials-loaded")); return; }
    await Promise.all(targets.map(loadPartial));
    document.dispatchEvent(new CustomEvent("ap:partials-loaded"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

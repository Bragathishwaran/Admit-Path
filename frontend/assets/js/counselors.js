/* =====================================================================
   AdmitPath — counselors.js
   Counselor directory: live search, specialization filtering and a
   profile detail modal. (Slightly outside the documented file list but
   kept separate to avoid bloating other modules.)
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function card(c) {
    return '' +
      '<div class="col-12 col-md-6 col-xl-4" data-counselor-card>' +
      '<article class="ap-card ap-card--hover h-100 text-center ap-card__body p-4">' +
      '<img class="ap-avatar ap-avatar--lg mx-auto mb-3" src="' + esc(c.photo) + '" alt="Portrait of ' + esc(c.name) + '" loading="lazy" style="width:96px;height:96px;object-fit:cover">' +
      '<h3 class="h6 mb-1">' + esc(c.name) + '</h3>' +
      '<p class="small ap-text-accent fw-semibold mb-2">' + esc(c.title) + '</p>' +
      '<p class="ap-stars mb-2" aria-label="Rating ' + c.rating + ' out of 5"><i class="bi bi-star-fill"></i> ' + c.rating.toFixed(1) + ' <span class="ap-text-muted">· ' + c.studentsCount + ' students</span></p>' +
      '<div class="d-flex flex-wrap justify-content-center gap-1 mb-3">' +
      c.specializations.map((s) => '<span class="ap-badge ap-badge--accent">' + esc(s) + '</span>').join("") +
      '</div>' +
      '<p class="small ap-clamp-2">' + esc(c.bio) + '</p>' +
      '<div class="d-flex gap-2 justify-content-center mt-3">' +
      '<button type="button" class="btn-ap btn-ap--outline btn-ap--sm" data-counselor-view="' + esc(c.id) + '">View profile</button>' +
      '<a href="meetings.html" class="btn-ap btn-ap--primary btn-ap--sm">Book</a>' +
      '</div></article></div>';
  }

  function initDirectory() {
    const root = document.querySelector("[data-counselor-directory]");
    if (!root) return;
    const grid = root.querySelector("[data-counselor-grid]");
    const search = root.querySelector("[data-counselor-search]");
    const filter = root.querySelector("[data-counselor-filter]");
    const countEl = root.querySelector("[data-counselor-count]");
    const emptyEl = root.querySelector("[data-counselor-empty]");
    let cache = [];

    async function load() {
      grid.innerHTML = '<div class="col-12 text-center py-4"><span class="ap-spinner ap-text-accent"></span></div>';
      cache = await AP.api.listCounselors({ q: search ? search.value : "", specialization: filter ? filter.value : "All" });
      render();
    }
    function render() {
      grid.innerHTML = cache.map(card).join("");
      if (countEl) countEl.textContent = cache.length;
      if (emptyEl) emptyEl.hidden = cache.length !== 0;
    }

    let t;
    if (search) search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(load, 220); });
    if (filter) filter.addEventListener("change", load);
    load();

    // profile modal
    root.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-counselor-view]"); if (!b) return;
      const c = await AP.api.getCounselor(b.getAttribute("data-counselor-view"));
      const dlg = document.querySelector("[data-counselor-modal]");
      if (!dlg) return;
      dlg.querySelector("[data-cm-name]").textContent = c.name;
      dlg.querySelector("[data-cm-title]").textContent = c.title;
      dlg.querySelector("[data-cm-photo]").src = c.photo;
      dlg.querySelector("[data-cm-bio]").textContent = c.bio;
      dlg.querySelector("[data-cm-meta]").innerHTML =
        '<li><i class="bi bi-mortarboard"></i> ' + esc(c.university) + '</li>' +
        '<li><i class="bi bi-briefcase"></i> ' + c.experience + ' years experience</li>' +
        '<li><i class="bi bi-geo-alt"></i> ' + esc(c.location) + '</li>' +
        '<li><i class="bi bi-translate"></i> ' + esc(c.languages.join(", ")) + '</li>';
      dlg.querySelector("[data-cm-specs]").innerHTML = c.specializations.map((s) => '<span class="ap-badge ap-badge--accent">' + esc(s) + "</span>").join(" ");
      AP.ui.openModal("counselorModal");
    });
  }

  document.addEventListener("DOMContentLoaded", initDirectory);
})();

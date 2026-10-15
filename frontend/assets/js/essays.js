/* =====================================================================
   AdmitPath — essays.js
   Essay workspace: list drafts, submit/upload a new draft (validated),
   view version history and counselor feedback by category.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  function statusBadge(s) {
    const cls = s === "Feedback Ready" ? "success" : s === "In Review" ? "info" : s === "Revision Requested" ? "warning" : "neutral";
    return '<span class="ap-badge ap-badge--' + cls + '">' + esc(s) + '</span>';
  }
  const catIcon = { Structure: "bi-diagram-3", Clarity: "bi-brightness-high", Grammar: "bi-spellcheck", Storytelling: "bi-book" };

  function essayItem(e) {
    return '' +
      '<button type="button" class="ap-task text-start w-100 mb-2" data-essay="' + esc(e.id) + '">' +
      '<span class="ap-icon-box ap-icon-box--primary" style="width:2.25rem;height:2.25rem;font-size:1.05rem"><i class="bi bi-file-earmark-text"></i></span>' +
      '<div class="flex-grow-1 min-w-0"><p class="ap-task__title mb-0">' + esc(e.title) + '</p>' +
      '<span class="ap-task__meta">Version ' + e.version + ' · ' + e.wordCount + ' words · ' + fmt(e.submittedAt) + '</span></div>' +
      statusBadge(e.status) + '</button>';
  }

  async function init() {
    const root = document.querySelector("[data-essays]");
    if (!root) return;
    const session = AP.requireAuth(["STUDENT"]);
    if (!session) return;

    const listEl = root.querySelector("[data-essay-list]");
    const emptyEl = root.querySelector("[data-essay-empty]");
    const detailEl = root.querySelector("[data-essay-detail]");
    const feedbackEl = root.querySelector("[data-essay-feedback]");
    const apps = await AP.api.listApplications();

    async function loadList() {
      const essays = await AP.api.listEssays();
      if (!essays.length) { listEl.innerHTML = ""; emptyEl.hidden = false; detailEl.hidden = true; return []; }
      emptyEl.hidden = true;
      listEl.innerHTML = essays.map(essayItem).join("");
      return essays;
    }

    async function showEssay(id) {
      listEl.querySelectorAll("[data-essay]").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-essay") === id));
      const essays = await AP.api.listEssays();
      const e = essays.find((x) => x.id === id);
      if (!e) return;
      detailEl.hidden = false;
      detailEl.querySelector("[data-ed-title]").textContent = e.title;
      detailEl.querySelector("[data-ed-meta]").innerHTML = 'Version ' + e.version + ' · ' + esc(e.fileName) + ' · ' + e.wordCount + ' words · Submitted ' + fmt(e.submittedAt) + ' ' + statusBadge(e.status);
      // version history (mock versions derived from current)
      const hist = [];
      for (let v = e.version; v >= 1; v--) hist.push({ v, date: new Date(new Date(e.submittedAt) - (e.version - v) * 4 * 86400000) });
      detailEl.querySelector("[data-ed-history]").innerHTML = hist.map((h) => '<li class="d-flex justify-content-between small py-1 border-bottom" style="border-color:var(--border-color)!important"><span><i class="bi bi-file-earmark"></i> Version ' + h.v + (h.v === e.version ? " (current)" : "") + '</span><span class="ap-text-muted">' + fmt(h.date) + '</span></li>').join("");

      const fb = await AP.api.getEssayFeedback(id);
      if (!fb.length) {
        feedbackEl.innerHTML = '<div class="ap-empty py-4"><img src="assets/images/placeholders/empty-state.svg" alt=""><p class="mb-0">No feedback yet. Your counselor will review this draft soon.</p></div>';
      } else {
        feedbackEl.innerHTML = fb.map((f) => (
          '<div class="ap-card ap-card__body mb-2"><div class="d-flex align-items-center gap-2 mb-2">' +
          '<span class="ap-icon-box" style="width:2.25rem;height:2.25rem;font-size:1rem"><i class="bi ' + (catIcon[f.category] || "bi-chat") + '"></i></span>' +
          '<strong class="small">' + esc(f.category) + '</strong>' +
          '<span class="ms-auto small ap-text-muted">' + fmt(f.createdAt) + '</span></div>' +
          '<p class="mb-0 small">' + esc(f.comment) + '</p></div>'
        )).join("");
      }
    }

    listEl.addEventListener("click", (ev) => { const b = ev.target.closest("[data-essay]"); if (b) showEssay(b.getAttribute("data-essay")); });

    // upload form
    const form = document.querySelector("[data-essay-form]");
    if (form) {
      AP.validation.attach(form);
      const appSel = form.querySelector('[name="applicationId"]');
      if (appSel) appSel.innerHTML = apps.map((a) => '<option value="' + a.id + '">' + esc(a.university) + '</option>').join("");
      const fileInput = form.querySelector('[name="essayFile"]');
      if (fileInput) fileInput.addEventListener("change", () => {
        const f = fileInput.files[0];
        const hint = form.querySelector("[data-file-name]");
        if (f && hint) hint.textContent = f.name + " (" + (f.size / 1024).toFixed(0) + " KB)";
      });
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        if (!AP.validation.validateForm(form)) return;
        const btn = form.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        const d = AP.validation.getData(form);
        const f = fileInput.files[0];
        try {
          await AP.api.createEssay({ applicationId: d.applicationId, title: d.title, fileName: f.name, fileSize: f.size, wordCount: d.wordCount });
          AP.validation.setLoading(btn, false);
          AP.ui.closeModal("uploadEssayModal");
          form.reset();
          const hint = form.querySelector("[data-file-name]"); if (hint) hint.textContent = "";
          AP.ui.toast("Draft uploaded. Your counselor will review it soon.", "success");
          await loadList();
        } catch (err) { AP.validation.setLoading(btn, false); AP.validation.applyServerErrors(form, err.errors); AP.ui.toast(err.message, "error"); }
      });
    }

    const essays = await loadList();
    if (essays.length) showEssay(essays[0].id);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

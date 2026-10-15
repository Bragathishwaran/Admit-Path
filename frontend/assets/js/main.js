/* =====================================================================
   AdmitPath — main.js
   Global UI helpers: toasts, modals, accordions, scroll reveal, password
   toggles, back-to-top, footer year, and the shared newsletter form.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const ui = {};

  /* ---------------- Toast ---------------- */
  function toastContainer() {
    let c = document.querySelector(".ap-toast-wrap");
    if (!c) { c = document.createElement("div"); c.className = "ap-toast-wrap"; c.setAttribute("aria-live", "polite"); document.body.appendChild(c); }
    return c;
  }
  const toastIcons = { success: "bi-check-circle-fill", error: "bi-x-circle-fill", info: "bi-info-circle-fill", warning: "bi-exclamation-triangle-fill" };
  ui.toast = function (message, type, timeout) {
    const c = toastContainer();
    const el = document.createElement("div");
    el.className = "ap-toast ap-toast--" + (type || "info");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = '<i class="bi ' + (toastIcons[type] || toastIcons.info) + ' ap-toast__icon"></i><div class="ap-toast__msg"></div><button type="button" class="ap-icon-btn" style="width:28px;height:28px;border:0" aria-label="Dismiss"><i class="bi bi-x"></i></button>';
    el.querySelector(".ap-toast__msg").textContent = message;
    c.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-show"));
    const remove = () => { el.classList.remove("is-show"); setTimeout(() => el.remove(), 300); };
    el.querySelector("button").addEventListener("click", remove);
    setTimeout(remove, timeout || 5000);
  };

  /* ---------------- Modal ---------------- */
  ui.openModal = function (id) {
    const m = document.getElementById(id) || document.querySelector('[data-modal="' + id + '"]');
    if (!m) return;
    m.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const focusable = m.querySelector("input,select,textarea,button,a[href]");
    if (focusable) setTimeout(() => focusable.focus(), 40);
    const onEsc = (e) => { if (e.key === "Escape") close(); };
    function close() { ui.closeModal(id); document.removeEventListener("keydown", onEsc); }
    document.addEventListener("keydown", onEsc);
    m.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", close, { once: true }));
    m.addEventListener("click", (e) => { if (e.target.classList.contains("ap-modal__overlay")) close(); });
  };
  ui.closeModal = function (id) {
    const m = document.getElementById(id) || document.querySelector('[data-modal="' + id + '"]');
    if (!m) return;
    m.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  /* ---------------- Accordion ---------------- */
  function initAccordions() {
    document.querySelectorAll(".ap-acc").forEach((acc) => {
      if (acc.__accBound) return; acc.__accBound = true;
      acc.querySelectorAll(".ap-acc__btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = btn.closest(".ap-acc__item");
          const panel = item.querySelector(".ap-acc__panel");
          const open = item.classList.contains("is-open");
          const single = acc.hasAttribute("data-acc-single");
          if (single) {
            acc.querySelectorAll(".ap-acc__item.is-open").forEach((it) => {
              it.classList.remove("is-open");
              it.querySelector(".ap-acc__panel").style.maxHeight = null;
              it.querySelector(".ap-acc__btn").setAttribute("aria-expanded", "false");
            });
          }
          if (!open) {
            item.classList.add("is-open");
            panel.style.maxHeight = panel.scrollHeight + "px";
            btn.setAttribute("aria-expanded", "true");
          } else {
            item.classList.remove("is-open");
            panel.style.maxHeight = null;
            btn.setAttribute("aria-expanded", "false");
          }
        });
      });
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    const els = document.querySelectorAll(".ap-reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------------- Counters ---------------- */
  function initCounters() {
    const els = document.querySelectorAll("[data-count]");
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target; io.unobserve(el);
        const target = parseFloat(el.getAttribute("data-count"));
        const suffix = el.getAttribute("data-suffix") || "";
        const dur = 1200; const start = performance.now();
        const step = (t) => {
          const p = Math.min((t - start) / dur, 1);
          const val = Math.floor(target * (1 - Math.pow(1 - p, 3)));
          el.textContent = val.toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(step); else el.textContent = target.toLocaleString() + suffix;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------------- Password visibility ---------------- */
  function initPasswordToggles() {
    document.querySelectorAll("[data-pass-toggle]").forEach((btn) => {
      if (btn.__passBound) return; btn.__passBound = true;
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-pass-toggle");
        const input = document.querySelector(target);
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.querySelector("i").className = show ? "bi bi-eye-slash" : "bi bi-eye";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        btn.setAttribute("aria-pressed", show ? "true" : "false");
      });
    });
  }

  /* ---------------- Back to top ---------------- */
  function initBackToTop() {
    const btn = document.querySelector("[data-back-to-top]");
    if (!btn) return;
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ---------------- Footer year ---------------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------------- Newsletter (shared) ---------------- */
  function initNewsletterForms() {
    document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
      if (form.__nlBound) return; form.__nlBound = true;
      AP.validation.attach(form);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        AP.validation.clearAlert(form);
        if (!AP.validation.validateForm(form)) return;
        const btn = form.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        try {
          const data = AP.validation.getData(form);
          const res = await AP.api.subscribeNewsletter(data.email || data.newsletterEmail);
          AP.validation.setLoading(btn, false);
          AP.validation.showAlert(form, res.message, "success");
          if (!res.duplicate) ui.toast(res.message, "success");
          form.reset();
        } catch (err) {
          AP.validation.setLoading(btn, false);
          AP.validation.applyServerErrors(form, err.errors);
          AP.validation.showAlert(form, err.message || "Something went wrong. Please try again.", "error");
        }
      });
    });
  }

  /* ---------------- Auth-aware header links ---------------- */
  function renderAuthState() {
    const s = AP.session.get();
    document.querySelectorAll("[data-auth-guest]").forEach((el) => { el.hidden = !!s; });
    document.querySelectorAll("[data-auth-user]").forEach((el) => { el.hidden = !s; });
    if (s) {
      document.querySelectorAll("[data-auth-name]").forEach((el) => { el.textContent = s.name; });
      document.querySelectorAll("[data-auth-role]").forEach((el) => { el.textContent = s.role.charAt(0) + s.role.slice(1).toLowerCase(); });
    }
    // Route every dashboard button/link straight to the dashboard page,
    // regardless of auth state (the page itself guards access if needed).
    document.querySelectorAll("[data-auth-dashboard]").forEach((el) => {
      el.href = "student-dashboard.html";
    });
    document.querySelectorAll("[data-logout]").forEach((btn) => {
      if (btn.__logoutBound) return; btn.__logoutBound = true;
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        await AP.api.logout();
        ui.toast("You have been signed out.", "info", 2500);
        setTimeout(() => { window.location.href = "index.html"; }, 700);
      });
    });
    // Notifications badge
    const notifs = AP.api.notifications();
    const unread = notifs.filter((n) => !n.read).length;
    document.querySelectorAll("[data-notif-count]").forEach((el) => {
      el.textContent = unread;
      el.hidden = unread === 0;
    });
    // Re-evaluate active nav state now that the Dashboard link href is set
    if (AP.nav && AP.nav.markActiveLinks) AP.nav.markActiveLinks();
  }

  /* ---------------- Preloader ---------------- */
  function initPreloader() {
    const p = document.getElementById("apPreloader");
    if (!p) return;
    const hide = () => p.classList.add("is-hidden");
    if (document.readyState === "complete") setTimeout(hide, 250);
    else window.addEventListener("load", () => setTimeout(hide, 250));
    setTimeout(hide, 2600); // safety
  }

  /* ---------------- Generic modal triggers ---------------- */
  function initModalTriggers() {
    document.querySelectorAll("[data-open-modal]").forEach((b) => {
      if (b.__omBound) return; b.__omBound = true;
      b.addEventListener("click", (e) => { e.preventDefault(); ui.openModal(b.getAttribute("data-open-modal")); });
    });
  }

  /* ---------------- Shared consultation modal form ---------------- */
  function initConsultForm() {
    const form = document.querySelector("[data-consult-form]");
    if (!form || form.__cfBound) return; form.__cfBound = true;
    AP.validation.attach(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      AP.validation.clearAlert(form);
      if (!AP.validation.validateForm(form)) return;
      const btn = form.querySelector('button[type="submit"]');
      AP.validation.setLoading(btn, true);
      const d = AP.validation.getData(form);
      try {
        await AP.api.createContact({ name: d.name, email: d.email, mobile: d.mobile, subject: "Consultation request", category: d.topic || "General", message: "Free consultation requested for: " + (d.topic || "General"), consent: true });
        AP.validation.setLoading(btn, false);
        ui.closeModal("consultModal");
        form.reset();
        ui.toast("Thanks! A counselor will contact you shortly.", "success");
      } catch (err) { AP.validation.setLoading(btn, false); AP.validation.applyServerErrors(form, err.errors); ui.toast(err.message || "Something went wrong.", "error"); }
    });
  }

  /* ---------------- Breadcrumbs ---------------- */
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function initBreadcrumbs() {
    const root = document.querySelector("[data-breadcrumb-root]");
    if (!root) return;
    const title = document.body.getAttribute("data-page-title");
    if (!title) return;
    if (root.querySelector('[data-crumb-current]')) return;
    const li = document.createElement("li");
    li.setAttribute("data-crumb-current", "");
    li.innerHTML = '<span class="sep">/</span><span aria-current="page">' + escapeHtml(title) + "</span>";
    root.appendChild(li);
    // BreadcrumbList structured data
    try {
      const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: AP.config.canonicalOrigin + "/index.html" }, { "@type": "ListItem", position: 2, name: title }] };
      const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    } catch (e) {}
  }

  /* ---------------- Pricing toggle ---------------- */
  function initPricingToggle() {
    const group = document.querySelector("[data-price-group]");
    if (!group) return;
    group.addEventListener("click", (e) => {
      const b = e.target.closest("[data-price-cycle]"); if (!b) return;
      const cycle = b.getAttribute("data-price-cycle");
      group.querySelectorAll("[data-price-cycle]").forEach((x) => x.classList.toggle("is-active", x === b));
      document.querySelectorAll("[data-price]").forEach((el) => {
        el.textContent = el.getAttribute("data-" + cycle) || el.textContent;
      });
    });
  }

  /* ---------------- Filter chips (generic) ---------------- */
  function initChips() {
    document.querySelectorAll("[data-chip-group]").forEach((grp) => {
      grp.addEventListener("click", (e) => {
        const b = e.target.closest("[data-chip]"); if (!b) return;
        grp.querySelectorAll("[data-chip]").forEach((x) => x.classList.toggle("is-active", x === b));
      });
    });
  }

  ui.initAll = function () {
    initAccordions();
    initReveal();
    initCounters();
    initPasswordToggles();
    initBackToTop();
    initYear();
    initNewsletterForms();
    renderAuthState();
    initPreloader();
    initModalTriggers();
    initConsultForm();
    initBreadcrumbs();
    initPricingToggle();
    initChips();
  };

  document.addEventListener("DOMContentLoaded", ui.initAll);
  document.addEventListener("ap:partials-loaded", ui.initAll);

  AP.ui = ui;

  /* ---------------- Guard for authenticated pages ---------------- */
  AP.requireAuth = function (roles) {
    const s = AP.session.get() || (AP.api && AP.api.previewSession ? AP.api.previewSession() : null);
    if (!s) return null;
    if (roles && roles.length && roles.indexOf(s.role) === -1) {
      window.location.replace("student-dashboard.html");
      return null;
    }
    return s;
  };
})();

/* =====================================================================
   AdmitPath — navigation.js
   Sticky header behaviour, dropdowns, mobile drawer, active-link marking,
   dashboard sidebar toggle and back-to-top.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};

  function currentPage() {
    const parts = window.location.pathname.split("/");
    let file = parts[parts.length - 1] || "index.html";
    if (!file || file === "") file = "index.html";
    // Normalise directory serving (e.g. "/" -> index.html)
    if (file === "/") file = "index.html";
    return file;
  }

  function markActiveLinks() {
    const page = currentPage();
    document.querySelectorAll("[data-nav], .ap-nav__link, .ap-mobile__link, .ap-sidebar__link, .ap-dropdown__item").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel")) return;
      const target = href.split("/").pop().split("?")[0].split("#")[0];
      const isActive = target === page;
      if (!isActive) return;
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
      // Mark parent dropdown trigger too
      const dd = link.closest(".ap-dropdown");
      if (dd) { const t = dd.querySelector(".ap-nav__link"); if (t) { t.classList.add("is-active"); t.setAttribute("aria-current", "page"); } }
    });
  }

  /* ---- sticky header ---- */
  function stickyHeader() {
    const header = document.querySelector(".ap-header");
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 8) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
      const top = document.querySelector("[data-back-to-top]");
      if (top) top.classList.toggle("is-visible", window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- dropdowns ---- */
  function dropdowns() {
    const triggers = document.querySelectorAll("[data-dropdown]");
    triggers.forEach((trigger) => {
      if (trigger.__ddBound) return;
      trigger.__ddBound = true;
      const dd = trigger.closest(".ap-dropdown");

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const open = dd.classList.contains("is-open");
        closeAllDropdowns();
        if (!open) { dd.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); }
      });
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); dd.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); const first = dd.querySelector(".ap-dropdown__item"); if (first) first.focus(); }
      });
      dd.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { dd.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".ap-dropdown")) closeAllDropdowns();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAllDropdowns(); });
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".ap-dropdown.is-open").forEach((dd) => {
      dd.classList.remove("is-open");
      const t = dd.querySelector("[data-dropdown]");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  /* ---- mobile drawer ---- */
  function mobileDrawer() {
    const drawer = document.querySelector(".ap-mobile");
    if (!drawer) return;
    const openers = document.querySelectorAll("[data-mobile-open]");
    const closers = drawer.querySelectorAll("[data-mobile-close]");
    const open = () => {
      drawer.classList.add("is-open");
      document.body.style.overflow = "hidden";
      openers.forEach((b) => b.setAttribute("aria-expanded", "true"));
      const first = drawer.querySelector("a, button");
      if (first) setTimeout(() => first.focus(), 50);
    };
    const close = () => {
      drawer.classList.remove("is-open");
      document.body.style.overflow = "";
      openers.forEach((b) => b.setAttribute("aria-expanded", "false"));
    };
    openers.forEach((b) => { b.addEventListener("click", open); b.setAttribute("aria-expanded", "false"); });
    closers.forEach((b) => b.addEventListener("click", close));
    drawer.querySelector(".ap-mobile__overlay") && drawer.querySelector(".ap-mobile__overlay").addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }

  /* ---- dashboard sidebar ---- */
  let dashReady = false;
  function dashboardSidebar() {
    if (!document.querySelector(".ap-sidebar")) return;

    const getSidebar = () => document.querySelector(".ap-sidebar");
    const getOverlay = () => {
      let ov = document.querySelector(".ap-sidebar-overlay");
      if (!ov) {
        ov = document.createElement("div");
        ov.className = "ap-sidebar-overlay";
        document.body.appendChild(ov);
      }
      return ov;
    };
    getOverlay();

    const isMobile = () => window.matchMedia("(max-width: 767.98px)").matches;
    const isOpen = () => {
      const sb = getSidebar();
      if (!sb) return false;
      return isMobile() ? sb.classList.contains("is-open") : !sb.classList.contains("is-collapsed");
    };
    const syncButton = (opened) => {
      document.querySelectorAll("[data-sidebar-toggle]").forEach((b) => {
        b.setAttribute("aria-expanded", String(opened));
        b.setAttribute("aria-label", opened ? "Close dashboard menu" : "Open dashboard menu");
      });
    };
    const open = () => {
      const sb = getSidebar();
      if (!sb) return;
      sb.classList.remove("is-collapsed");
      if (isMobile()) {
        sb.classList.add("is-open");
        getOverlay().classList.add("is-open");
        document.body.style.overflow = "hidden";
      }
      syncButton(true);
    };
    const close = () => {
      const sb = getSidebar();
      if (!sb) return;
      sb.classList.remove("is-open");
      getOverlay().classList.remove("is-open");
      document.body.style.overflow = "";
      syncButton(false);
    };

    if (dashReady) { syncButton(isOpen()); return; }
    dashReady = true;

    // Delegated so it keeps working even if the topbar/sidebar is re-rendered.
    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-sidebar-toggle]");
      if (toggle) { e.preventDefault(); if (isOpen()) close(); else open(); return; }
      if (e.target.closest(".ap-sidebar-overlay")) { close(); return; }
      if (isMobile() && e.target.closest(".ap-sidebar a")) close();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    window.addEventListener("resize", () => {
      const sb = getSidebar();
      if (!sb) return;
      if (isMobile()) {
        sb.classList.remove("is-collapsed");
        if (sb.classList.contains("is-open")) {
          getOverlay().classList.add("is-open");
          document.body.style.overflow = "hidden";
        } else { close(); }
      } else {
        sb.classList.remove("is-open");
        sb.classList.remove("is-collapsed");
        getOverlay().classList.remove("is-open");
        document.body.style.overflow = "";
        syncButton(true);
      }
    });
    syncButton(isOpen());
  }

  function init() {
    markActiveLinks();
    stickyHeader();
    dropdowns();
    mobileDrawer();
    dashboardSidebar();
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ap:partials-loaded", init);

  AP.nav = { init, markActiveLinks, closeAllDropdowns };
})();

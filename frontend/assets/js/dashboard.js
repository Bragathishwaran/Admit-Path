/* =====================================================================
   AdmitPath — dashboard.js
   Authenticated student dashboard: loads real session data, renders
   widgets, university cards, deadlines, meetings and activity. Includes
   loading, empty and error states.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  function badge(status) {
    const map = { Completed: "success", "In Progress": "warning", Pending: "neutral", Confirmed: "success", Scheduled: "info", Cancelled: "error", "Feedback Ready": "success", "In Review": "info", "Revision Requested": "warning", Planning: "neutral" };
    const cls = map[status] || "neutral";
    return '<span class="ap-badge ap-badge--' + cls + '">' + esc(status) + "</span>";
  }

  function setText(sel, val) { const el = document.querySelector(sel); if (el) el.textContent = val; }

  function setState(state, msg) {
    const loading = document.querySelector("[data-dash-loading]");
    const content = document.querySelector("[data-dash-content]");
    const error = document.querySelector("[data-dash-error]");
    if (loading) loading.hidden = state !== "loading";
    if (content) content.hidden = state !== "ready";
    if (error) { error.hidden = state !== "error"; if (msg) error.querySelector("[data-dash-error-msg]") && (error.querySelector("[data-dash-error-msg]").textContent = msg); }
  }

  // The widgets use .ap-reveal (opacity:0) which normally animates in via an
  // IntersectionObserver set up while this content was still `hidden`. Once the
  // dashboard is ready, force the reveal so content is never left invisible
  // (which looks like an endless loading state) even if the observer does not
  // re-fire after the container becomes visible.
  function revealContent(root) {
    root.querySelectorAll(".ap-reveal").forEach((el) => el.classList.add("is-in"));
  }

  function initDashboardControls() {
    const wrap = document.querySelector("[data-notifications]");
    const toggle = document.querySelector("[data-notifications-toggle]");
    const panel = document.querySelector("[data-notifications-panel]");
    const list = document.querySelector("[data-notifications-list]");
    if (!wrap || !toggle || !panel || !list || toggle.__notificationsBound) return;
    toggle.__notificationsBound = true;
    const items = AP.api && AP.api.notifications ? AP.api.notifications() : [];
    const unread = items.filter((n) => !n.read).length;
    const summary = wrap.querySelector("[data-notifications-summary]");
    if (summary) summary.textContent = unread ? unread + " unread" : "All caught up";
    list.innerHTML = items.length ? items.slice().sort((a, b) => new Date(b.time) - new Date(a.time)).map((n) => {
      const icon = /^[a-z0-9-]+$/.test(n.icon || "") ? n.icon : "bi-bell";
      return '<li class="ap-notifications__item ' + (!n.read ? "is-unread" : "") + '"><span class="ap-notifications__item-icon"><i class="bi ' + icon + '"></i></span><div><p>' + esc(n.text) + '</p><time datetime="' + esc(n.time) + '">' + fmtDate(n.time) + '</time></div></li>';
    }).join("") : '<li class="ap-notifications__empty">You have no notifications yet.</li>';
    const closePanel = () => { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });
    document.addEventListener("click", (event) => { if (!wrap.contains(event.target)) closePanel(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closePanel(); closeMenu(); }
    });
  }

  async function init() {
    const root = document.querySelector("[data-student-dashboard]");
    if (!root) return;

    // Safety net: never leave the user staring at the loading state.
    const watchdog = setTimeout(() => {
      const loading = document.querySelector("[data-dash-loading]");
      if (loading && !loading.hidden) {
        setState("error", "This is taking longer than expected. Please reload the page and try again.");
      }
    }, 12000);

    try {
      const session = AP.requireAuth(["STUDENT"]);
      if (!session) { clearTimeout(watchdog); return; }

      setState("loading");
      const data = await AP.api.dashboard();
      setText("[data-welcome-name]", data.user.name.split(" ")[0]);
      setText("[data-stat-applications]", data.stats.applications);
      setText("[data-stat-progress]", data.stats.progress + "%");
      setText("[data-stat-essays]", data.stats.essays);
      setText("[data-stat-meetings]", data.stats.meetings);
      setText("[data-checklist-ratio]", data.stats.checklistDone + "/" + data.stats.checklistTotal);
      const bar = document.querySelector("[data-progress-bar]");
      if (bar) bar.style.width = data.stats.progress + "%";
      const ring = document.querySelector("[data-progress-ring]");
      if (ring) { ring.style.setProperty("--val", data.stats.progress); ring.querySelector(".ap-ring__value").textContent = data.stats.progress + "%"; }

      // University application cards
      const appsWrap = root.querySelector("[data-applications]");
      if (appsWrap) {
        if (!data.recentApplications.length) {
          appsWrap.innerHTML = '<div class="ap-empty"><img src="assets/images/placeholders/empty-state.svg" alt=""><p>No applications yet. Add your first university to get started.</p><a href="services.html" class="btn-ap btn-ap--primary btn-ap--sm">Add an application</a></div>';
        } else {
          appsWrap.innerHTML = data.recentApplications.map((a) => (
            '<div class="col-12 col-md-6">' +
            '<article class="ap-card ap-card--hover ap-card__body h-100">' +
            '<div class="d-flex justify-content-between align-items-start mb-2"><span class="ap-icon-box ap-icon-box--primary" style="width:2.5rem;height:2.5rem;font-size:1.1rem"><i class="bi bi-mortarboard"></i></span>' + badge(a.status) + '</div>' +
            '<h3 class="h6 mb-1">' + esc(a.university) + '</h3>' +
            '<p class="small mb-2">' + esc(a.program) + '</p>' +
            '<div class="d-flex justify-content-between small ap-text-muted"><span><i class="bi bi-globe2"></i> ' + esc(a.country) + '</span><span><i class="bi bi-calendar-event"></i> ' + fmtDate(a.deadline) + '</span></div>' +
            '</article></div>'
          )).join("");
        }
      }

      // Deadlines
      const dl = root.querySelector("[data-deadlines]");
      if (dl) {
        dl.innerHTML = data.upcomingDeadlines.length ? data.upcomingDeadlines.map((i) => (
          '<li class="d-flex align-items-center gap-3 py-2 border-bottom" style="border-color:var(--border-color)!important">' +
          '<span class="ap-dot ' + (i.priority === "High" ? "ap-dot--error" : i.priority === "Medium" ? "ap-dot--warning" : "ap-dot--muted") + '"></span>' +
          '<div class="flex-grow-1 min-w-0"><p class="mb-0 small fw-semibold text-truncate">' + esc(i.title) + '</p><span class="small ap-text-muted">' + fmtDate(i.dueDate) + '</span></div>' +
          '<a href="application-checklist.html" class="btn-ap btn-ap--ghost btn-ap--sm">Open</a></li>'
        )).join("") : '<li class="ap-text-muted small py-3">You are all caught up. No pending deadlines.</li>';
      }

      // Meetings
      const mt = root.querySelector("[data-meetings]");
      if (mt) {
        mt.innerHTML = data.upcomingMeetings.length ? data.upcomingMeetings.map((m) => (
          '<div class="ap-task mb-2"><span class="ap-icon-box ap-icon-box--primary" style="width:2.5rem;height:2.5rem;font-size:1.05rem"><i class="bi bi-camera-video"></i></span>' +
          '<div class="flex-grow-1"><p class="ap-task__title mb-0">' + esc(m.topic) + '</p><span class="ap-task__meta">' + fmtDate(m.date) + ' · ' + esc(m.time) + ' · ' + esc(m.mode) + '</span></div>' + badge(m.status) + '</div>'
        )).join("") : '<div class="ap-empty py-4"><p class="mb-2">No upcoming meetings.</p><a href="meetings.html" class="btn-ap btn-ap--outline btn-ap--sm">Book a session</a></div>';
      }

      // Activity
      const act = root.querySelector("[data-activity]");
      if (act) {
        act.innerHTML = data.activity.map((n) => (
          '<li class="ap-activity__item"><span class="ap-activity__dot"></span><p class="mb-0 small">' + esc(n.text) + '</p><span class="small ap-text-muted">' + fmtDate(n.time) + '</span></li>'
        )).join("");
      }

      setState("ready");
      revealContent(root);
    } catch (err) {
      setState("error", (err && err.message) || "We could not load your dashboard.");
      if (AP.ui && AP.ui.toast) AP.ui.toast((err && err.message) || "Dashboard failed to load.", "error");
    } finally {
      clearTimeout(watchdog);
    }
  }

  document.addEventListener("DOMContentLoaded", () => { initDashboardControls(); init(); });
})();

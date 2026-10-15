/* =====================================================================
   AdmitPath — meetings.js
   Counselor meetings: upcoming & past lists, availability slots, booking,
   rescheduling and cancellation.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function statusBadge(s) {
    const cls = s === "Completed" ? "success" : s === "Confirmed" ? "success" : s === "Scheduled" ? "info" : s === "Cancelled" ? "error" : "neutral";
    return '<span class="ap-badge ap-badge--' + cls + '">' + esc(s) + '</span>';
  }

  function meetingRow(m, counselors) {
    const c = counselors.find((x) => x.id === m.counselorId);
    const isPast = m.status === "Completed" || m.status === "Cancelled";
    return '' +
      '<div class="ap-task mb-2" data-meeting="' + esc(m.id) + '">' +
      '<span class="ap-icon-box ap-icon-box--primary" style="width:2.75rem;height:2.75rem;font-size:1.15rem"><i class="bi ' + (m.mode === "Phone" ? "bi-telephone" : "bi-camera-video") + '"></i></span>' +
      '<div class="flex-grow-1 min-w-0"><p class="ap-task__title mb-0">' + esc(m.topic) + '</p>' +
      '<span class="ap-task__meta d-block">' + fmt(m.date) + ' · ' + esc(m.time) + ' · ' + m.duration + ' min · ' + esc(m.mode) + '</span>' +
      '<span class="ap-task__meta"><i class="bi bi-person"></i> ' + esc(c ? c.name : "Counselor") + '</span></div>' +
      '<div class="ap-task__actions text-end flex-shrink-0">' + statusBadge(m.status) +
      (isPast ? '' :
        '<div class="d-flex gap-1 mt-2 justify-content-end">' +
        '<button type="button" class="btn-ap btn-ap--outline btn-ap--sm" data-meeting-reschedule="' + esc(m.id) + '">Reschedule</button>' +
        '<button type="button" class="btn-ap btn-ap--outline btn-ap--sm" data-meeting-cancel="' + esc(m.id) + '">Cancel</button></div>') +
      '</div></div>';
  }

  async function init() {
    const root = document.querySelector("[data-meetings]");
    if (!root) return;
    const session = AP.requireAuth();
    if (!session) return;

    const upcomingEl = root.querySelector("[data-meetings-upcoming]");
    const pastEl = root.querySelector("[data-meetings-past]");
    const counselors = await AP.api.listCounselors({});
    const counselorSel = root.querySelector('[name="counselorId"]');
    if (counselorSel) counselorSel.innerHTML = counselors.map((c) => '<option value="' + c.id + '">' + esc(c.name) + ' — ' + esc(c.title) + '</option>').join("");

    async function refresh() {
      const meetings = await AP.api.listMeetings();
      const sorted = meetings.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      const upcoming = sorted.filter((m) => m.status !== "Completed" && m.status !== "Cancelled");
      const past = sorted.filter((m) => m.status === "Completed" || m.status === "Cancelled").reverse();
      upcomingEl.innerHTML = upcoming.length ? upcoming.map((m) => meetingRow(m, counselors)).join("") : '<div class="ap-empty py-4"><p class="mb-2">No upcoming meetings.</p><button class="btn-ap btn-ap--outline btn-ap--sm" data-open-modal="meetingModal">Book a session</button></div>';
      pastEl.innerHTML = past.length ? past.map((m) => meetingRow(m, counselors)).join("") : '<p class="ap-text-muted small py-2">No past meetings yet.</p>';
    }

    // date + availability
    const dateInput = root.querySelector('[name="date"]');
    const slotWrap = root.querySelector("[data-slots]");
    if (dateInput) {
      dateInput.min = todayISO();
      if (!dateInput.value) dateInput.value = todayISO();
      const loadSlots = async () => {
        const cid = counselorSel ? counselorSel.value : "cns_1";
        slotWrap.innerHTML = '<div class="text-center py-3 w-100"><span class="ap-spinner ap-text-accent"></span></div>';
        const slots = await AP.api.availability(cid, dateInput.value);
        slotWrap.innerHTML = slots.map((s) => '<button type="button" class="ap-chip' + (s.available ? "" : " disabled opacity-50") + '" ' + (s.available ? "" : "disabled") + ' data-slot="' + s.time + '"><i class="bi bi-clock"></i> ' + s.time + '</button>').join("");
      };
      loadSlots();
      if (counselorSel) counselorSel.addEventListener("change", loadSlots);
      dateInput.addEventListener("change", loadSlots);
      slotWrap.addEventListener("click", (e) => {
        const b = e.target.closest("[data-slot]"); if (!b) return;
        slotWrap.querySelectorAll("[data-slot]").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        root.querySelector('[name="time"]').value = b.getAttribute("data-slot");
        const timeError = root.querySelector("#timeError");
        if (timeError) { timeError.textContent = ""; timeError.classList.remove("is-visible"); }
      });
    }

    // booking form
    const form = root.querySelector("[data-meeting-form]");
    if (form) {
      AP.validation.attach(form);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!AP.validation.validateForm(form)) return;
        const d = AP.validation.getData(form);
        if (!d.time) {
          const timeError = form.querySelector("#timeError");
          if (timeError) { timeError.textContent = "Please select an available time slot."; timeError.classList.add("is-visible"); }
          AP.ui.toast("Please select an available time slot.", "warning");
          return;
        }
        const btn = form.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        try {
          await AP.api.bookMeeting({ counselorId: d.counselorId, date: d.date, time: d.time, duration: Number(d.duration) || 30, topic: d.topic, mode: d.mode || "Video call", notes: d.notes || "" });
          AP.validation.setLoading(btn, false);
          AP.ui.closeModal("meetingModal");
          form.reset();
          AP.ui.toast("Meeting booked successfully.", "success");
          refresh();
          if (dateInput) { dateInput.value = todayISO(); }
        } catch (err) { AP.validation.setLoading(btn, false); AP.validation.applyServerErrors(form, err.errors); AP.ui.toast(err.message, "error"); }
      });
    }

    // reschedule / cancel
    root.addEventListener("click", async (e) => {
      const r = e.target.closest("[data-meeting-reschedule]");
      const c = e.target.closest("[data-meeting-cancel]");
      if (r) {
        const id = r.getAttribute("data-meeting-reschedule");
        const newDate = prompt("Enter a new date (YYYY-MM-DD):", todayISO());
        if (!newDate) return;
        const newTime = prompt("Enter a new time (e.g. 15:30):", "15:30");
        if (!newTime) return;
        try { await AP.api.rescheduleMeeting(id, newDate, newTime); AP.ui.toast("Meeting rescheduled.", "success"); refresh(); }
        catch (err) { AP.ui.toast(err.message, "error"); }
      }
      if (c) {
        if (!confirm("Cancel this meeting?")) return;
        try { await AP.api.cancelMeeting(c.getAttribute("data-meeting-cancel")); AP.ui.toast("Meeting cancelled.", "info"); refresh(); }
        catch (err) { AP.ui.toast(err.message, "error"); }
      }
    });

    refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

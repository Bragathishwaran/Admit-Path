/* =====================================================================
   AdmitPath — checklist.js
   Application checklist: task list, status/priority, add/edit/delete,
   progress + deadline reminders. Persisted via the shared store.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

  function priorityBadge(p) {
    const cls = p === "High" ? "error" : p === "Medium" ? "warning" : "neutral";
    return '<span class="ap-badge ap-badge--' + cls + '">' + p + '</span>';
  }
  function statusBadge(s) {
    const cls = s === "Completed" ? "success" : s === "In Progress" ? "warning" : "neutral";
    return '<span class="ap-badge ap-badge--' + cls + '">' + s + '</span>';
  }

  function taskRow(t) {
    const dl = daysLeft(t.dueDate);
    const overdue = dl < 0 && t.status !== "Completed";
    const dueText = t.status === "Completed" ? fmtDate(t.dueDate) : (overdue ? "Overdue by " + Math.abs(dl) + "d" : dl === 0 ? "Due today" : "Due in " + dl + "d");
    return '' +
      '<div class="ap-task ' + (t.status === "Completed" ? "is-done" : "") + '" data-task="' + esc(t.id) + '">' +
      '<input type="checkbox" ' + (t.status === "Completed" ? "checked" : "") + ' data-task-toggle aria-label="Mark ' + esc(t.title) + ' complete">' +
      '<div class="flex-grow-1 min-w-0">' +
      '<p class="ap-task__title mb-0">' + esc(t.title) + '</p>' +
      '<div class="d-flex flex-wrap align-items-center gap-2 ap-task__meta mt-1"><span class="' + (overdue ? "ap-text-error fw-semibold" : "") + '"><i class="bi bi-calendar-event"></i> ' + dueText + '</span><span>·</span><span>' + esc(t.category || "General") + '</span></div>' +
      '</div>' +
      '<div class="ap-task__actions d-flex align-items-center gap-2 flex-shrink-0">' + priorityBadge(t.priority) + statusBadge(t.status) +
      '<button type="button" class="ap-icon-btn" data-task-delete aria-label="Delete task" style="width:34px;height:34px"><i class="bi bi-trash"></i></button>' +
      '</div></div>';
  }

  async function init() {
    const root = document.querySelector("[data-checklist]");
    if (!root) return;
    const session = AP.requireAuth(["STUDENT"]);
    if (!session) return;

    const listEl = root.querySelector("[data-checklist-list]");
    const select = root.querySelector("[data-checklist-app]");
    const progressBar = root.querySelector("[data-checklist-bar]");
    const progressText = root.querySelector("[data-checklist-progress]");
    const emptyEl = root.querySelector("[data-checklist-empty]");

    const apps = await AP.api.listApplications();
    if (select) {
      select.innerHTML = '<option value="all">All applications</option>' + apps.map((a) => '<option value="' + a.id + '">' + esc(a.university) + '</option>').join("");
    }

    async function refresh() {
      const appId = select ? select.value : "all";
      listEl.innerHTML = '<div class="text-center py-4"><span class="ap-spinner ap-text-accent"></span></div>';
      const items = await AP.api.listChecklist(appId);
      items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      if (!items.length) {
        listEl.innerHTML = "";
        if (emptyEl) emptyEl.hidden = false;
      } else {
        if (emptyEl) emptyEl.hidden = true;
        listEl.innerHTML = items.map(taskRow).join("");
      }
      const done = items.filter((i) => i.status === "Completed").length;
      const pct = items.length ? Math.round((done / items.length) * 100) : 0;
      if (progressBar) progressBar.style.width = pct + "%";
      if (progressText) progressText.textContent = pct + "%";
      const ratio = root.querySelector("[data-checklist-ratio]");
      if (ratio) ratio.textContent = done + "/" + items.length + " tasks";
    }

    if (select) select.addEventListener("change", refresh);

    // toggle completion
    listEl.addEventListener("change", async (e) => {
      if (!e.target.matches("[data-task-toggle]")) return;
      const row = e.target.closest("[data-task]");
      const id = row.getAttribute("data-task");
      try {
        await AP.api.updateChecklistItem(id, { status: e.target.checked ? "Completed" : "Pending" });
        AP.ui.toast(e.target.checked ? "Task marked complete." : "Task reopened.", "success", 2000);
        refresh();
      } catch (err) { AP.ui.toast(err.message, "error"); refresh(); }
    });

    // delete
    listEl.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-task-delete]"); if (!b) return;
      const id = b.closest("[data-task]").getAttribute("data-task");
      try { await AP.api.deleteChecklistItem(id); AP.ui.toast("Task deleted.", "info", 2000); refresh(); }
      catch (err) { AP.ui.toast(err.message, "error"); }
    });

    // add task modal
    const addForm = document.querySelector("[data-add-task-form]");
    if (addForm) {
      AP.validation.attach(addForm);
      const appSelect = addForm.querySelector('[name="applicationId"]');
      if (appSelect) appSelect.innerHTML = apps.map((a) => '<option value="' + a.id + '">' + esc(a.university) + '</option>').join("");
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!AP.validation.validateForm(addForm)) return;
        const btn = addForm.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        const d = AP.validation.getData(addForm);
        try {
          await AP.api.createChecklistItem({ applicationId: d.applicationId, title: d.title, priority: d.priority || "Medium", dueDate: d.dueDate, category: d.category || "General" });
          AP.validation.setLoading(btn, false);
          AP.ui.closeModal("addTaskModal");
          addForm.reset();
          AP.ui.toast("Task added to your checklist.", "success");
          refresh();
        } catch (err) { AP.validation.setLoading(btn, false); AP.validation.applyServerErrors(addForm, err.errors); AP.ui.toast(err.message, "error"); }
      });
    }

    refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

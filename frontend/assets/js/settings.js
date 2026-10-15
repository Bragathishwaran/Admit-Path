/* =====================================================================
   AdmitPath — settings.js
   Account settings: profile, password, notification preferences,
   appearance shortcuts and demo-data reset. Persisted via the store.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};

  const NOTIF_KEYS = ["emailNotifications", "deadlineReminders", "essayFeedback", "newsletter"];

  async function init() {
    const root = document.querySelector("[data-settings]");
    if (!root) return;
    const session = AP.requireAuth(["STUDENT"]);
    if (!session) return;

    /* ---- Profile ---- */
    const profileForm = root.querySelector("[data-profile-form]");
    if (profileForm) {
      AP.validation.attach(profileForm);
      try {
        const me = await AP.api.me();
        if (me) {
          ["name", "email", "mobile"].forEach((key) => {
            const input = profileForm.querySelector('[name="' + key + '"]');
            if (input) input.value = me[key] || "";
          });
        }
      } catch (err) {
        AP.ui.toast(err.message || "Could not load your profile.", "error");
      }
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        AP.validation.clearAlert(profileForm);
        if (!AP.validation.validateForm(profileForm)) return;
        const btn = profileForm.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        const d = AP.validation.getData(profileForm);
        try {
          const res = await AP.api.updateProfile({ name: d.name, email: d.email, mobile: d.mobile });
          AP.validation.setLoading(btn, false);
          AP.validation.showAlert(profileForm, "Profile updated.", "success");
          AP.ui.toast("Profile updated.", "success");
          document.querySelectorAll("[data-auth-name]").forEach((el) => { el.textContent = res.name; });
        } catch (err) {
          AP.validation.setLoading(btn, false);
          AP.validation.applyServerErrors(profileForm, err.errors);
          AP.validation.showAlert(profileForm, err.message || "Could not update your profile.", "error");
        }
      });
    }

    /* ---- Password ---- */
    const passwordForm = root.querySelector("[data-password-form]");
    if (passwordForm) {
      AP.validation.attach(passwordForm);
      passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        AP.validation.clearAlert(passwordForm);
        if (!AP.validation.validateForm(passwordForm)) return;
        const btn = passwordForm.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        const d = AP.validation.getData(passwordForm);
        try {
          await AP.api.changePassword(d.currentPassword, d.newPassword);
          AP.validation.setLoading(btn, false);
          passwordForm.reset();
          AP.validation.showAlert(passwordForm, "Password updated.", "success");
          AP.ui.toast("Password updated successfully.", "success");
        } catch (err) {
          AP.validation.setLoading(btn, false);
          AP.validation.applyServerErrors(passwordForm, err.errors);
          AP.validation.showAlert(passwordForm, err.message || "Could not update your password.", "error");
        }
      });
    }

    /* ---- Notification preferences ---- */
    const notifForm = root.querySelector("[data-notifications-form]");
    if (notifForm) {
      const settings = AP.api.getSettings();
      NOTIF_KEYS.forEach((key) => {
        const input = notifForm.querySelector('[name="' + key + '"]');
        if (input) input.checked = !!settings[key];
      });
      notifForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        AP.validation.clearAlert(notifForm);
        const btn = notifForm.querySelector('button[type="submit"]');
        AP.validation.setLoading(btn, true);
        const patch = {};
        NOTIF_KEYS.forEach((key) => {
          const input = notifForm.querySelector('[name="' + key + '"]');
          if (input) patch[key] = input.checked;
        });
        try {
          await AP.api.saveSettings(patch);
          AP.validation.setLoading(btn, false);
          AP.validation.showAlert(notifForm, "Preferences saved.", "success");
          AP.ui.toast("Notification preferences saved.", "success");
        } catch (err) {
          AP.validation.setLoading(btn, false);
          AP.ui.toast(err.message || "Could not save preferences.", "error");
        }
      });
    }

    /* ---- Reset demo data ---- */
    const resetBtn = root.querySelector("[data-reset-data]");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!window.confirm("Reset all demo data stored in this browser? This cannot be undone.")) return;
        AP.store.reset();
        AP.ui.toast("Demo data has been reset.", "success");
        setTimeout(() => window.location.reload(), 900);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

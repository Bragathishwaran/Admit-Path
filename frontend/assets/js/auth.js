/* =====================================================================
   AdmitPath — auth.js
   Login, registration and password-recovery page logic.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};

  function setBusy(btn, busy) { AP.validation.setLoading(btn, busy); }

  /* Inline success notification shown on the login page after a successful
     sign-in. No buttons and no redirect — the user stays on this page. */
  function showLoginSuccessNotice(res) {
    const host = document.querySelector(".ap-auth__card") || document.querySelector("[data-login-form]");
    if (!host) return;
    let el = document.getElementById("loginSuccessNotice");
    if (!el) {
      el = document.createElement("div");
      el.id = "loginSuccessNotice";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      host.insertBefore(el, host.firstChild);
    }
    el.className = "ap-form-alert ap-form-alert--success is-visible";
    el.innerHTML = '<i class="bi bi-check-circle"></i><span></span>';
    el.querySelector("span").textContent = "Logged in successfully.";
  }

  /* ---------------- Login ---------------- */
  function initLogin() {
    const form = document.querySelector("[data-login-form]");
    if (!form) return;
    AP.validation.attach(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      AP.validation.clearAlert(form);
      if (!AP.validation.validateForm(form)) return;
      const btn = form.querySelector('button[type="submit"]');
      const data = AP.validation.getData(form);
      setBusy(btn, true);
      try {
        const res = await AP.api.login(data.email, data.password);
        setBusy(btn, false);
        // Show an inline success notification on this page (no redirect).
        showLoginSuccessNotice(res);
      } catch (err) {
        setBusy(btn, false);
        AP.validation.showAlert(form, err.message || "Unable to sign in.", "error");
        AP.ui.toast(err.message || "Unable to sign in.", "error");
      }
    });
  }

  /* ---------------- Register ---------------- */
  function initRegister() {
    const form = document.querySelector("[data-register-form]");
    if (!form) return;
    AP.validation.attach(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      AP.validation.clearAlert(form);
      if (!AP.validation.validateForm(form)) return;
      const data = AP.validation.getData(form);
      if (data.password !== data.confirmPassword) {
        const c = form.querySelector('[name="confirmPassword"]');
        if (c) { AP.validation.validateElement(c); c.focus(); }
        AP.validation.showAlert(form, "Passwords do not match.", "error");
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      setBusy(btn, true);
      try {
        await AP.api.register({ name: data.fullName, email: data.email, mobile: data.mobile, password: data.password });
        setBusy(btn, false);
        AP.validation.showAlert(form, "Account created! Redirecting to sign in…", "success");
        AP.ui.toast("Your student account is ready.", "success");
        setTimeout(() => { window.location.href = "login.html"; }, 900);
      } catch (err) {
        setBusy(btn, false);
        AP.validation.applyServerErrors(form, err.errors);
        AP.validation.showAlert(form, err.message || "Registration failed.", "error");
      }
    });
  }

  /* ---------------- Forgot password ---------------- */
  function initForgot() {
    const form = document.querySelector("[data-forgot-form]");
    if (!form) return;
    AP.validation.attach(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      AP.validation.clearAlert(form);
      if (!AP.validation.validateForm(form)) return;
      const btn = form.querySelector('button[type="submit"]');
      const data = AP.validation.getData(form);
      setBusy(btn, true);
      try {
        const res = await AP.api.forgotPassword(data.email);
        setBusy(btn, false);
        AP.validation.showAlert(form, res.message, "success");
        AP.ui.toast("Check your inbox for reset instructions.", "success");
        form.reset();
      } catch (err) {
        setBusy(btn, false);
        AP.validation.showAlert(form, err.message || "Unable to process the request.", "error");
      }
    });
  }

  function init() {
    initLogin();
    initRegister();
    initForgot();
    // Fill demo credentials button
    document.querySelectorAll("[data-fill-demo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const role = btn.getAttribute("data-fill-demo");
        const acct = AP.config.demoAccounts.find((a) => a.role === role);
        const form = document.querySelector("[data-login-form]");
        if (!acct || !form) return;
        form.querySelector('[name="email"]').value = acct.email;
        form.querySelector('[name="password"]').value = acct.password;
        AP.ui.toast("Demo " + role.toLowerCase() + " credentials filled.", "info", 2500);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

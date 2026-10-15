/* =====================================================================
   AdmitPath — validation.js
   Shared client-side validation used by every form on the site.
   Mirrors the validation rules enforced by the local API mock.

   Declarative usage:
     <input class="ap-input" name="fullName" data-validate="name" required>
     <div class="ap-error-msg" id="fullNameError"></div>

   Supported data-validate values:
     name | mobile | email | password | confirm | text | select | checkbox |
     number | file
   Extra attributes: data-match="#selector", data-min, data-max,
     data-ext="pdf,docx", data-maxmb="5", data-msg="custom message"
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};

  /* Unicode-aware name pattern. Digits and punctuation remain rejected. */
  const NAME_RE = /^\p{L}+(?: \p{L}+)*$/u;
  const MOBILE_RE = /^[0-9]{10}$/;
  const EMAIL_RE = /^(?!.*\.\.)[A-Z0-9](?:[A-Z0-9.!#$%&'*+/=?^_`{|}~-]*[A-Z0-9])?@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

  const messages = {
    required: "This field is required.",
    name: "Enter a valid name — letters and spaces only (no digits or symbols).",
    mobile: "Enter a valid 10-digit mobile number (digits only).",
    email: "Enter a valid email address, e.g. name@example.com.",
    password: "Use at least 8 characters including a letter and a number.",
    confirm: "Passwords do not match.",
    number: "Enter a valid number.",
    range: "Value is out of the allowed range.",
    select: "Please choose an option.",
    checkbox: "Please tick this box to continue.",
    file: "Please choose a file.",
    fileType: "Unsupported file type.",
    fileSize: "File is too large.",
    text: "Please check this field.",
  };

  function isEmpty(v) { return v == null || String(v).trim() === ""; }

  function passwordOk(v) { return /[A-Za-z]/.test(v) && /[0-9]/.test(v) && v.length >= 8; }

  function getErrorEl(field, form) {
    const fieldContainer = field.closest ? field.closest(".ap-field") : null;
    let el = fieldContainer && fieldContainer.querySelector(".ap-error-msg");
    if (!el) el = field.parentElement && field.parentElement.querySelector(".ap-error-msg");
    if (!el) {
      let sibling = field.nextElementSibling;
      if (sibling && sibling.classList && sibling.classList.contains("ap-error-msg")) el = sibling;
    }
    if (!el && form) {
      el = document.createElement("div");
      el.className = "ap-error-msg";
      (fieldContainer || field.parentElement || form).appendChild(el);
    }
    if (el && !el.id) el.id = (field.id || field.name || "field") + "Error";
    return el;
  }

  function setState(field, valid, message) {
    const form = field.form;
    const errEl = getErrorEl(field, form);
    if (valid) {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
      if (field.getAttribute("aria-describedby") === (errEl && errEl.id)) field.removeAttribute("aria-describedby");
      if (errEl) { errEl.classList.remove("is-visible"); errEl.textContent = ""; }
    } else {
      field.classList.add("is-invalid");
      field.setAttribute("aria-invalid", "true");
      if (errEl) {
        errEl.innerHTML = '<i class="bi bi-exclamation-circle"></i><span></span>';
        errEl.querySelector("span").textContent = message || messages.required;
        errEl.classList.add("is-visible");
        errorIds[field.name || field.id] = errEl.id;
        if (field.id) field.setAttribute("aria-describedby", errEl.id);
      }
    }
    return valid;
  }

  const errorIds = {};

  /** Validate one field. Returns true when valid. */
  function validateElement(field) {
    const rule = field.getAttribute("data-validate") || field.tagName.toLowerCase();
    const raw = field.type === "checkbox" ? field.checked : field.value;
    const val = typeof raw === "string" ? raw.trim() : raw;
    const required = field.hasAttribute("required") || field.getAttribute("data-required") === "true";

    // required (checkbox handled separately)
    if (field.type === "checkbox") {
      if (required && !field.checked) return setState(field, false, field.getAttribute("data-msg") || messages.checkbox);
      return setState(field, true);
    }

    if (isEmpty(val)) {
      if (required) return setState(field, false, field.getAttribute("data-msg") || messages.required);
      return setState(field, true); // optional & empty is fine
    }

    switch (rule) {
      case "name":
        return setState(field, NAME_RE.test(val), field.getAttribute("data-msg") || messages.name);
      case "mobile":
      case "tel":
        return setState(field, MOBILE_RE.test(val), field.getAttribute("data-msg") || messages.mobile);
      case "email":
        return setState(field, val.length <= 254 && EMAIL_RE.test(val), field.getAttribute("data-msg") || messages.email);
      case "password":
        return setState(field, passwordOk(val), field.getAttribute("data-msg") || messages.password);
      case "confirm": {
        const sel = field.getAttribute("data-match");
        const other = sel ? document.querySelector(sel) : null;
        const match = other ? other.value === field.value : true;
        return setState(field, match, field.getAttribute("data-msg") || messages.confirm);
      }
      case "select":
        return setState(field, val !== "", field.getAttribute("data-msg") || messages.select);
      case "number": {
        const numberPattern = field.hasAttribute("data-allow-decimal") ? /^\d+(?:\.\d+)?$/ : /^\d+$/;
        if (!numberPattern.test(val)) return setState(field, false, field.getAttribute("data-msg") || messages.number);
        const n = Number(val);
        if (!isFinite(n)) return setState(field, false, field.getAttribute("data-msg") || messages.number);
        const min = field.getAttribute("data-min"), max = field.getAttribute("data-max");
        if (min != null && n < Number(min)) return setState(field, false, field.getAttribute("data-msg") || "Minimum is " + min + ".");
        if (max != null && n > Number(max)) return setState(field, false, field.getAttribute("data-msg") || "Maximum is " + max + ".");
        return setState(field, true);
      }
      case "file": {
        const f = field.files && field.files[0];
        if (!f) return setState(field, false, field.getAttribute("data-msg") || messages.file);
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        const allowed = (field.getAttribute("data-ext") || "pdf,doc,docx,txt,rtf").split(",").map((s) => s.trim().toLowerCase());
        if (!allowed.includes(ext)) return setState(field, false, messages.fileType + " Allowed: " + allowed.join(", ").toUpperCase() + ".");
        const maxMb = Number(field.getAttribute("data-maxmb") || 5);
        if (f.size > maxMb * 1024 * 1024) return setState(field, false, messages.fileSize + " Max " + maxMb + "MB.");
        return setState(field, true);
      }
      default:
        // generic text: reject obvious control characters
        return setState(field, !/[\u0000-\u0008\u000E-\u001F]/.test(val), field.getAttribute("data-msg") || messages.text);
    }
  }

  function fieldsOf(form) {
    return Array.prototype.slice.call(form.querySelectorAll("[data-validate], [required]"));
  }

  /** Validate all fields in a form. Focuses first invalid. */
  function validateForm(form) {
    let firstBad = null;
    fieldsOf(form).forEach((f) => {
      if (f.disabled || f.type === "hidden") return;
      const ok = validateElement(f);
      if (!ok && !firstBad) firstBad = f;
    });
    if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return !firstBad;
  }

  /** Wire blur + input listeners so errors clear when corrected. */
  function attach(form) {
    if (!form || form.__apBound) return form;
    form.__apBound = true;
    fieldsOf(form).forEach((f) => {
      const rule = f.getAttribute("data-validate");
      if (rule === "name") f.setAttribute("pattern", "[\\p{L}]+(?: [\\p{L}]+)*");
      if (rule === "email") f.setAttribute("maxlength", "254");
      if (rule === "mobile") {
        f.setAttribute("inputmode", "numeric");
        f.setAttribute("pattern", "[0-9]{10}");
        f.setAttribute("maxlength", "10");
      }
      if (rule === "number") f.setAttribute("inputmode", "numeric");
      f.addEventListener("blur", () => validateElement(f));
      f.addEventListener("input", () => {
        if (rule === "name") f.value = f.value.replace(/[^\p{L} ]/gu, "").replace(/ {2,}/g, " ");
        if (rule === "mobile" || (rule === "number" && !f.hasAttribute("data-allow-decimal"))) f.value = f.value.replace(/\D/g, "");
        if (rule === "number" && f.hasAttribute("data-allow-decimal")) {
          f.value = f.value.replace(/[^\d.]/g, "").replace(/\.(?=.*\.)/g, "");
        }
        if (f.classList.contains("is-invalid")) validateElement(f);
      });
      f.addEventListener("change", () => validateElement(f));
    });
    return form;
  }

  /** Collect form data as a plain object (trimmed). */
  function getData(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = typeof v === "string" ? v.trim() : v; });
    return out;
  }

  /** Show a form-level alert. */
  function showAlert(form, message, type) {
    let el = form.querySelector(".ap-form-alert[data-form-alert]");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("data-form-alert", "");
      el.className = "ap-form-alert";
      form.insertBefore(el, form.firstChild);
    }
    const icons = { error: "bi-exclamation-triangle", success: "bi-check-circle", info: "bi-info-circle" };
    el.className = "ap-form-alert is-visible ap-form-alert--" + (type || "error");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = '<i class="bi ' + (icons[type] || icons.error) + '"></i><span></span>';
    el.querySelector("span").textContent = message;
  }
  function clearAlert(form) {
    const el = form.querySelector(".ap-form-alert[data-form-alert]");
    if (el) { el.classList.remove("is-visible"); el.textContent = ""; }
  }
  function applyServerErrors(form, errors) {
    if (!form || !errors) return;
    Object.keys(errors).forEach((name) => {
      const aliases = { name: "fullName", fileName: "essayFile" };
      const field = form.elements.namedItem(name) || form.elements.namedItem(aliases[name] || "");
      if (field && field.nodeType === 1) setState(field, false, String(errors[name]));
    });
  }

  /** Loading state for a submit button. */
  function setLoading(btn, loading, labelWhenIdle) {
    if (!btn) return;
    if (loading) {
      btn.dataset.label = btn.dataset.label || btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.innerHTML = '<span class="ap-spinner" aria-hidden="true"></span> Please wait…';
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      btn.innerHTML = labelWhenIdle || btn.dataset.label || btn.innerHTML;
    }
  }

  AP.validation = {
    NAME_RE, MOBILE_RE, EMAIL_RE, messages,
    validateElement, validateForm, attach, getData, showAlert, clearAlert, applyServerErrors, setLoading, passwordOk,
    rules: {
      name: (v) => NAME_RE.test(String(v).trim()),
      mobile: (v) => MOBILE_RE.test(String(v).trim()),
      email: (v) => EMAIL_RE.test(String(v).trim()),
      password: passwordOk,
    },
  };
})();

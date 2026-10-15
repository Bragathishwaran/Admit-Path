/* =====================================================================
   AdmitPath — contact.js
   Contact form submission, inquiry category handling and map config.
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;
    AP.validation.attach(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      AP.validation.clearAlert(form);
      if (!AP.validation.validateForm(form)) {
        AP.validation.showAlert(form, "Please fix the highlighted fields and try again.", "error");
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      AP.validation.setLoading(btn, true);
      try {
        const data = AP.validation.getData(form);
        await AP.api.createContact({
          name: data.fullName,
          email: data.email,
          mobile: data.mobile,
          subject: data.subject,
          category: data.category,
          message: data.message,
          consent: form.querySelector('[name="consent"]').checked,
        });
        AP.validation.setLoading(btn, false);
        AP.validation.showAlert(form, "Thank you! Your message has been received. Our team will reply within one business day.", "success");
        AP.ui.toast("Message sent successfully.", "success");
        form.reset();
      } catch (err) {
        AP.validation.setLoading(btn, false);
        AP.validation.applyServerErrors(form, err.errors);
        AP.validation.showAlert(form, err.message || "We could not send your message. Please try again.", "error");
      }
    });
  }

  function initMap() {
    const frame = document.querySelector("[data-map-embed]");
    if (!frame) return;
    const cfg = AP.config;
    frame.src = cfg.googleMapsEmbedUrl;
    const note = document.querySelector("[data-map-note]");
    if (note && !cfg.officeAddressConfigured) {
      note.hidden = false;
      note.textContent = cfg.officeAddressPlaceholder;
    }
  }

  document.addEventListener("DOMContentLoaded", () => { initContactForm(); initMap(); });
})();

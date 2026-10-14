/**
 * Embeddable Lead-Capture Widget Client Bundle
 * Version: v1.0.0
 * Pure vanilla JavaScript - Zero dependencies - Scoped CSS styles
 */
(function () {
  "use strict";

  // Prevent multiple initializations on the same page
  if (window.__LeadCaptureWidgetInitialized) {
    return;
  }
  window.__LeadCaptureWidgetInitialized = true;

  // Locate the current script tag and extract parameters
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && (scripts[i].src.indexOf("widget.v1.js") !== -1 || scripts[i].src.indexOf("widget.js") !== -1)) {
          return scripts[i];
        }
      }
      return null;
    })();

  if (!currentScript) {
    console.error("[LeadCapture] Script element could not be identified.");
    return;
  }

  // Parse widget ID from data-widget-id attribute or script src query parameter
  let widgetId = currentScript.getAttribute("data-widget-id");
  let apiUrl = currentScript.getAttribute("data-api-url");

  if (!widgetId && currentScript.src) {
    try {
      const parsedUrl = new URL(currentScript.src, window.location.href);
      widgetId = parsedUrl.searchParams.get("id");
      if (!apiUrl) {
        apiUrl = parsedUrl.origin;
      }
    } catch (e) {
      // Fallback
    }
  }

  if (!apiUrl && currentScript.src) {
    try {
      apiUrl = new URL(currentScript.src, window.location.href).origin;
    } catch (e) {
      apiUrl = window.location.origin;
    }
  }

  if (!widgetId) {
    console.error("[LeadCapture] Missing required widget ID. Please provide data-widget-id attribute or ?id= parameter.");
    return;
  }

  // ─── Inject Scoped CSS Styles ───────────────────────────────────────────────
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .lc-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
      max-width: 480px;
      width: 100%;
      margin: 16px auto;
      padding: 24px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      color: #1f2937;
    }
    .lc-widget-container * {
      box-sizing: border-box;
    }
    .lc-widget-header {
      margin-bottom: 20px;
    }
    .lc-widget-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: inherit;
    }
    .lc-widget-desc {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }
    .lc-form-group {
      margin-bottom: 16px;
    }
    .lc-form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #374151;
    }
    .lc-form-label .lc-required {
      color: #ef4444;
      margin-left: 2px;
    }
    .lc-form-input, .lc-form-textarea, .lc-form-select {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      background-color: #ffffff;
      color: #111827;
    }
    .lc-form-input:focus, .lc-form-textarea:focus, .lc-form-select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .lc-form-textarea {
      min-height: 80px;
      resize: vertical;
    }
    .lc-submit-btn {
      width: 100%;
      padding: 12px 20px;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      background-color: #2563eb;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s ease, opacity 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .lc-submit-btn:hover {
      background-color: #1d4ed8;
    }
    .lc-submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .lc-alert {
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      margin-top: 16px;
      line-height: 1.4;
    }
    .lc-alert-success {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .lc-alert-error {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .lc-hp-field {
      display: none !important;
      position: absolute !important;
      left: -9999px !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
    }
    .lc-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: lc-spin 0.8s linear infinite;
    }
    @keyframes lc-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleElement);

  // ─── Fetch Widget Configuration ────────────────────────────────────────────
  const configUrl = `${apiUrl}/api/widgets/${widgetId}/config`;

  fetch(configUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status + " while loading widget config");
      }
      return res.json();
    })
    .then(function (response) {
      if (!response.success || !response.data) {
        throw new Error("Invalid configuration response");
      }
      renderWidget(response.data);
    })
    .catch(function (error) {
      console.error("[LeadCapture] Failed to initialize widget:", error);
    });

  // ─── Render Form DOM ────────────────────────────────────────────────────────
  function renderWidget(config) {
    // Look for target mount element or insert right after script
    let target = document.getElementById("lead-capture-widget");
    if (!target) {
      target = document.createElement("div");
      target.id = "lead-capture-widget";
      currentScript.parentNode.insertBefore(target, currentScript.nextSibling);
    }

    const container = document.createElement("div");
    container.className = "lc-widget-container";

    // Apply custom styling from display_settings
    if (config.display_settings) {
      if (config.display_settings.backgroundColor) {
        container.style.backgroundColor = config.display_settings.backgroundColor;
      }
      if (config.display_settings.textColor) {
        container.style.color = config.display_settings.textColor;
      }
      if (config.display_settings.borderRadius) {
        container.style.borderRadius = config.display_settings.borderRadius;
      }
    }

    // Header
    let headerHtml = '<div class="lc-widget-header">';
    if (config.title) {
      headerHtml += '<h3 class="lc-widget-title">' + escapeHtml(config.title) + "</h3>";
    }
    if (config.description) {
      headerHtml += '<p class="lc-widget-desc">' + escapeHtml(config.description) + "</p>";
    }
    headerHtml += "</div>";

    // Form
    let formHtml = '<form class="lc-form" novalidate>';

    // Honeypot fields (anti-spam probe 6)
    formHtml += '<div class="lc-hp-field">';
    formHtml += '<input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">';
    formHtml += '<input type="text" name="website_url_hp" tabindex="-1" autocomplete="off" aria-hidden="true">';
    formHtml += "</div>";

    // Dynamic Fields
    const fields = config.fields || [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const requiredMark = f.required ? '<span class="lc-required">*</span>' : "";
      formHtml += '<div class="lc-form-group">';
      formHtml += '<label class="lc-form-label" for="lc_' + f.name + '">' + escapeHtml(f.label) + requiredMark + "</label>";

      if (f.type === "textarea") {
        formHtml += '<textarea class="lc-form-textarea" id="lc_' + f.name + '" name="' + f.name + '"';
        if (f.placeholder) formHtml += ' placeholder="' + escapeHtml(f.placeholder) + '"';
        if (f.required) formHtml += " required";
        formHtml += "></textarea>";
      } else if (f.type === "select" && f.options) {
        formHtml += '<select class="lc-form-select" id="lc_' + f.name + '" name="' + f.name + '"';
        if (f.required) formHtml += " required";
        formHtml += '><option value="">Select an option...</option>';
        for (let j = 0; j < f.options.length; j++) {
          formHtml += '<option value="' + escapeHtml(f.options[j]) + '">' + escapeHtml(f.options[j]) + "</option>";
        }
        formHtml += "</select>";
      } else {
        formHtml += '<input class="lc-form-input" id="lc_' + f.name + '" type="' + f.type + '" name="' + f.name + '"';
        if (f.placeholder) formHtml += ' placeholder="' + escapeHtml(f.placeholder) + '"';
        if (f.required) formHtml += " required";
        formHtml += ">";
      }

      formHtml += "</div>";
    }

    // Submit Button
    const primaryColor = (config.display_settings && config.display_settings.primaryColor) || "#2563eb";
    const btnText = config.button_text || "Submit";
    formHtml += '<button type="submit" class="lc-submit-btn" style="background-color: ' + primaryColor + ';">';
    formHtml += '<span class="lc-btn-text">' + escapeHtml(btnText) + "</span>";
    formHtml += "</button>";

    // Status Message Box
    formHtml += '<div class="lc-status-container"></div>';

    formHtml += "</form>";

    container.innerHTML = headerHtml + formHtml;
    target.innerHTML = "";
    target.appendChild(container);

    // ─── Attach Submission Event Listener ────────────────────────────────────
    const form = container.querySelector(".lc-form");
    const submitBtn = container.querySelector(".lc-submit-btn");
    const btnTextSpan = container.querySelector(".lc-btn-text");
    const statusContainer = container.querySelector(".lc-status-container");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusContainer.innerHTML = "";

      const formData = new FormData(form);
      const dataPayload = {};
      let hasError = false;

      // Extract honeypots
      const hp = (formData.get("_hp") || "").toString();
      const hpWebsite = (formData.get("website_url_hp") || "").toString();

      // Client-side required check & payload extraction
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const val = (formData.get(field.name) || "").toString().trim();

        if (field.required && !val) {
          showError("Please fill out the required field: " + field.label);
          hasError = true;
          return;
        }

        if (field.type === "email" && val) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            showError("Please enter a valid email address.");
            hasError = true;
            return;
          }
        }

        dataPayload[field.name] = val;
      }

      if (hasError) return;

      // Set loading state
      submitBtn.disabled = true;
      btnTextSpan.textContent = "Submitting...";
      const spinner = document.createElement("span");
      spinner.className = "lc-spinner";
      submitBtn.appendChild(spinner);

      const submissionPayload = {
        widget_id: config.id,
        data: dataPayload,
        _hp: hp,
        website_url_hp: hpWebsite,
      };

      const submitEndpoint = config.submission_url || `${apiUrl}/api/submissions`;

      fetch(submitEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(submissionPayload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { status: res.status, ok: res.ok, data: data };
          });
        })
        .then(function (resObj) {
          if (resObj.ok && resObj.data && resObj.data.success) {
            form.reset();
            const successMsg = config.success_message || "Thank you! Your submission has been received.";
            statusContainer.innerHTML = '<div class="lc-alert lc-alert-success">' + escapeHtml(successMsg) + "</div>";
          } else {
            const errorMsg =
              (resObj.data && resObj.data.message) ||
              "Submission failed. Please check your information and try again.";
            showError(errorMsg);
          }
        })
        .catch(function (networkError) {
          showError("Network error: Unable to connect to the submission server.");
        })
        .finally(function () {
          submitBtn.disabled = false;
          btnTextSpan.textContent = btnText;
          const sp = submitBtn.querySelector(".lc-spinner");
          if (sp) sp.remove();
        });
    });

    function showError(msg) {
      statusContainer.innerHTML = '<div class="lc-alert lc-alert-error">' + escapeHtml(msg) + "</div>";
    }
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

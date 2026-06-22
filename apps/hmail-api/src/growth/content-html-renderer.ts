/** Render Growth content assets as simple HTML for panel public_html publish. */

export type GrowthHtmlRenderOptions = {
  tenantSlug?: string;
  sourcePage?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapPage(title: string, bodyHtml: string, options?: GrowthHtmlRenderOptions): string {
  const captureBlock =
    options?.tenantSlug && shouldIncludeCapture(options.sourcePage)
      ? renderCaptureFormBlock(options.tenantSlug, options.sourcePage)
      : "";
  const chatbotBlock =
    options?.tenantSlug && shouldIncludeCapture(options.sourcePage)
      ? renderChatbotWidgetBlock(options.tenantSlug, options.sourcePage)
      : "";
  const analyticsBlock = options?.tenantSlug
    ? renderAnalyticsScriptBlock(options.tenantSlug, options.sourcePage)
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1, h2 { line-height: 1.25; }
    .cta { display: inline-block; margin-top: 1.5rem; padding: 0.65rem 1.25rem; background: #0d9488; color: #fff; text-decoration: none; border-radius: 8px; }
    ul { padding-left: 1.25rem; }
    .muted { color: #555; font-size: 0.95rem; }
    .growth-capture { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #ddd; }
    .growth-capture label { display: block; margin: 0.75rem 0 0.25rem; font-weight: 600; }
    .growth-capture input, .growth-capture textarea { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
    .growth-capture button { margin-top: 1rem; padding: 0.65rem 1.25rem; background: #0d9488; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .growth-capture-status { margin-top: 0.75rem; font-size: 0.95rem; }
    .growth-chat-launcher { position: fixed; right: 1rem; bottom: 1rem; z-index: 9999; }
    .growth-chat-launcher button { width: 56px; height: 56px; border-radius: 999px; border: none; background: #0d9488; color: #fff; font-size: 1.4rem; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
    .growth-chat-panel { display: none; position: fixed; right: 1rem; bottom: 5rem; width: min(360px, calc(100vw - 2rem)); max-height: 420px; background: #fff; border: 1px solid #ddd; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.15); z-index: 9999; flex-direction: column; overflow: hidden; }
    .growth-chat-panel.open { display: flex; }
    .growth-chat-head { padding: 0.75rem 1rem; background: #0d9488; color: #fff; font-weight: 600; }
    .growth-chat-log { flex: 1; overflow: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; background: #f8fafc; }
    .growth-chat-msg { max-width: 88%; padding: 0.5rem 0.65rem; border-radius: 10px; font-size: 0.92rem; }
    .growth-chat-msg.bot { align-self: flex-start; background: #fff; border: 1px solid #e2e8f0; }
    .growth-chat-msg.user { align-self: flex-end; background: #ccfbf1; }
    .growth-chat-compose { display: flex; gap: 0.35rem; padding: 0.65rem; border-top: 1px solid #e2e8f0; background: #fff; }
    .growth-chat-compose input, .growth-chat-compose textarea { flex: 1; padding: 0.45rem 0.55rem; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; }
    .growth-chat-compose button { padding: 0.45rem 0.75rem; border: none; border-radius: 8px; background: #0d9488; color: #fff; cursor: pointer; }
    .growth-chat-choices { display: flex; flex-wrap: wrap; gap: 0.35rem; padding: 0 0.75rem 0.75rem; }
    .growth-chat-choices button { padding: 0.35rem 0.65rem; border: 1px solid #0d9488; background: #fff; color: #0d9488; border-radius: 999px; cursor: pointer; font-size: 0.85rem; }
  </style>
</head>
<body>
${bodyHtml}
${captureBlock}
${chatbotBlock}
${analyticsBlock}
</body>
</html>`;
}

function shouldIncludeCapture(sourcePage?: string): boolean {
  return sourcePage === "homepage" || sourcePage === "landing" || sourcePage === "blog";
}

export function renderAnalyticsScriptBlock(tenantSlug: string, sourcePage?: string): string {
  const slug = encodeURIComponent(tenantSlug);
  const eventsUrl = `/api/public/growth/${slug}/analytics/events`;
  const page = escapeHtml(sourcePage ?? "page");

  return `<script>
(function () {
  var STORAGE_KEY = "growth_utm";
  var eventsUrl = "${eventsUrl}";
  var sourcePage = "${page}";

  function readStoredUtm() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function storeUtmFromLocation() {
    var params = new URLSearchParams(window.location.search);
    var utm = {
      utmSource: params.get("utm_source") || params.get("utmSource") || undefined,
      utmMedium: params.get("utm_medium") || params.get("utmMedium") || undefined,
      utmCampaign: params.get("utm_campaign") || params.get("utmCampaign") || undefined
    };
    var hasUtm = utm.utmSource || utm.utmMedium || utm.utmCampaign;
    if (hasUtm) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm)); } catch (e) {}
      return utm;
    }
    return readStoredUtm();
  }

  function trackEvent(eventType, extra) {
    var utm = readStoredUtm();
    var payload = {
      eventType: eventType,
      sourcePage: sourcePage,
      path: window.location.pathname,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      referrer: document.referrer || undefined,
      metadata: extra || {}
    };
    fetch(eventsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  storeUtmFromLocation();
  trackEvent("page_view", {});

  window.__growthAnalytics = {
    getAttribution: function () {
      var utm = readStoredUtm();
      return {
        utm_source: utm.utmSource,
        utm_medium: utm.utmMedium,
        utm_campaign: utm.utmCampaign,
        referrer: document.referrer || undefined
      };
    },
    track: trackEvent
  };
})();
</script>`;
}

export function renderCaptureFormBlock(tenantSlug: string, sourcePage?: string): string {
  const submitUrl = `/api/public/growth/${encodeURIComponent(tenantSlug)}/leads`;
  const page = escapeHtml(sourcePage ?? "page");

  return `<section id="contact" class="growth-capture">
  <h2>Get in touch</h2>
  <p class="muted">Send us a message — we'll follow up from your Growth pipeline.</p>
  <form id="growth-capture-form">
    <label for="fullName">Full name</label>
    <input id="fullName" name="fullName" required />
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required />
    <label for="phone">Phone</label>
    <input id="phone" name="phone" type="tel" />
    <label for="company">Company</label>
    <input id="company" name="company" />
    <label for="message">Message</label>
    <textarea id="message" name="message" rows="4"></textarea>
    <button type="submit">Submit</button>
    <p id="growth-capture-status" class="growth-capture-status" role="status"></p>
  </form>
  <script>
    (function () {
      var form = document.getElementById("growth-capture-form");
      var status = document.getElementById("growth-capture-status");
      if (!form) return;
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        status.textContent = "Sending…";
        var payload = {
          fullName: form.fullName.value,
          email: form.email.value,
          phone: form.phone.value,
          company: form.company.value,
          message: form.message.value,
          sourcePage: "${page}"
        };
        fetch("${submitUrl}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: payload,
            source: "form",
            sourcePage: "${page}",
            attribution: window.__growthAnalytics ? window.__growthAnalytics.getAttribution() : {}
          })
        }).then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error(body.error || "Submit failed");
            status.textContent = "Thanks — we'll be in touch soon.";
            form.reset();
          });
        }).catch(function (err) {
          status.textContent = err.message || "Something went wrong.";
        });
      });
    })();
  </script>
</section>`;
}

export function renderChatbotWidgetBlock(tenantSlug: string, sourcePage?: string): string {
  const slug = encodeURIComponent(tenantSlug);
  const page = escapeHtml(sourcePage ?? "page");
  const startUrl = `/api/public/growth/${slug}/chat/sessions`;
  const replyUrlBase = `/api/public/growth/${slug}/chat/sessions/`;

  return `<div class="growth-chat-launcher" id="growth-chat-launcher">
  <button type="button" id="growth-chat-open" aria-label="Open chat">💬</button>
</div>
<div class="growth-chat-panel" id="growth-chat-panel" aria-live="polite">
  <div class="growth-chat-head" id="growth-chat-title">Chat with us</div>
  <div class="growth-chat-log" id="growth-chat-log"></div>
  <div class="growth-chat-choices" id="growth-chat-choices"></div>
  <div class="growth-chat-compose" id="growth-chat-compose">
    <input id="growth-chat-input" type="text" placeholder="Type your reply…" />
    <button type="button" id="growth-chat-send">Send</button>
  </div>
</div>
<script>
(function () {
  var panel = document.getElementById("growth-chat-panel");
  var log = document.getElementById("growth-chat-log");
  var input = document.getElementById("growth-chat-input");
  var sendBtn = document.getElementById("growth-chat-send");
  var choicesEl = document.getElementById("growth-chat-choices");
  var openBtn = document.getElementById("growth-chat-open");
  var titleEl = document.getElementById("growth-chat-title");
  if (!panel || !log || !input || !sendBtn || !openBtn) return;

  var sessionId = null;
  var expectsInput = false;
  var inputType = "text";
  var busy = false;

  function appendMessages(messages) {
    (messages || []).forEach(function (msg) {
      var div = document.createElement("div");
      div.className = "growth-chat-msg " + (msg.role === "user" ? "user" : "bot");
      div.textContent = msg.content;
      log.appendChild(div);
    });
    log.scrollTop = log.scrollHeight;
  }

  function setCompose(state) {
    expectsInput = !!(state && state.expectsInput);
    inputType = (state && state.inputType) || "text";
    choicesEl.innerHTML = "";
    if (!expectsInput) {
      input.disabled = true;
      sendBtn.disabled = true;
      return;
    }
    input.disabled = false;
    sendBtn.disabled = false;
    input.type = inputType === "email" ? "email" : inputType === "tel" ? "tel" : "text";
    input.placeholder = (state && state.placeholder) || "Type your reply…";
    if (inputType === "textarea") {
      input.style.display = "none";
    } else {
      input.style.display = "";
    }
    if (inputType === "choice" && state.choices && state.choices.length) {
      input.disabled = true;
      state.choices.forEach(function (choice) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = choice;
        btn.addEventListener("click", function () { void submitReply(choice); });
        choicesEl.appendChild(btn);
      });
    }
  }

  function applyResponse(body) {
    sessionId = body.sessionId || sessionId;
    appendMessages(body.messages || []);
    if (body.status === "completed") {
      setCompose({ expectsInput: false });
      return;
    }
    setCompose(body);
  }

  async function startSession() {
    if (busy) return;
    busy = true;
    try {
      var res = await fetch("${startUrl}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePage: "${page}",
          attribution: window.__growthAnalytics ? window.__growthAnalytics.getAttribution() : {}
        })
      });
      var body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not start chat");
      applyResponse(body);
    } catch (err) {
      var errDiv = document.createElement("div");
      errDiv.className = "growth-chat-msg bot";
      errDiv.textContent = err.message || "Chat unavailable";
      log.appendChild(errDiv);
    } finally {
      busy = false;
    }
  }

  async function submitReply(text) {
    if (!sessionId || !expectsInput || busy) return;
    var value = String(text || input.value || "").trim();
    if (!value) return;
    busy = true;
    input.value = "";
    choicesEl.innerHTML = "";
    try {
      var res = await fetch("${replyUrlBase}" + encodeURIComponent(sessionId) + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value })
      });
      var body = await res.json();
      if (!res.ok) throw new Error(body.error || "Send failed");
      applyResponse(body);
    } catch (err) {
      var errDiv = document.createElement("div");
      errDiv.className = "growth-chat-msg bot";
      errDiv.textContent = err.message || "Something went wrong";
      log.appendChild(errDiv);
    } finally {
      busy = false;
    }
  }

  openBtn.addEventListener("click", function () {
    panel.classList.add("open");
    if (!sessionId && log.childElementCount === 0) {
      fetch("/api/public/growth/${slug}/chatbot")
        .then(function (r) { return r.json(); })
        .then(function (meta) { if (meta.bot && meta.bot.title) titleEl.textContent = meta.bot.title; })
        .catch(function () {});
      void startSession();
    }
  });

  sendBtn.addEventListener("click", function () { void submitReply(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); void submitReply(); }
  });
})();
</script>`;
}

export function renderHomepageCopyHtml(
  title: string,
  body: Record<string, unknown>,
  options?: GrowthHtmlRenderOptions,
): string {
  const headline = String(
    body.suggestedHeroHeadline ?? body.heroHeadline ?? title,
  );
  const subhead = String(body.suggestedHeroSubheadline ?? body.heroSubheadline ?? "");
  const primaryCta = String(body.primaryCta ?? "Contact us");
  const sections = (body.sections ?? body.sectionsToAddOrRefresh) as
    | Array<{ heading?: string; body?: string; bullets?: string[] }>
    | undefined;

  const sectionHtml = (sections ?? [])
    .map((section) => {
      const bullets = section.bullets?.length
        ? `<ul>${section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
        : section.body
          ? `<p>${escapeHtml(section.body)}</p>`
          : "";
      return `<section><h2>${escapeHtml(section.heading ?? "")}</h2>${bullets}</section>`;
    })
    .join("\n");

  const note =
    body.contentMode === "improvement"
      ? `<p class="muted">Suggested homepage improvements from Prohost Growth — merge with your existing site design.</p>`
      : "";

  return wrapPage(
    headline,
    `${note}<header><h1>${escapeHtml(headline)}</h1>${subhead ? `<p>${escapeHtml(subhead)}</p>` : ""}<a class="cta" href="#contact">${escapeHtml(primaryCta)}</a></header>${sectionHtml}`,
    { ...options, sourcePage: "homepage" },
  );
}

export function renderBlogPostHtml(
  title: string,
  body: Record<string, unknown>,
  options?: GrowthHtmlRenderOptions,
): string {
  const intro = String(body.introduction ?? body.metaDescription ?? "");
  const sections = body.sections as Array<{ heading?: string; paragraphs?: string[] }> | undefined;
  const sectionHtml = (sections ?? [])
    .map((section) => {
      const paragraphs = (section.paragraphs ?? [])
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return `<section><h2>${escapeHtml(section.heading ?? "")}</h2>${paragraphs}</section>`;
    })
    .join("\n");

  return wrapPage(title, `<article><h1>${escapeHtml(title)}</h1><p>${escapeHtml(intro)}</p>${sectionHtml}</article>`, {
    ...options,
    sourcePage: "blog",
  });
}

export function renderLandingCopyHtml(
  title: string,
  body: Record<string, unknown>,
  options?: GrowthHtmlRenderOptions,
): string {
  const headline = String(body.headline ?? title);
  const subhead = String(body.subheadline ?? "");
  const bullets = body.bullets as string[] | undefined;
  const bulletHtml = bullets?.length
    ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";
  const cta = String(body.cta ?? "Get started");

  return wrapPage(
    headline,
    `<header><h1>${escapeHtml(headline)}</h1>${subhead ? `<p>${escapeHtml(subhead)}</p>` : ""}${bulletHtml}<a class="cta" href="#contact">${escapeHtml(cta)}</a></header>`,
    { ...options, sourcePage: "landing" },
  );
}

export function renderGrowthAssetHtml(
  assetType: string,
  title: string,
  body: Record<string, unknown>,
  options?: GrowthHtmlRenderOptions,
): string | null {
  if (assetType === "homepage_copy") return renderHomepageCopyHtml(title, body, options);
  if (assetType === "blog_post") return renderBlogPostHtml(title, body, options);
  if (assetType === "landing_copy") return renderLandingCopyHtml(title, body, options);
  return null;
}

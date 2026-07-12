const APP_NAME = "JOB RADER HILLARY.21";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequest(context) {
  const result = await handleAlerts(context.request, context.env || {});
  return responseFromNetlify(result);
}

async function handleAlerts(request, env) {
  if (request.method === "OPTIONS") {
    return json(204, {});
  }

  if (request.method === "GET") {
    return json(200, {
      ...getEmailStatus(env),
      storageConfigured: hasAlertStorage(env)
    });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(await request.text() || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const alert = normalizeAlert(payload);
  if (!alert.email || !alert.criteria.role) {
    return json(400, { error: "Alert email and role are required." });
  }

  const storageResult = await storeAlert(env, alert).catch((error) => ({
    stored: false,
    error: error.message || "Alert storage failed."
  }));
  const providerStatus = getEmailStatus(env);
  const delivery = providerStatus.emailConfigured
    ? await sendConfirmation(alert, env, providerStatus).catch((error) => ({
      ok: false,
      provider: providerStatus.provider,
      error: error.message || "Email provider rejected the request."
    }))
    : { ok: false, provider: "none", error: "Email provider is not configured." };

  return json(202, {
    ok: true,
    stored: storageResult.stored,
    storageError: storageResult.error || "",
    emailConfigured: providerStatus.emailConfigured,
    confirmationSent: delivery.ok,
    deliveryProvider: delivery.provider,
    messageId: delivery.messageId || "",
    missing: providerStatus.missing,
    message: createDeliveryMessage(providerStatus, delivery, storageResult.stored),
    providerStatus,
    storageConfigured: hasAlertStorage(env)
  });
}

function getEmailStatus(env) {
  const hasSender = Boolean(clean(env.ALERT_FROM_EMAIL));
  const hasCloudflareEmailBinding = Boolean(env.EMAIL && typeof env.EMAIL.send === "function");
  const hasResendApiKey = Boolean(clean(env.RESEND_API_KEY));
  const provider = hasSender && hasCloudflareEmailBinding
    ? "cloudflare-email"
    : hasSender && hasResendApiKey
      ? "resend"
      : "none";
  const missing = [];

  if (!hasSender) {
    missing.push("ALERT_FROM_EMAIL");
  }
  if (!hasCloudflareEmailBinding && !hasResendApiKey) {
    missing.push("EMAIL binding or RESEND_API_KEY");
  }

  return {
    emailConfigured: provider !== "none",
    provider,
    sender: hasSender ? clean(env.ALERT_FROM_EMAIL) : "",
    hasCloudflareEmailBinding,
    hasResendApiKey,
    missing
  };
}

function hasAlertStorage(env) {
  return Boolean(env.JOB_RADER_ALERTS && typeof env.JOB_RADER_ALERTS.put === "function");
}

async function storeAlert(env, alert) {
  if (!hasAlertStorage(env)) {
    return { stored: false, error: "JOB_RADER_ALERTS binding is not configured." };
  }

  const storedAlert = {
    ...alert,
    updatedAt: new Date().toISOString(),
    active: true,
    lastNotifiedJobIds: [],
    lastCheckedAt: ""
  };
  const indexKey = "alerts:index";
  const alertKey = `alert:${storedAlert.id}`;
  const currentIndex = await readJson(env.JOB_RADER_ALERTS, indexKey, []);
  const nextIndex = [
    storedAlert.id,
    ...currentIndex.filter((id) => id !== storedAlert.id)
  ].slice(0, 1000);

  await Promise.all([
    env.JOB_RADER_ALERTS.put(alertKey, JSON.stringify(storedAlert)),
    env.JOB_RADER_ALERTS.put(indexKey, JSON.stringify(nextIndex))
  ]);
  return { stored: true };
}

async function readJson(kv, key, fallback) {
  const raw = await kv.get(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function createDeliveryMessage(providerStatus, delivery, stored) {
  if (delivery.ok) {
    return `Alert accepted. Confirmation email sent through ${delivery.provider}.`;
  }
  if (providerStatus.emailConfigured) {
    return `Alert accepted, but email delivery failed: ${delivery.error || "provider rejected the request"}`;
  }
  if (stored) {
    return `Alert saved on the server. Configure ${providerStatus.missing.join(" and ")} in Cloudflare Pages to send real email alerts.`;
  }
  return `Alert accepted locally. Configure ${providerStatus.missing.join(" and ")} in Cloudflare Pages to send real email alerts.`;
}

function normalizeAlert(payload) {
  const criteria = payload.criteria || {};
  return {
    id: clean(payload.id || crypto.randomUUID()),
    email: EMAIL_PATTERN.test(clean(payload.email || "")) ? clean(payload.email).toLowerCase() : "",
    name: clean(payload.name || criteria.role || "Job alert").slice(0, 90),
    criteria: {
      role: clean(criteria.role || "").slice(0, 120),
      location: clean(criteria.location || "").slice(0, 120),
      radiusKm: clamp(Number(criteria.radiusKm || 0), 0, 500),
      minimum: clamp(Number(criteria.minimum || 0), 0, 100),
      days: clamp(Number(criteria.days || 30), 1, 90),
      remoteOnly: Boolean(criteria.remoteOnly),
      types: parseTypes(criteria.types || [])
    },
    createdAt: clean(payload.createdAt || new Date().toISOString())
  };
}

async function sendConfirmation(alert, env, providerStatus) {
  const message = buildAlertEmail(alert, env);
  if (providerStatus.provider === "cloudflare-email") {
    const result = await env.EMAIL.send({
      to: alert.email,
      from: { email: clean(env.ALERT_FROM_EMAIL), name: APP_NAME },
      replyTo: clean(env.ALERT_REPLY_TO_EMAIL || env.ALERT_FROM_EMAIL),
      subject: message.subject,
      html: message.html,
      text: message.text
    });
    return {
      ok: true,
      provider: "cloudflare-email",
      messageId: result?.messageId || ""
    };
  }

  if (providerStatus.provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: formatSender(env),
        to: [alert.email],
        reply_to: clean(env.ALERT_REPLY_TO_EMAIL || env.ALERT_FROM_EMAIL),
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        provider: "resend",
        error: payload.message || payload.error || `Resend returned HTTP ${response.status}`
      };
    }
    return {
      ok: true,
      provider: "resend",
      messageId: payload.id || ""
    };
  }

  return {
    ok: false,
    provider: "none",
    error: "Email provider is not configured."
  };
}

function buildAlertEmail(alert, env) {
  const location = alert.criteria.location || "Any location";
  const radius = alert.criteria.radiusKm ? `${alert.criteria.radiusKm} km` : "Any radius";
  const jobTypes = alert.criteria.types.join(", ") || "Any job type";
  const appUrl = clean(env.APP_URL || "https://job-rader-hillary-21.pages.dev");

  return {
    subject: `Job alert created: ${alert.name}`,
    text: [
      `${APP_NAME} alert created`,
      "",
      `Role: ${alert.criteria.role}`,
      `Location: ${location}`,
      `Radius: ${radius}`,
      `Posted within: ${alert.criteria.days} day(s)`,
      `Minimum CV success: ${alert.criteria.minimum}%`,
      `Remote only: ${alert.criteria.remoteOnly ? "Yes" : "No"}`,
      `Job types: ${jobTypes}`,
      "",
      `Open the app: ${appUrl}`
    ].join("\n"),
    html: `
      <h1>${APP_NAME} alert created</h1>
      <p>Your alert is ready for: <strong>${escapeHtml(alert.criteria.role)}</strong>.</p>
      <ul>
        <li>Location: ${escapeHtml(location)}</li>
        <li>Radius: ${escapeHtml(radius)}</li>
        <li>Posted within: ${alert.criteria.days} day(s)</li>
        <li>Minimum CV success: ${alert.criteria.minimum}%</li>
        <li>Remote only: ${alert.criteria.remoteOnly ? "Yes" : "No"}</li>
        <li>Job types: ${escapeHtml(jobTypes)}</li>
      </ul>
      <p><a href="${escapeHtml(appUrl)}">Open ${APP_NAME}</a></p>
    `
  };
}

function formatSender(env) {
  const from = clean(env.ALERT_FROM_EMAIL);
  return from.includes("<") ? from : `${APP_NAME} <${from}>`;
}

function parseTypes(values) {
  const allowed = new Set(["part-time", "student-job", "mini-job", "full-time"]);
  const list = Array.isArray(values) ? values : String(values || "").split(",");
  return [...new Set(list)].map(clean).filter((value) => allowed.has(value));
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}

function responseFromNetlify(result) {
  return new Response(result.body || "", {
    status: result.statusCode || 200,
    headers: result.headers || {}
  });
}

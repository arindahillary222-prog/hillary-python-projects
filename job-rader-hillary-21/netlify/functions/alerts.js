const { randomUUID } = require("crypto");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const alert = normalizeAlert(payload);
  if (!alert.email || !alert.criteria.role) {
    return json(400, { error: "Alert email and role are required." });
  }

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL);
  const confirmationSent = emailConfigured ? await sendConfirmation(alert).catch(() => false) : false;

  return json(202, {
    ok: true,
    stored: false,
    emailConfigured,
    confirmationSent,
    message: emailConfigured
      ? "Alert accepted. Confirmation email attempted."
      : "Alert accepted locally. Configure RESEND_API_KEY and ALERT_FROM_EMAIL in Netlify for email delivery."
  });
};

function normalizeAlert(payload) {
  const criteria = payload.criteria || {};
  return {
    id: clean(payload.id || randomUUID()),
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

async function sendConfirmation(alert) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.ALERT_FROM_EMAIL,
      to: alert.email,
      subject: `Job alert created: ${alert.name}`,
      html: `
        <h1>JOB RADER HILLARY.21 alert created</h1>
        <p>Your alert is ready for: <strong>${escapeHtml(alert.criteria.role)}</strong>.</p>
        <p>Location: ${escapeHtml(alert.criteria.location || "Any location")} | Radius: ${alert.criteria.radiusKm || "Any"} km</p>
        <p>Job types: ${escapeHtml(alert.criteria.types.join(", ") || "Any")}</p>
      `
    })
  });
  return response.ok;
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
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}

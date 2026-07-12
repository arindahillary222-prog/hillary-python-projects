const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPLE_PROVIDER = "apple";
const EMAIL_PROVIDER = "email";

export async function onRequest(context) {
  const result = await handleAuth(context.request);
  return new Response(result.body || "", {
    status: result.statusCode || 200,
    headers: result.headers || {}
  });
}

async function handleAuth(request) {
  if (request.method === "OPTIONS") {
    return json(204, {});
  }

  const route = new URL(request.url).pathname.toLowerCase();
  if (request.method === "GET") {
    return json(200, authConfiguration(route));
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

  const provider = clean(payload.provider || APPLE_PROVIDER).toLowerCase();
  if (provider === APPLE_PROVIDER) {
    return loginWithApple(payload);
  }
  if (provider === EMAIL_PROVIDER) {
    return loginWithEmail(payload);
  }
  if (provider === "google") {
    return socialProviderDisabled("google");
  }
  if (provider === "facebook") {
    return socialProviderDisabled("facebook");
  }

  return json(400, { error: "Unsupported authentication provider." });
}

function authConfiguration(route) {
  return {
    app: "JOB RADER HILLARY.21",
    route,
    appleSignInRequired: true,
    tracking: false,
    providers: [
      { id: APPLE_PROVIDER, label: "Sign in with Apple", route: "/auth/apple", requiredForIOS: true },
      { id: EMAIL_PROVIDER, label: "Email code", route: "/auth/email", fallback: true }
    ],
    disabledSocialProviders: ["google", "facebook"]
  };
}

function loginWithApple(payload) {
  const identityToken = clean(payload.identityToken || payload.idToken || "");
  if (!identityToken) {
    return json(400, { error: "Apple identity token is required." });
  }
  return json(202, {
    ok: true,
    provider: APPLE_PROVIDER,
    message: "Apple token accepted for backend verification. Configure Apple client credentials before production session minting."
  });
}

function loginWithEmail(payload) {
  const email = clean(payload.email || "").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return json(400, { error: "A valid email address is required." });
  }
  return json(202, {
    ok: true,
    provider: EMAIL_PROVIDER,
    message: "Email authentication request accepted. Connect an email service before production delivery."
  });
}

function socialProviderDisabled(provider) {
  return json(409, {
    error: `${provider} sign-in is disabled for App Store compliance. Use Sign in with Apple or email fallback.`
  });
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}

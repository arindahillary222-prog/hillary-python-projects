const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPLE_PROVIDER = "apple";
const EMAIL_PROVIDER = "email";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const route = (event.path || "").toLowerCase();
  if (event.httpMethod === "GET") {
    return json(200, authConfiguration(route));
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

  const provider = clean(payload.provider || APPLE_PROVIDER).toLowerCase();
  if (provider === APPLE_PROVIDER) {
    return loginWithApple(payload);
  }
  if (provider === EMAIL_PROVIDER) {
    return loginWithEmail(payload);
  }
  if (provider === "google") {
    return loginWithGoogle(payload);
  }
  if (provider === "facebook") {
    return loginWithFacebook(payload);
  }

  return json(400, { error: "Unsupported authentication provider." });
};

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

async function loginWithApple(payload) {
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

async function loginWithEmail(payload) {
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

async function loginWithGoogle() {
  return socialProviderDisabled("google");
}

async function loginWithFacebook() {
  return socialProviderDisabled("facebook");
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

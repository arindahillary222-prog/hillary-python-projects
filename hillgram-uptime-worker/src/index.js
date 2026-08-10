const HILLGRAM_RUNTIME =
  "https://hillgram-hillary.streamlit.app/~/+/_stcore/health?embed=true&embed_options=hide_loading_screen";
const HILLGRAM_SITE = "https://hillgram-hillary.pages.dev";

const responseHeaders = {
  "Access-Control-Allow-Origin": HILLGRAM_SITE,
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

async function warmHillgram() {
  const target = new URL(HILLGRAM_RUNTIME);

  const response = await fetch(target, {
    headers: {
      Accept: "text/plain,*/*",
      "Cache-Control": "no-cache",
      "User-Agent": "HILLGRAM-Uptime/1.0 (+https://hillgram-hillary.pages.dev/)",
    },
    cf: {
      cacheEverything: false,
      cacheTtl: 0,
    },
  });

  const runtimeStatus = (await response.text()).trim().toLowerCase();
  const result = {
    ok: response.ok && runtimeStatus === "ok",
    status: response.status,
    checkedAt: new Date().toISOString(),
  };
  return result;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/health") {
      return new Response(
        JSON.stringify({ service: "HILLGRAM uptime", status: "ready" }),
        { headers: responseHeaders },
      );
    }

    try {
      const result = await warmHillgram();
      return new Response(
        JSON.stringify({ service: "HILLGRAM uptime", ...result }),
        { status: result.ok ? 200 : 502, headers: responseHeaders },
      );
    } catch {
      return new Response(
        JSON.stringify({
          service: "HILLGRAM uptime",
          ok: false,
          status: 0,
          checkedAt: new Date().toISOString(),
        }),
        { status: 502, headers: responseHeaders },
      );
    }
  },

  async scheduled(_controller, _env, context) {
    context.waitUntil(warmHillgram());
  },
};

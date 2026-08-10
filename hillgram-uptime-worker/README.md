# HILLGRAM uptime worker

This Cloudflare Worker calls HILLGRAM's live Streamlit runtime health endpoint every 10 minutes. The scheduled request keeps normal inactivity from reaching Streamlit Community Cloud's sleep window.

The public `/health` endpoint is also used by the HILLGRAM PWA startup screen. It returns `ok: true` only when the runtime itself responds with Streamlit's plain-text `ok` health signal.

Deploy from this directory with:

```powershell
pnpm dlx wrangler deploy
```

Worker: `https://hillgram-uptime.arindahillary222.workers.dev`

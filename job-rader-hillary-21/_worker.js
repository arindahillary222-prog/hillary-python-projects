import { onRequest as alertsHandler } from "./functions/api/alerts.js";
import { onRequestGet as jobsHandler } from "./functions/api/jobs.js";
import { onRequestGet as locationHandler } from "./functions/api/location.js";
import { onRequest as authHandler } from "./functions/auth/[[path]].js";

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const functionContext = { request, env, context };

    if (url.pathname === "/api/jobs") {
      return jobsHandler(functionContext);
    }
    if (url.pathname === "/api/location") {
      return locationHandler(functionContext);
    }
    if (url.pathname === "/api/alerts") {
      return alertsHandler(functionContext);
    }
    if (url.pathname === "/.netlify/functions/jobs") {
      return jobsHandler(functionContext);
    }
    if (url.pathname === "/.netlify/functions/location") {
      return locationHandler(functionContext);
    }
    if (url.pathname === "/.netlify/functions/alerts") {
      return alertsHandler(functionContext);
    }
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) {
      return authHandler(functionContext);
    }

    return env.ASSETS.fetch(request);
  }
};

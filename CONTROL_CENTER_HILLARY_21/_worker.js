import { onRequest as authHandler } from "./functions/auth/[[path]].js";

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) {
      return authHandler({ request, env, context });
    }

    return env.ASSETS.fetch(request);
  }
};

import { resolveOrigin, reverseGeocode } from "./geocoder.mjs";

function json(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function handleLocationRequest(request, dependencies = {}) {
  const params = new URL(request.url).searchParams;
  const query = String(params.get("query") || params.get("location") || "").trim().replace(/\s+/g, " ").slice(0, 180);
  const latitude = params.get("lat");
  const longitude = params.get("lon");
  if (!query && latitude !== null && longitude !== null) {
    try {
      const result = await (dependencies.reverseGeocode || reverseGeocode)(latitude, longitude, {
        fetch: dependencies.fetch || fetch,
        minDelayMs: dependencies.photonMinDelayMs ?? 1000,
        now: dependencies.now || Date.now
      });
      if (!result) return json(422, { ok: false, error: "No reverse-geocoded location was found." });
      return json(200, { ok: true, location: result, provider: "Photon" });
    } catch {
      return json(503, { ok: false, error: "Address lookup is temporarily unavailable." });
    }
  }
  if (!query) return json(400, { ok: false, error: "Enter a location to resolve." });
  try {
    const resolved = await (dependencies.resolveOrigin || resolveOrigin)(query, {
      fetch: dependencies.fetch || fetch,
      minDelayMs: dependencies.photonMinDelayMs ?? 1000,
      now: dependencies.now || Date.now
    });
    if (!resolved.ok) return json(422, { ...resolved, ok: false });
    return json(200, {
      ok: true,
      location: {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        precision: resolved.precision,
        label: resolved.label,
        fallback: Boolean(resolved.fallback),
        notice: resolved.notice || ""
      },
      provider: "Photon"
    });
  } catch {
    return json(503, {
      ok: false,
      reason: "geocoder-unavailable",
      notice: "Location verification is temporarily unavailable. Correct the location or choose Any distance before searching."
    });
  }
}

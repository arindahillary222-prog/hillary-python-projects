const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

export async function onRequestGet(context) {
  const result = await handleLocation(context.request);
  return responseFromNetlify(result);
}

async function handleLocation(request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const lat = Number(params.lat);
  const lon = Number(params.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json(400, { error: "Latitude and longitude are required." });
  }

  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "JOB-RADER-HILLARY-21/1.0"
      }
    });
    if (!response.ok) {
      return json(502, { error: "Address lookup is temporarily unavailable." });
    }

    const payload = await response.json();
    const address = payload.address || {};
    const postalCode = clean(address.postcode);
    const city = clean(address.city || address.town || address.village || address.municipality || address.county);
    const state = clean(address.state);
    const location = postalCode && city
      ? `${postalCode} ${city}`
      : city || state || clean(payload.display_name || "");

    return json(200, {
      location,
      postalCode,
      city,
      state,
      displayName: clean(payload.display_name || ""),
      coordinates: { lat, lon }
    });
  } catch (error) {
    return json(502, {
      error: "Address lookup is temporarily unavailable.",
      detail: error.message
    });
  }
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}

function responseFromNetlify(result) {
  return new Response(result.body || "", {
    status: result.statusCode || 200,
    headers: result.headers || {}
  });
}

import "../../job-logic.js";

const Logic = globalThis.JobRaderJobLogic;
const PHOTON_URL = "https://photon.komoot.io/api/";
const PLACE_CACHE = new Map();
const PLACE_PENDING = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function queuePhoton(run, minDelayMs, now) {
  const scheduled = async () => {
    const waitMs = Math.max(0, minDelayMs - (now() - lastRequestAt));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = now();
    return run();
  };
  const current = requestQueue.then(scheduled, scheduled);
  requestQueue = current.catch(() => {});
  return current;
}

function normal(value) {
  return String(value || "")
    .toLocaleLowerCase("de-DE")
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/str\.?$/g, "strasse")
    .replace(/\bstr\.?\b/g, "strasse")
    .replace(/\bstrasse\b/g, "strasse")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function featuresForAddress(address, features) {
  const properties = (feature) => feature?.properties || {};
  const countryMatches = (feature) => !properties(feature).country || /^(germany|deutschland)$/i.test(properties(feature).country);
  if (address?.hasStreetAddress) {
    return features.find((feature) => {
      const place = properties(feature);
      return countryMatches(feature)
        && String(place.housenumber || "").toLowerCase() === String(address.houseNumber || "").toLowerCase()
        && (!address.postcode || String(place.postcode || "") === address.postcode)
        && normal(place.street) === normal(address.street);
    }) || null;
  }
  if (address?.postcode) {
    return features.find((feature) => countryMatches(feature) && String(properties(feature).postcode || "") === address.postcode) || null;
  }
  if (address?.city) {
    const city = normal(address.city);
    return features.find((feature) => {
      const place = properties(feature);
      return countryMatches(feature) && [place.city, place.name, place.district, place.locality].some((item) => normal(item) === city);
    }) || null;
  }
  return features.find(countryMatches) || null;
}

function safeCoordinate(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}

async function fetchFeatures(query, options = {}) {
  const fetcher = options.fetcher || options.fetch || fetch;
  const minDelayMs = options.minDelayMs ?? 1000;
  const now = options.now || Date.now;
  const cache = options.cache ?? true;
  const normalized = String(query || "").trim().replace(/\s+/g, " ");
  if (!normalized) return [];
  const cacheable = cache && !Logic.parseAddress(normalized).hasStreetAddress;
  const cacheKey = normal(normalized);
  const cached = cacheable ? PLACE_CACHE.get(cacheKey) : null;
  if (cached && cached.expiresAt > now()) return cached.features;
  if (cacheable && PLACE_PENDING.has(cacheKey)) return PLACE_PENDING.get(cacheKey);

  const run = async () => {
    const url = new URL(PHOTON_URL);
    url.searchParams.set("q", normalized);
    url.searchParams.set("limit", "5");
    url.searchParams.set("lang", "de");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", "User-Agent": "JOB-RADER-HILLARY-21/2.1 (user-initiated job search)" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Photon returned ${response.status}`);
      const payload = await response.json();
      const features = Array.isArray(payload?.features) ? payload.features : [];
      if (cacheable) PLACE_CACHE.set(cacheKey, { features, expiresAt: now() + 6 * 60 * 60 * 1000 });
      return features;
    } finally {
      clearTimeout(timeout);
    }
  };
  const current = queuePhoton(run, minDelayMs, now);
  if (!cacheable) return current;
  PLACE_PENDING.set(cacheKey, current);
  try {
    return await current;
  } finally {
    if (PLACE_PENDING.get(cacheKey) === current) PLACE_PENDING.delete(cacheKey);
  }
}

export async function reverseGeocode(latitude, longitude, options = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const fetcher = options.fetcher || options.fetch || fetch;
  const minDelayMs = options.minDelayMs ?? 1000;
  const now = options.now || Date.now;
  return queuePhoton(async () => {
    const url = new URL("https://photon.komoot.io/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("limit", "1");
    url.searchParams.set("lang", "de");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", "User-Agent": "JOB-RADER-HILLARY-21/2.1 (user-initiated job search)" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Photon returned ${response.status}`);
      const payload = await response.json();
      const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
      const coords = safeCoordinate(feature);
      if (!feature || !coords) return null;
      const properties = feature.properties || {};
      const city = properties.city || properties.town || properties.village || properties.municipality || properties.district || properties.locality || "";
      const postalCode = String(properties.postcode || "");
      const street = properties.street || (properties.housenumber ? properties.name : "");
      const addressLine = [street, properties.housenumber].filter(Boolean).join(" ");
      const location = [addressLine, postalCode, city, properties.country].filter(Boolean).join(", ") || properties.label || "";
      return {
        location: String(location),
        postalCode,
        city: String(city),
        state: String(properties.state || ""),
        displayName: String(properties.label || properties.name || location),
        precision: addressLine ? "address" : postalCode ? "postcode" : city ? "city" : "place",
        coordinates: { lat, lon }
      };
    } finally {
      clearTimeout(timeout);
    }
  }, minDelayMs, now);
}

export async function geocodePlace(query, options = {}) {
  const address = Logic.parseAddress(query);
  const searchQuery = address.precision === "unknown" ? `${String(query || "").trim()}, Germany` : address.query;
  const features = await fetchFeatures(searchQuery, options);
  const matchedFeature = featuresForAddress(address, features);
  const feature = matchedFeature || (address.hasStreetAddress || address.postcode || address.city ? null : features[0]) || null;
  const coords = safeCoordinate(feature);
  if (!feature || !coords) return null;
  const properties = feature.properties || {};
  const type = String(properties.osm_value || properties.type || "").toLowerCase();
  const precision = address.hasStreetAddress && properties.housenumber ? "address" : address.postcode && properties.postcode === address.postcode ? "postcode" : type === "city" || type === "district" ? "city" : "place";
  return {
    ...coords,
    precision,
    label: String(properties.name || properties.label || [properties.street, properties.housenumber, properties.postcode, properties.city, properties.country].filter(Boolean).join(", ")),
    properties
  };
}

export async function resolveOrigin(query, options = {}) {
  const address = Logic.parseAddress(query);
  if (address.precision === "unknown") return { ok: false, reason: "unrecognized" };
  let features = [];
  let exactError = null;
  try {
    features = await fetchFeatures(address.query, { ...options, cache: false });
  } catch (error) {
    exactError = error;
  }
  const exactFeature = featuresForAddress(address, features);
  const exactCoords = safeCoordinate(exactFeature);
  if (address.hasStreetAddress && exactFeature && exactCoords) {
    const properties = exactFeature.properties || {};
    return {
      ok: true,
      ...exactCoords,
      precision: "address",
      label: String(properties.name || properties.label || address.query),
      fallback: false
    };
  }

  if (address.hasStreetAddress && address.postcode && address.city) {
    const fallbackQuery = `${address.postcode} ${address.city}, Germany`;
    try {
      const fallbackFeatures = await fetchFeatures(fallbackQuery, { ...options, cache: true });
      const fallbackFeature = featuresForAddress({ ...address, hasStreetAddress: false }, fallbackFeatures);
      const fallbackCoords = safeCoordinate(fallbackFeature);
      if (fallbackFeature && fallbackCoords) {
        const properties = fallbackFeature.properties || {};
        return {
          ok: true,
          ...fallbackCoords,
          precision: "postcode",
          label: String(properties.label || properties.name || fallbackQuery),
          fallback: true,
          notice: "Exact house-number location could not be verified; using the postcode area. Edit the location field to correct it."
        };
      }
    } catch (error) {
      exactError = exactError || error;
    }
  }

  if (!address.hasStreetAddress && !exactError) {
    const feature = featuresForAddress(address, features);
    const coords = safeCoordinate(feature);
    if (feature && coords) {
      const properties = feature.properties || {};
      return {
        ok: true,
        ...coords,
        precision: address.precision,
        label: String(properties.label || properties.name || address.query),
        fallback: false
      };
    }
  }
  return {
    ok: false,
    reason: exactError ? "geocoder-unavailable" : "no-match",
    notice: "Location could not be verified. Correct the location or choose Any distance before searching."
  };
}

export const geocoderInternals = Object.freeze({ featuresForAddress, safeCoordinate, normal });

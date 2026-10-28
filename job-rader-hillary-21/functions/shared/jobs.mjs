import "../../job-logic.js";
import { geocodePlace } from "./geocoder.mjs";

const Logic = globalThis.JobRaderJobLogic;
const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";
const REMOTE_OK_URL = "https://remoteok.com/api";
const ARBEITSAGENTUR_BASE_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const ARBEITSAGENTUR_API_KEY = "jobboerse-jobsuche";
const SOURCE_TIMEOUT_MS = 18000;
const MAX_JOB_PLACE_GEOCODES = 8;
const REMOTE_OK_CACHE_TTL_MS = 60000;
const ARBEITNOW_CACHE_TTL_MS = 60000;
let arbeitnowCache = null;
let arbeitnowPending = null;
let remoteOkCache = null;
let remoteOkPending = null;
const QUERY_STOP_WORDS = new Set([
  "job", "jobs", "role", "position", "work", "with", "from", "the", "and", "for", "und", "der", "die", "das",
  "in", "im", "am", "an", "of", "to", "a", "ein", "eine", "und"
]);

function clean(value) {
  return String(value || "").replace(/[\u00ad\u200b\ufeff]/g, "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function json(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function parseTypes(value) {
  const allowed = new Set(["part-time", "student-job", "mini-job", "full-time"]);
  return unique(String(value || "").split(",").map(clean)).filter((type) => allowed.has(type));
}

function dateValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" || /^\d{9,13}$/.test(String(value).trim());
  const timestamp = numeric ? Number(value) * (Number(value) < 100000000000 ? 1000 : 1) : new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function fetchJson(fetcher, url, { headers = {}, timeoutMs = SOURCE_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "JOB-RADER-HILLARY-21/2.1", ...headers },
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        output[index] = await mapper(items[index], index);
      } catch {
        output[index] = null;
      }
    }
  });
  await Promise.all(workers);
  return output;
}

function htmlToText(value) {
  return clean(String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h2|h3|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">"));
}

function summarize(text) {
  return clean(text).split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 360);
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value || "")) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function extractContacts(text) {
  const emails = unique((String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.toLowerCase()));
  return { emails, websites: [] };
}

function classifyJobTypes(job) {
  const text = `${job.title} ${job.summary} ${job.description} ${(job.tags || []).join(" ")}`;
  const types = new Set();
  if (/(part[\s-]?time|teilzeit|temps partiel|meio periodo|muda mfupi)/i.test(text)) types.add("part-time");
  if (/(werkstudent|working student|student job|studentenjob|studentische|student assistant|internship|praktikum|trainee)/i.test(text)) types.add("student-job");
  if (/(mini[\s-]?job|538[\s-]?eur|520[\s-]?eur|geringfugig|geringfügig)/i.test(text)) types.add("mini-job");
  if (/(full[\s-]?time|vollzeit|permanent|unbefristet|temps plein|tempo integral)/i.test(text)) types.add("full-time");
  return [...types];
}

function detectLanguageRequirement(job) {
  const text = `${job.title} ${job.summary} ${job.description} ${(job.tags || []).join(" ")}`;
  const german = /(deutsch|german|gute deutsch|fließend deutsch|deutschkenntnisse|c1 deutsch|b2 deutsch|deutsche sprache)/i.test(text);
  const english = /(english|englisch|fluent english|good english|business english|englischkenntnisse|c1 english|b2 english)/i.test(text);
  return german && english ? "both" : german ? "german" : english ? "english" : "unspecified";
}

function withMetadata(job) {
  const jobTypes = classifyJobTypes(job);
  return { ...job, jobTypes, languageRequirement: detectLanguageRequirement(job) };
}

function tokens(query) {
  return unique(String(query || "").toLocaleLowerCase("de-DE").split(/[^a-z0-9äöüß]+/i).map(clean))
    .filter((token) => token.length > 2 && !QUERY_STOP_WORDS.has(token));
}

function matchesQuery(job, query) {
  const wanted = tokens(query);
  if (!wanted.length) return false;
  const text = `${job.title} ${job.company} ${job.location} ${job.summary} ${job.description} ${(job.tags || []).join(" ")}`.toLocaleLowerCase("de-DE");
  return wanted.every((token) => text.includes(token));
}

function matchesTypes(job, selected) {
  return !selected.length || selected.some((type) => (job.jobTypes || []).includes(type));
}

function arbeitsagenturHeaders() {
  return { "X-API-Key": ARBEITSAGENTUR_API_KEY };
}

function arbeitsagenturWorkTime(selectedTypes, remoteOnly) {
  const values = new Set();
  if (selectedTypes.includes("full-time")) values.add("vz");
  if (selectedTypes.includes("part-time")) values.add("tz");
  if (selectedTypes.includes("mini-job")) values.add("mj");
  if (remoteOnly) values.add("ho");
  return [...values].join(";");
}

function coarseLocation(location) {
  const address = Logic.parseAddress(location);
  if (address.postcode && address.city) return `${address.postcode} ${address.city}`;
  if (address.postcode) return address.postcode;
  if (address.city) return address.city;
  return String(location || "").trim();
}

async function fetchArbeitnow(query, fetcher, timeoutMs = SOURCE_TIMEOUT_MS) {
  let payload;
  if (fetcher !== globalThis.fetch) {
    payload = await fetchJson(fetcher, ARBEITNOW_URL, { timeoutMs });
  } else if (arbeitnowCache && arbeitnowCache.expiresAt > Date.now()) {
    payload = arbeitnowCache.payload;
  } else {
    if (!arbeitnowPending) {
      arbeitnowPending = fetchJson(fetcher, ARBEITNOW_URL, { timeoutMs })
        .then((value) => {
          arbeitnowCache = { payload: value, expiresAt: Date.now() + ARBEITNOW_CACHE_TTL_MS };
          return value;
        })
        .finally(() => { arbeitnowPending = null; });
    }
    payload = await arbeitnowPending;
  }
  if (!Array.isArray(payload?.data)) throw new Error("Invalid API response");
  return payload.data.map((job) => {
    const description = htmlToText(job.description || "");
    const applyUrl = safeUrl(job.url);
    return {
      id: `arbeitnow-${job.slug || hash(`${job.company_name}-${job.title}-${job.url}`)}`,
      source: "Arbeitnow",
      title: clean(job.title),
      company: clean(job.company_name),
      location: clean(job.location || (job.remote ? "Remote" : "")),
      country: clean(job.country || "Germany"),
      remote: Boolean(job.remote),
      publishedAtOriginal: dateValue(job.created_at),
      modifiedAt: dateValue(job.updated_at || job.modified_at),
      applyUrl,
      sourceUrl: applyUrl,
      description,
      summary: summarize(description),
      tags: unique([...(job.tags || []), ...(job.job_types || [])].map(clean)).slice(0, 8),
      salary: "",
      contacts: extractContacts(description)
    };
  }).filter((job) => matchesQuery(job, query));
}

async function fetchRemoteOk(query, fetcher, timeoutMs = SOURCE_TIMEOUT_MS) {
  let payload;
  if (fetcher !== globalThis.fetch) {
    payload = await fetchJson(fetcher, REMOTE_OK_URL, { timeoutMs });
  } else if (remoteOkCache && remoteOkCache.expiresAt > Date.now()) {
    payload = remoteOkCache.payload;
  } else {
    if (!remoteOkPending) {
      remoteOkPending = fetchJson(fetcher, REMOTE_OK_URL, { timeoutMs })
        .then((value) => {
          remoteOkCache = { payload: value, expiresAt: Date.now() + REMOTE_OK_CACHE_TTL_MS };
          return value;
        })
        .finally(() => { remoteOkPending = null; });
    }
    payload = await remoteOkPending;
  }
  if (!Array.isArray(payload)) throw new Error("Invalid API response");
  return payload.filter((job) => job && job.id).map((job) => {
    const description = htmlToText(job.description || "");
    const applyUrl = safeUrl(job.apply_url || job.url);
    const epoch = job.epoch ? dateValue(job.epoch) : null;
    return {
      id: `remoteok-${job.id}`,
      source: "Remote OK",
      title: clean(job.position),
      company: clean(job.company),
      location: clean(job.location || "Remote"),
      country: clean(job.location || "Remote"),
      remote: true,
      publishedAtOriginal: dateValue(job.date) || epoch,
      modifiedAt: dateValue(job.updated_at || job.modified_at),
      applyUrl,
      sourceUrl: safeUrl(job.url || job.apply_url),
      description,
      summary: summarize(description),
      tags: unique((job.tags || []).map(clean)).slice(0, 8),
      salary: formatSalary(job.salary_min, job.salary_max),
      contacts: extractContacts(description)
    };
  }).filter((job) => matchesQuery(job, query));
}

function formatSalary(minimum, maximum) {
  const min = Number(minimum);
  const max = Number(maximum);
  if (!Number.isFinite(min) && !Number.isFinite(max)) return "";
  return min === max || !Number.isFinite(max) ? `€${(Number.isFinite(min) ? min : max).toLocaleString("en-US")}` : `€${min.toLocaleString("en-US")}–€${max.toLocaleString("en-US")}`;
}

async function fetchArbeitsagentur(query, location, radiusKm, days, selectedTypes, remoteOnly, fetcher, timeoutMs = SOURCE_TIMEOUT_MS) {
  const url = new URL(`${ARBEITSAGENTUR_BASE_URL}/pc/v6/jobs`);
  url.searchParams.set("angebotsart", "1");
  url.searchParams.set("page", "1");
  url.searchParams.set("size", "50");
  url.searchParams.set("pav", "false");
  url.searchParams.set("veroeffentlichtseit", String(days));
  if (query) url.searchParams.set("was", query);
  if (location) {
    url.searchParams.set("wo", coarseLocation(location));
    if (radiusKm) url.searchParams.set("umkreis", String(clamp(radiusKm, 1, 200)));
  }
  const workTime = arbeitsagenturWorkTime(selectedTypes, remoteOnly);
  if (workTime) url.searchParams.set("arbeitszeit", workTime);
  const payload = await fetchJson(fetcher, url, { headers: arbeitsagenturHeaders(), timeoutMs });
  const searchJobs = payload.ergebnisliste || payload.stellenangebote || payload.jobs || [];
  if (!Array.isArray(searchJobs)) throw new Error("Invalid API response");
  const detailed = await mapLimit(searchJobs.slice(0, 12), 3, async (job) => fetchArbeitsagenturDetail(job.referenznummer, fetcher, timeoutMs));
  return searchJobs.map((job, index) => mapArbeitsagenturJob(job, detailed[index]));
}

async function fetchArbeitsagenturDetail(reference, fetcher, timeoutMs = SOURCE_TIMEOUT_MS) {
  if (!reference) return null;
  const url = `${ARBEITSAGENTUR_BASE_URL}/pc/v4/jobdetails/${encodeURIComponent(base64Encode(reference))}`;
  return fetchJson(fetcher, url, { headers: arbeitsagenturHeaders(), timeoutMs });
}

function base64Encode(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function mapArbeitsagenturJob(searchJob, detailJob) {
  const job = { ...searchJob, ...(detailJob || {}) };
  const reference = clean(job.referenznummer);
  const location = formatArbeitsagenturLocation(job.stellenlokationen);
  const description = clean(job.stellenangebotsBeschreibung || "");
  const tags = unique([
    clean(job.hauptberuf),
    ...(job.alleBerufe || []).map(clean),
    ...arbeitsagenturTypeTags(job),
    job.quereinstiegGeeignet ? "Quereinstieg" : "",
    job.vertragsdauer ? clean(String(job.vertragsdauer).toLowerCase().replace(/_/g, " ")) : ""
  ]).slice(0, 10);
  const applyUrl = safeUrl(reference ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(reference)}` : "");
  const originalDate = dateValue(job.datumErsteVeroeffentlichung) || dateValue(job.veroeffentlichungszeitraum?.von);
  const modifiedAt = dateValue(job.aenderungsdatum);
  const sourceDistance = job.entfernung === null || job.entfernung === undefined || job.entfernung === "" ? null : Number(job.entfernung);
  return {
    id: `arbeitsagentur-${reference || hash(`${job.firma}-${job.stellenangebotsTitel}-${location}`)}`,
    source: "Arbeitsagentur",
    title: clean(job.stellenangebotsTitel || job.titel),
    company: clean(job.firma || job.arbeitgeber || "Employer not listed"),
    location,
    country: "Germany",
    remote: Boolean(job.arbeitszeitHeimarbeit || /remote|home[\s-]?office|heimarbeit|telearbeit/i.test(`${job.stellenangebotsTitel || ""} ${description}`)),
    publishedAtOriginal: originalDate,
    modifiedAt,
    applyUrl,
    sourceUrl: applyUrl,
    description,
    summary: summarize(description || `${clean(job.hauptberuf)}. ${tags.join(", ")}.`),
    tags,
    salary: formatArbeitsagenturSalary(job),
    contacts: extractContacts(description),
    sourceDistanceKm: Number.isFinite(sourceDistance) && sourceDistance >= 0 ? sourceDistance : null
  };
}

function arbeitsagenturTypeTags(job) {
  const tags = [];
  if (job.arbeitszeitVollzeit) tags.push("Vollzeit");
  if (job.arbeitszeitTeilzeitAbend || job.arbeitszeitTeilzeitNachmittag || job.arbeitszeitTeilzeitVormittag || job.arbeitszeitTeilzeitFlexibel) tags.push("Teilzeit");
  if (job.istGeringfuegigeBeschaeftigung) tags.push("Minijob");
  if (job.arbeitszeitSchichtNachtWochenende) tags.push("Schicht/Wochenende");
  return tags;
}

function formatArbeitsagenturLocation(locations = []) {
  const first = locations?.[0]?.adresse || {};
  const city = clean(first.ort);
  const postal = clean(first.plz);
  const region = clean(first.region);
  if (postal && city) return `${postal} ${city}`;
  return city || region || "Germany";
}

function formatArbeitsagenturSalary(job) {
  const amount = Number(job.festgehalt);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (/STUNDENLOHN/i.test(job.verguetungsangabe || "")) return `€${amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hour`;
  return `€${amount.toLocaleString("de-DE")}`;
}

function haversineKm(a, b) {
  const radians = (value) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function locationForGeocoding(value) {
  return clean(value)
    .replace(/\b(remote|hybrid|on[-\s]?site|home office|m\/f\/d|f\/m\/d|w\/m\/d)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(germany|deutschland)\b/i, "")
    .trim();
}

async function addDistanceMetadata(jobs, origin, radiusKm, geocode, geocodeOptions) {
  if (!radiusKm) return { jobs, unverified: 0, excluded: 0 };
  if (!origin) return { jobs: [], unverified: jobs.filter((job) => !job.remote).length, excluded: jobs.length };

  const locations = unique(jobs.filter((job) => !job.remote)
    .map((job) => locationForGeocoding(job.location)).filter(Boolean)).slice(0, MAX_JOB_PLACE_GEOCODES);
  const coordsByLocation = new Map();
  const pairs = await mapLimit(locations, 2, async (place) => [place, await geocode(place, geocodeOptions)]);
  for (const pair of pairs) if (pair) coordsByLocation.set(pair[0], pair[1]);

  let unverified = 0;
  let excluded = 0;
  const withDistance = jobs.map((job) => {
    if (job.remote) return { ...job, distanceKm: null, distanceApproximate: false, locationVerified: false };
    const place = locationForGeocoding(job.location);
    const coordinates = coordsByLocation.get(place);
    if (coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)) {
      const distance = haversineKm(origin, coordinates);
      const within = distance <= radiusKm;
      if (!within) excluded += 1;
      return {
        ...job,
        distanceKm: Math.round(distance * 10) / 10,
        distanceApproximate: origin.precision !== "address" || coordinates.precision !== "address",
        locationVerified: within,
        workplacePrecision: coordinates.precision
      };
    }
    const sourceDistance = Logic.parseDistanceKm(job.sourceDistanceKm);
    if (sourceDistance !== null) {
      const within = sourceDistance <= radiusKm;
      if (!within) excluded += 1;
      return { ...job, distanceKm: Math.round(sourceDistance * 10) / 10, distanceApproximate: true, locationVerified: within, workplacePrecision: "source-reported" };
    }
    unverified += 1;
    excluded += 1;
    return { ...job, distanceKm: null, distanceApproximate: false, locationVerified: false };
  });
  return { jobs: withDistance, unverified, excluded };
}

function dedupe(jobs) {
  const byKey = new Map();
  for (const job of jobs) {
    const key = (job.applyUrl || `${job.title}|${job.company}|${job.location}`).toLowerCase().replace(/[?#].*$/, "");
    const old = byKey.get(key);
    if (!old || (job.sourceDistanceKm != null && old.sourceDistanceKm == null)) byKey.set(key, job);
  }
  return [...byKey.values()];
}

function validJob(job) {
  return Boolean(clean(job.title) && clean(job.company) && safeUrl(job.applyUrl) && job.publishedAtOriginal);
}

export async function handleJobsRequest(request, dependencies = {}) {
  const fetcher = dependencies.fetch || fetch;
  const geocode = dependencies.geocode || geocodePlace;
  const now = dependencies.now || Date.now;
  const params = new URL(request.url).searchParams;
  const query = clean(params.get("q") || "").slice(0, 100);
  const location = clean(params.get("location") || "").slice(0, 140);
  const remoteOnly = params.get("remote") === "true";
  const days = clamp(Number(params.get("days") || Logic.MAX_FRESHNESS_DAYS), 1, Logic.MAX_FRESHNESS_DAYS);
  const radiusKm = clamp(Number(params.get("radiusKm") || 0), 0, 500);
  const selectedTypes = parseTypes(params.get("types") || "");
  const originLatValue = params.get("originLat");
  const originLonValue = params.get("originLon");
  const originLat = originLatValue === null || originLatValue.trim() === "" ? NaN : Number(originLatValue);
  const originLon = originLonValue === null || originLonValue.trim() === "" ? NaN : Number(originLonValue);
  const originPrecision = clean(params.get("originPrecision") || "");
  const hasOrigin = Number.isFinite(originLat) && Number.isFinite(originLon) && Math.abs(originLat) <= 90 && Math.abs(originLon) <= 180;
  const origin = hasOrigin ? { latitude: originLat, longitude: originLon, precision: originPrecision || "place" } : null;
  if (!query) return json(400, { error: "A specific job-search term is required.", jobs: [] });
  if (radiusKm > 0 && location && !remoteOnly && !origin) {
    return json(400, { error: "A verified origin is required for a radius search. Resolve or correct the location first.", jobs: [], locationResolution: { verified: false } });
  }
  if (radiusKm > 0 && !location && !remoteOnly) {
    return json(400, { error: "Enter a location or explicitly choose Any distance.", jobs: [], locationResolution: { verified: false } });
  }

  const sourceTasks = [
    ["Arbeitnow", () => fetchArbeitnow(query, fetcher, dependencies.sourceTimeoutMs ?? SOURCE_TIMEOUT_MS)],
    ["Remote OK", () => fetchRemoteOk(query, fetcher, dependencies.sourceTimeoutMs ?? SOURCE_TIMEOUT_MS)],
    ["Arbeitsagentur", () => fetchArbeitsagentur(query, location, radiusKm, days, selectedTypes, remoteOnly, fetcher, dependencies.sourceTimeoutMs ?? SOURCE_TIMEOUT_MS)]
  ];
  const settled = await Promise.allSettled(sourceTasks.map(([, run]) => run()));
  const sourceFailures = {};
  const successfulSources = [];
  let rawJobs = [];
  settled.forEach((result, index) => {
    const sourceName = sourceTasks[index][0];
    if (result.status === "fulfilled") {
      successfulSources.push(sourceName);
      rawJobs.push(...result.value);
    } else {
      sourceFailures[sourceName] = clean(result.reason?.message || "Source unavailable").slice(0, 180);
    }
  });
  if (!successfulSources.length) {
    return json(502, {
      error: "All live job sources failed; no vacancy result is being presented as an empty successful search.",
      sourceFailures,
      sources: [],
      jobs: []
    });
  }

  const currentTime = now();
  rawJobs = dedupe(rawJobs.map(withMetadata).filter(validJob));
  const beforeFilters = rawJobs.length;
  const freshJobs = rawJobs.filter((job) => Logic.isDateEligible(job, days, currentTime));
  const queryJobs = freshJobs.filter((job) => matchesQuery(job, query));
  const typeJobs = queryJobs.filter((job) => matchesTypes(job, selectedTypes));
  let eligible = typeJobs;
  let locationResolution = null;
  let distanceStats = { jobs: typeJobs, unverified: 0, excluded: 0 };
  if (radiusKm > 0 && location && !remoteOnly) {
    locationResolution = {
      verified: true,
      precision: origin.precision,
      label: clean(params.get("originLabel") || ""),
      fallback: params.get("originFallback") === "true",
      notice: clean(params.get("originNotice") || "")
    };
    const localJobs = typeJobs.filter((job) => !job.remote);
    const remoteJobs = [];
    distanceStats = await addDistanceMetadata(localJobs, origin, radiusKm, geocode, { fetch: fetcher, minDelayMs: dependencies.photonMinDelayMs ?? 1000, now });
    eligible = distanceStats.jobs.filter((job) => job.locationVerified && job.distanceKm <= radiusKm);
    if (remoteOnly) remoteJobs.push(...typeJobs.filter((job) => job.remote));
    eligible.push(...remoteJobs);
  } else if (remoteOnly) {
    eligible = typeJobs.filter((job) => job.remote);
    locationResolution = { verified: true, precision: "remote", notice: "Remote positions are identified separately and have no local workplace distance." };
  } else if (radiusKm > 0) {
    eligible = [];
    distanceStats = { jobs: [], unverified: typeJobs.length, excluded: typeJobs.length };
  }

  const finalJobs = eligible
    .filter((job) => !remoteOnly || job.remote)
    .filter((job) => remoteOnly || !job.remote || radiusKm === 0)
    .filter((job) => !radiusKm || remoteOnly || (Number.isFinite(job.distanceKm) && job.distanceKm <= radiusKm))
    .map((job) => ({ ...job, postedAt: job.publishedAtOriginal, match: null, locationVerified: radiusKm > 0 && !job.remote ? job.locationVerified === true : null }))
    .sort((a, b) => new Date(b.publishedAtOriginal) - new Date(a.publishedAtOriginal))
    .slice(0, 60);

  return json(200, {
    generatedAt: new Date(currentTime).toISOString(),
    query,
    location: location ? coarseLocation(location) : "",
    remote: remoteOnly,
    days,
    radiusKm,
    types: selectedTypes,
    jobs: finalJobs,
    sources: successfulSources,
    sourceFailures,
    locationResolution,
    counts: {
      sourceRecords: beforeFilters,
      withinPublicationWindow: freshJobs.length,
      afterRoleAndTypeFilters: typeJobs.length,
      returned: finalJobs.length,
      unverifiedWorkplaces: distanceStats.unverified,
      excludedByLocation: distanceStats.excluded
    },
    notes: [
      "Only original publication dates within the selected maximum 14-day window are included; modification dates are not treated as new posts.",
      "Local radius results require a source-reported distance or a geocoded workplace location; missing distances are excluded, never treated as zero.",
      "Remote roles are kept distinct from local workplaces and are shown only when Remote only is explicitly selected or Any distance is selected."
    ]
  });
}

export const jobsInternals = Object.freeze({
  dateValue,
  mapArbeitsagenturJob,
  coarseLocation,
  matchesQuery,
  matchesTypes,
  haversineKm,
  validJob,
  addDistanceMetadata
});

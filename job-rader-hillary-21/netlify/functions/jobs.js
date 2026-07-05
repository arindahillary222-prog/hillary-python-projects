const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";
const REMOTE_OK_URL = "https://remoteok.com/api";
const ARBEITSAGENTUR_BASE_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const ARBEITSAGENTUR_API_KEY = "jobboerse-jobsuche";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GEO_CACHE = new Map();
const CITY_COORDS = {
  berlin: [52.52, 13.405],
  hamburg: [53.551, 9.993],
  munich: [48.137, 11.576],
  münchen: [48.137, 11.576],
  cologne: [50.937, 6.96],
  köln: [50.937, 6.96],
  frankfurt: [50.111, 8.682],
  stuttgart: [48.775, 9.182],
  düsseldorf: [51.227, 6.773],
  dusseldorf: [51.227, 6.773],
  dortmund: [51.514, 7.465],
  essen: [51.456, 7.012],
  leipzig: [51.34, 12.374],
  bremen: [53.079, 8.802],
  dresden: [51.05, 13.737],
  hannover: [52.375, 9.732],
  nuremberg: [49.452, 11.077],
  nürnberg: [49.452, 11.077],
  duisburg: [51.434, 6.762],
  bochum: [51.481, 7.216],
  wuppertal: [51.256, 7.151],
  bielefeld: [52.03, 8.532],
  bonn: [50.737, 7.099],
  münster: [51.961, 7.626],
  munster: [51.961, 7.626],
  karlsruhe: [49.006, 8.404],
  mannheim: [49.487, 8.466],
  augsburg: [48.371, 10.898],
  wiesbaden: [50.078, 8.239],
  aachen: [50.776, 6.083],
  freiburg: [47.999, 7.842],
  mainz: [50.0, 8.271],
  potsdam: [52.39, 13.064],
  darmstadt: [49.872, 8.651],
  regensburg: [49.013, 12.101],
  würzburg: [49.792, 9.953],
  wurzburg: [49.792, 9.953],
  ulm: [48.402, 9.987],
  koblenz: [50.356, 7.589],
  trier: [49.75, 6.637],
  jena: [50.928, 11.589],
  saarbrücken: [49.24, 6.997],
  saarbrucken: [49.24, 6.997],
  osnabrück: [52.279, 8.047],
  osnabruck: [52.279, 8.047],
  paderborn: [51.719, 8.754],
  heidelberg: [49.399, 8.672],
  ingolstadt: [48.766, 11.425],
  erfurt: [50.984, 11.029],
  rostock: [54.092, 12.099],
  kiel: [54.323, 10.123],
  kassel: [51.312, 9.479],
  magdeburg: [52.12, 11.627]
};
const QUERY_STOP_WORDS = new Set([
  "job", "jobs", "role", "position", "work", "with", "from", "the", "and", "for", "und", "der", "die", "das",
  "in", "im", "am", "an", "of", "to", "a"
]);

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const query = clean(params.q || "");
  const location = clean(params.location || "");
  const remote = params.remote === "true";
  const days = clamp(Number(params.days || 30), 1, 90);
  const radiusKm = clamp(Number(params.radiusKm || 0), 0, 500);
  const selectedTypes = parseSelectedTypes(params.types || "");

  try {
    const [arbeitnow, remoteOk, arbeitsagentur] = await Promise.allSettled([
      fetchArbeitnow(query),
      fetchRemoteOk(query),
      fetchArbeitsagentur(query, location, radiusKm, days, selectedTypes, remote)
    ]);

    const jobs = [
      ...(arbeitnow.status === "fulfilled" ? arbeitnow.value : []),
      ...(remoteOk.status === "fulfilled" ? remoteOk.value : []),
      ...(arbeitsagentur.status === "fulfilled" ? arbeitsagentur.value : [])
    ]
      .map(addJobTypeMetadata)
      .filter((job) => isFresh(job.postedAt, days))
      .filter((job) => matchesQuery(job, query))
      .filter((job) => matchesJobTypes(job, selectedTypes));

    const withDistance = await addDistanceMetadata(jobs, location, radiusKm);
    const filteredJobs = withDistance
      .filter((job) => matches(job, query, location, remote, radiusKm))
      .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
      .slice(0, 60);

    return json(200, {
      generatedAt: new Date().toISOString(),
      query,
      location,
      remote,
      days,
      radiusKm,
      types: selectedTypes,
      jobs: filteredJobs,
      sources: [
        "Arbeitnow live job API",
        "Remote OK public API",
        "Arbeitsagentur live job API"
      ],
      notes: [
        "Applicant or interest counts are shown only when a source publishes them.",
        "Expired status is estimated from source freshness and active apply links because most public APIs do not expose expiry dates.",
        "Radius filtering uses published job locations when the location can be geocoded; remote roles remain visible unless Remote only is disabled by the user."
      ]
    });
  } catch (error) {
    return json(502, {
      error: "Live job sources are temporarily unavailable.",
      detail: error.message
    });
  }
};

async function fetchArbeitnow(query) {
  const url = new URL(ARBEITNOW_URL);
  if (query) {
    url.searchParams.set("search", query);
  }

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "JOB-RADER-HILLARY-21/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Arbeitnow returned ${response.status}`);
  }
  const payload = await response.json();
  return (payload.data || []).map((job) => {
    const description = htmlToText(job.description || "");
    const contacts = extractContacts(`${description} ${job.url || ""}`);
    return {
      id: `arbeitnow-${job.slug || hash(`${job.company_name}-${job.title}`)}`,
      source: "Arbeitnow",
      title: clean(job.title),
      company: clean(job.company_name),
      location: clean(job.location || (job.remote ? "Remote" : "")),
      country: "Germany",
      remote: Boolean(job.remote),
      postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
      applyUrl: job.url || "",
      sourceUrl: job.url || "",
      description,
      summary: summarize(description),
      tags: unique([...(job.tags || []), ...(job.job_types || [])].map(clean).filter(Boolean)).slice(0, 8),
      salary: "",
      contacts,
      interestCount: null,
      interestLabel: "Not published by source"
    };
  });
}

async function fetchRemoteOk(query) {
  const response = await fetch(REMOTE_OK_URL, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "JOB-RADER-HILLARY-21/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Remote OK returned ${response.status}`);
  }
  const payload = await response.json();
  return payload
    .filter((job) => job && job.id)
    .map((job) => {
      const description = htmlToText(job.description || "");
      const contacts = extractContacts(`${description} ${job.apply_url || ""} ${job.url || ""}`);
      return {
        id: `remoteok-${job.id}`,
        source: "Remote OK",
        title: clean(job.position),
      company: clean(job.company),
      location: clean(job.location || "Remote"),
      country: clean(job.location || "Remote"),
        remote: true,
        postedAt: job.date || (job.epoch ? new Date(job.epoch * 1000).toISOString() : null),
        applyUrl: job.apply_url || job.url || "",
        sourceUrl: job.url || job.apply_url || "",
        description,
        summary: summarize(description),
        tags: unique((job.tags || []).map(clean).filter(Boolean)).slice(0, 8),
        salary: formatSalary(job.salary_min, job.salary_max),
        contacts,
        interestCount: Number.isFinite(job.views) ? job.views : null,
        interestLabel: Number.isFinite(job.views) ? `${job.views} views` : "Not published by source"
      };
    })
    .filter((job) => {
      if (!query) {
        return true;
      }
      return matchesQuery(job, query);
    });
}

async function fetchArbeitsagentur(query, location, radiusKm, days, selectedTypes, remoteOnly) {
  const url = new URL(`${ARBEITSAGENTUR_BASE_URL}/pc/v6/jobs`);
  url.searchParams.set("angebotsart", "1");
  url.searchParams.set("page", "1");
  url.searchParams.set("size", "50");
  url.searchParams.set("pav", "false");
  url.searchParams.set("veroeffentlichtseit", String(clamp(days || 30, 1, 100)));
  if (query) {
    url.searchParams.set("was", query);
  }
  if (location) {
    url.searchParams.set("wo", location);
    if (radiusKm) {
      url.searchParams.set("umkreis", String(clamp(radiusKm, 1, 200)));
    }
  }
  const workTime = arbeitsagenturWorkTime(selectedTypes, remoteOnly);
  if (workTime) {
    url.searchParams.set("arbeitszeit", workTime);
  }

  const response = await fetch(url, {
    headers: arbeitsagenturHeaders()
  });
  if (!response.ok) {
    throw new Error(`Arbeitsagentur returned ${response.status}`);
  }
  const payload = await response.json();
  const searchJobs = payload.ergebnisliste || payload.stellenangebote || [];
  const detailJobs = await loadArbeitsagenturDetails(searchJobs.slice(0, 18));
  return searchJobs.map((job, index) => mapArbeitsagenturJob(job, detailJobs[index], selectedTypes));
}

async function loadArbeitsagenturDetails(jobs) {
  const detailResults = await Promise.allSettled(jobs.map((job) => fetchArbeitsagenturDetail(job.referenznummer)));
  return detailResults.map((result) => (result.status === "fulfilled" ? result.value : null));
}

async function fetchArbeitsagenturDetail(reference) {
  if (!reference) {
    return null;
  }
  const encoded = Buffer.from(reference, "utf8").toString("base64");
  const url = `${ARBEITSAGENTUR_BASE_URL}/pc/v4/jobdetails/${encodeURIComponent(encoded)}`;
  const response = await fetch(url, {
    headers: arbeitsagenturHeaders()
  });
  if (!response.ok) {
    throw new Error(`Arbeitsagentur details returned ${response.status}`);
  }
  return response.json();
}

function arbeitsagenturHeaders() {
  return {
    "Accept": "application/json",
    "User-Agent": "JOB-RADER-HILLARY-21/1.0",
    "X-API-Key": ARBEITSAGENTUR_API_KEY
  };
}

function arbeitsagenturWorkTime(selectedTypes, remoteOnly) {
  const values = new Set();
  if (selectedTypes.includes("full-time")) {
    values.add("vz");
  }
  if (selectedTypes.includes("part-time")) {
    values.add("tz");
  }
  if (selectedTypes.includes("mini-job")) {
    values.add("mj");
  }
  if (remoteOnly) {
    values.add("ho");
  }
  return [...values].join(";");
}

function mapArbeitsagenturJob(searchJob, detailJob, selectedTypes = []) {
  const job = { ...searchJob, ...(detailJob || {}) };
  const reference = clean(job.referenznummer);
  const location = formatArbeitsagenturLocation(job.stellenlokationen);
  const description = clean(job.stellenangebotsBeschreibung || "");
  const tags = unique([
    clean(job.hauptberuf),
    ...(job.alleBerufe || []).map(clean),
    ...arbeitsagenturTypeTags(job, selectedTypes),
    job.quereinstiegGeeignet ? "Quereinstieg" : "",
    job.vertragsdauer ? formatGermanEnum(job.vertragsdauer) : ""
  ]).slice(0, 10);
  const salary = formatArbeitsagenturSalary(job);
  const applyUrl = reference
    ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(reference)}`
    : "https://www.arbeitsagentur.de/jobsuche/";
  const text = `${job.stellenangebotsTitel || ""} ${job.firma || ""} ${job.hauptberuf || ""} ${description} ${tags.join(" ")}`;

  return {
    id: `arbeitsagentur-${reference || hash(`${job.firma}-${job.stellenangebotsTitel}-${location}`)}`,
    source: "Arbeitsagentur",
    title: clean(job.stellenangebotsTitel || job.titel),
    company: clean(job.firma || job.arbeitgeber || "Employer not listed"),
    location,
    country: "Germany",
    remote: Boolean(job.arbeitszeitHeimarbeit || /remote|home[\s-]?office|heimarbeit|telearbeit/i.test(text)),
    postedAt: latestDate([
      job.aenderungsdatum,
      job.veroeffentlichungszeitraum?.von,
      job.datumErsteVeroeffentlichung
    ]),
    applyUrl,
    sourceUrl: applyUrl,
    description,
    summary: summarize(description || `${clean(job.hauptberuf)}. ${tags.join(", ")}.`),
    tags,
    salary,
    contacts: extractContacts(`${description} ${applyUrl}`),
    interestCount: null,
    interestLabel: "Not published by source",
    distanceKm: Number.isFinite(Number(job.entfernung)) ? Math.round(Number(job.entfernung)) : null
  };
}

function arbeitsagenturTypeTags(job, selectedTypes = []) {
  const tags = [];
  if (job.arbeitszeitVollzeit) {
    tags.push("Vollzeit");
  }
  if (
    job.arbeitszeitTeilzeitAbend ||
    job.arbeitszeitTeilzeitNachmittag ||
    job.arbeitszeitTeilzeitVormittag ||
    job.arbeitszeitTeilzeitFlexibel
  ) {
    tags.push("Teilzeit");
  }
  if (job.istGeringfuegigeBeschaeftigung) {
    tags.push("Minijob");
  }
  if (job.arbeitszeitSchichtNachtWochenende) {
    tags.push("Schicht/Wochenende");
  }
  if (!tags.length) {
    if (selectedTypes.includes("full-time")) {
      tags.push("Vollzeit");
    }
    if (selectedTypes.includes("part-time")) {
      tags.push("Teilzeit");
    }
    if (selectedTypes.includes("mini-job")) {
      tags.push("Minijob");
    }
  }
  return tags;
}

function formatArbeitsagenturLocation(locations = []) {
  const first = locations?.[0]?.adresse || {};
  const city = clean(first.ort);
  const postal = clean(first.plz);
  const region = clean(first.region);
  if (postal && city) {
    return `${postal} ${city}`;
  }
  return city || region || "Germany";
}

function formatArbeitsagenturSalary(job) {
  const amount = Number(job.festgehalt);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }
  if (/STUNDENLOHN/i.test(job.verguetungsangabe || "")) {
    return `€${amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hour`;
  }
  return `€${amount.toLocaleString("de-DE")}`;
}

function formatGermanEnum(value) {
  return clean(String(value || "").toLowerCase().replace(/_/g, " "));
}

function latestDate(values) {
  const dates = values
    .map((value) => (value ? new Date(value) : null))
    .filter((date) => date && Number.isFinite(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] ? dates[0].toISOString() : null;
}

function addJobTypeMetadata(job) {
  const jobTypes = classifyJobTypes(job);
  return {
    ...job,
    jobTypes,
    jobTypeLabels: jobTypes.map(jobTypeLabel),
    languageRequirement: detectLanguageRequirement(job)
  };
}

function classifyJobTypes(job) {
  const text = textFor(job);
  const types = new Set();
  if (/(part[\s-]?time|teilzeit|temps partiel|meio periodo|muda mfupi)/i.test(text)) {
    types.add("part-time");
  }
  if (/(werkstudent|working student|student job|studentenjob|studentische|student assistant|internship|praktikum|trainee)/i.test(text)) {
    types.add("student-job");
  }
  if (/(mini[\s-]?job|minijob|538[\s-]?eur|520[\s-]?eur|geringfugig|geringfügig)/i.test(text)) {
    types.add("mini-job");
  }
  if (/(full[\s-]?time|vollzeit|permanent|unbefristet|temps plein|tempo integral)/i.test(text)) {
    types.add("full-time");
  }
  if (!types.size) {
    types.add("full-time");
  }
  return [...types];
}

function jobTypeLabel(type) {
  return {
    "part-time": "Part time",
    "student-job": "Student job",
    "mini-job": "Mini job",
    "full-time": "Full time"
  }[type] || type;
}

function detectLanguageRequirement(job) {
  const text = textFor(job);
  const german = /(deutsch|german|gute deutsch|fließend deutsch|deutschkenntnisse|c1 deutsch|b2 deutsch|deutsche sprache)/i.test(text);
  const english = /(english|englisch|fluent english|good english|business english|englischkenntnisse|c1 english|b2 english)/i.test(text);
  if (german && english) {
    return "both";
  }
  if (german) {
    return "german";
  }
  if (english) {
    return "english";
  }
  return "unspecified";
}

function matchesJobTypes(job, selectedTypes) {
  if (!selectedTypes.length) {
    return true;
  }
  return job.jobTypes.some((type) => selectedTypes.includes(type));
}

async function addDistanceMetadata(jobs, location, radiusKm) {
  if (!location || !radiusKm) {
    return jobs;
  }
  const origin = await geocodeLocation(location);
  if (!origin) {
    return jobs.map((job) => {
      const sourceDistance = Number(job.distanceKm);
      return Number.isFinite(sourceDistance)
        ? { ...job, distanceKm: Math.round(sourceDistance) }
        : { ...job, distanceKm: null };
    });
  }

  const uniqueLocations = unique(jobs
    .filter((job) => !job.remote)
    .map((job) => simplifyGeoLocation(job.location))
    .filter(Boolean))
    .slice(0, 35);

  const locationPairs = await Promise.all(uniqueLocations.map(async (place) => [place, await geocodeLocation(place)]));
  const coordsByLocation = new Map(locationPairs);

  return jobs.map((job) => {
    if (job.remote) {
      return { ...job, distanceKm: null };
    }
    const sourceDistance = Number(job.distanceKm);
    if (Number.isFinite(sourceDistance)) {
      return { ...job, distanceKm: Math.round(sourceDistance) };
    }
    const place = simplifyGeoLocation(job.location);
    const coords = coordsByLocation.get(place);
    if (!coords) {
      return { ...job, distanceKm: null };
    }
    return { ...job, distanceKm: Math.round(distanceKm(origin, coords)) };
  });
}

function simplifyGeoLocation(value) {
  const text = clean(value)
    .replace(/\b(remote|hybrid|on[-\s]?site|home office|m\/f\/d|f\/m\/d|w\/m\/d)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || /^remote$/i.test(text)) {
    return "";
  }
  return /\bgermany\b/i.test(text) ? text : `${text}, Germany`;
}

async function geocodeLocation(value) {
  const place = simplifyLocationSearch(value);
  if (!place) {
    return null;
  }
  const cached = GEO_CACHE.get(place);
  if (cached !== undefined) {
    return cached;
  }

  const known = knownCoords(place);
  if (known) {
    GEO_CACHE.set(place, known);
    return known;
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", place);
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "JOB-RADER-HILLARY-21/1.0"
      }
    });
    if (!response.ok) {
      GEO_CACHE.set(place, null);
      return null;
    }
    const payload = await response.json();
    const first = payload?.[0];
    const coords = first ? [Number(first.lat), Number(first.lon)] : null;
    const valid = coords && coords.every(Number.isFinite) ? coords : null;
    GEO_CACHE.set(place, valid);
    return valid;
  } catch {
    GEO_CACHE.set(place, null);
    return null;
  }
}

function simplifyLocationSearch(value) {
  const text = clean(value);
  if (!text || /^remote$/i.test(text)) {
    return "";
  }
  return /\b(germany|deutschland)\b/i.test(text) || /^\d{5}\b/.test(text) ? text : `${text}, Germany`;
}

function knownCoords(value) {
  const lower = value.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(city)) {
      return coords;
    }
  }
  return null;
}

function distanceKm(a, b) {
  const earthKm = 6371;
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function parseSelectedTypes(value) {
  const allowed = new Set(["part-time", "student-job", "mini-job", "full-time"]);
  return unique(String(value || "").split(",").map(clean)).filter((type) => allowed.has(type));
}

function matches(job, query, location, remote, radiusKm) {
  if (remote && !job.remote) {
    return false;
  }
  if (!matchesQuery(job, query)) {
    return false;
  }
  const distance = Number(job.distanceKm);
  const hasDistance = Number.isFinite(distance);
  const locationNeedle = location.toLowerCase();
  const locationText = `${job.location} ${job.country || ""} ${job.remote ? "remote" : ""}`.toLowerCase();
  if (location && radiusKm && job.remote && !remote) {
    if (hasDistance) {
      return distance <= radiusKm && Boolean(job.title && job.company && job.applyUrl);
    }
    if (!locationText.includes(locationNeedle) && !locationText.includes("germany") && !locationText.includes("deutschland")) {
      return false;
    }
  }
  if (location && radiusKm && !job.remote && hasDistance && distance > radiusKm) {
    return false;
  }
  if (location && radiusKm && !job.remote && !hasDistance && !locationText.includes(locationNeedle)) {
    return false;
  }
  if (location && !radiusKm && !locationText.includes(locationNeedle)) {
    return false;
  }
  return Boolean(job.title && job.company && job.applyUrl);
}

function matchesQuery(job, query) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) {
    return true;
  }
  const text = textFor(job);
  const title = String(job.title || "").toLowerCase();
  const titleHits = tokens.filter((token) => title.includes(token)).length;
  const textHits = tokens.filter((token) => text.includes(token)).length;
  const specialistTokens = tokens.filter((token) => !isStudentIntentToken(token));
  if (specialistTokens.length && !specialistTokens.every((token) => text.includes(token))) {
    return false;
  }
  if (!specialistTokens.length) {
    return titleHits > 0 || textHits > 0;
  }
  return titleHits === tokens.length || textHits === tokens.length || specialistTokens.every((token) => title.includes(token));
}

function tokenizeQuery(query) {
  return unique(String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .map(clean)
    .filter((token) => token.length > 2 && !QUERY_STOP_WORDS.has(token)));
}

function isStudentIntentToken(token) {
  return /^(student|students|werkstudent|studentenjob|praktikum|internship|intern|aushilfe|minijob|teilzeit|nebenjob|hiwi)$/.test(token);
}

function isFresh(postedAt, days) {
  if (!postedAt) {
    return false;
  }
  const posted = new Date(postedAt).getTime();
  if (!Number.isFinite(posted)) {
    return false;
  }
  const now = Date.now();
  const futureGrace = 24 * 60 * 60 * 1000;
  const windowMs = days * 24 * 60 * 60 * 1000;
  return posted <= now + futureGrace && posted >= now - windowMs;
}

function textFor(job) {
  return `${job.title} ${job.company} ${job.location} ${job.summary} ${job.description} ${(job.tags || []).join(" ")}`.toLowerCase();
}

function summarize(text) {
  return clean(text).split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 360);
}

function htmlToText(value) {
  return clean(String(value)
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

function extractContacts(text) {
  const emails = unique((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.toLowerCase()));
  const websites = unique((text.match(/https?:\/\/[^\s<>"')]+/gi) || []).map((url) => url.replace(/[.,;]+$/, "")));
  return {
    emails: emails.slice(0, 4),
    websites: websites.slice(0, 4)
  };
}

function formatSalary(min, max) {
  const low = Number(min || 0);
  const high = Number(max || 0);
  if (low && high) {
    return `$${low.toLocaleString()} - $${high.toLocaleString()}`;
  }
  if (low) {
    return `From $${low.toLocaleString()}`;
  }
  if (high) {
    return `Up to $${high.toLocaleString()}`;
  }
  return "";
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function hash(value) {
  let output = 0;
  for (const char of value) {
    output = (output << 5) - output + char.charCodeAt(0);
    output |= 0;
  }
  return Math.abs(output).toString(36);
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

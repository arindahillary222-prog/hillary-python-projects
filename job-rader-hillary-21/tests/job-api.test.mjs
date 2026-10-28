import test from "node:test";
import assert from "node:assert/strict";
import { handleJobsRequest, jobsInternals } from "../functions/shared/jobs.mjs";

const NOW = Date.parse("2026-10-28T10:00:00Z");
const isoDaysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const origin = { latitude: 51.34, longitude: 12.37, precision: "address" };

function requestFor(extra = {}) {
  const params = new URLSearchParams({
    q: "Servicekraft",
    location: "04229 Leipzig",
    radiusKm: "30",
    days: "14",
    remote: "false",
    originLat: String(origin.latitude),
    originLon: String(origin.longitude),
    originPrecision: "address",
    originLabel: "Verified test address",
    ...extra
  });
  return new Request(`https://example.test/api/jobs?${params}`);
}

function response(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function textResponse(value, status = 200) {
  return new Response(value, { status, headers: { "Content-Type": "application/rss+xml" } });
}

function fakeSourceFetch({ arbeitnow = [], remoteOk = [], jobicy = [], wwrXml = '<rss><channel><item><title>Unmatched: Vacancy</title><link>https://weworkremotely.com/jobs/unmatched</link><pubDate>2026-10-28T09:00:00Z</pubDate></item></channel></rss>', arbeitsagentur = [], fail = [] } = {}) {
  const urls = [];
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    urls.push(url);
    if (url.hostname === "www.arbeitnow.com") {
      if (fail.includes("Arbeitnow")) return response({ error: "down" }, 503);
      return response({ data: arbeitnow });
    }
    if (url.hostname === "remoteok.com") {
      if (fail.includes("Remote OK")) return response({ error: "down" }, 503);
      return response(remoteOk);
    }
    if (url.hostname === "jobicy.com") {
      if (fail.includes("Jobicy")) return response({ error: "down" }, 503);
      return response({ jobs: jobicy });
    }
    if (url.hostname === "weworkremotely.com") {
      if (fail.includes("We Work Remotely")) return textResponse("source unavailable", 503);
      return textResponse(wwrXml);
    }
    if (url.hostname === "rest.arbeitsagentur.de" && url.pathname.includes("/pc/v6/jobs")) {
      if (fail.includes("Arbeitsagentur")) return response({ error: "down" }, 503);
      return response({ ergebnisliste: arbeitsagentur });
    }
    if (url.hostname === "rest.arbeitsagentur.de" && url.pathname.includes("/jobdetails/")) return response({});
    throw new Error(`Unexpected URL ${url.hostname}${url.pathname}`);
  };
  return { fetch, urls };
}

function sampleSources() {
  return {
    arbeitnow: [
      {
        id: "a-1",
        slug: "servicekraft-test",
        title: "Servicekraft",
        company_name: "Restaurant Example",
        location: "Leipzig, Germany",
        remote: false,
        created_at: Math.floor(Date.parse(isoDaysAgo(1)) / 1000),
        updated_at: isoDaysAgo(0),
        url: "https://www.arbeitnow.com/job/servicekraft-test",
        description: "Gästeservice und Unterstützung im Team. Teilzeit."
      },
      {
        id: "a-old",
        slug: "old-servicekraft-test",
        title: "Servicekraft",
        company_name: "Old Listing",
        location: "Leipzig, Germany",
        remote: false,
        created_at: Math.floor(Date.parse(isoDaysAgo(15)) / 1000),
        updated_at: isoDaysAgo(0),
        url: "https://www.arbeitnow.com/job/old-servicekraft-test",
        description: "Updated recently but originally published too long ago."
      }
    ],
    remoteOk: [
      {
        id: "remote-1",
        position: "Servicekraft",
        company: "Remote Example",
        location: "Remote - Germany",
        date: isoDaysAgo(1),
        url: "https://remoteok.com/remote-jobs/remote-1",
        apply_url: "https://remoteok.com/remote-jobs/remote-1",
        description: "Remote customer support, not a local restaurant workplace."
      }
    ],
    arbeitsagentur: [
      {
        referenznummer: "ba-current",
        stellenangebotsTitel: "Servicekraft",
        firma: "Local Employer",
        hauptberuf: "Servicekraft",
        stellenangebotsBeschreibung: "Gästeservice. Teilzeit.",
        datumErsteVeroeffentlichung: isoDaysAgo(7),
        aenderungsdatum: isoDaysAgo(0),
        entfernung: 12.4,
        stellenlokationen: [{ adresse: { plz: "04229", ort: "Leipzig" } }],
        arbeitszeitTeilzeitVormittag: true
      },
      {
        referenznummer: "ba-old",
        stellenangebotsTitel: "Servicekraft",
        firma: "Old Employer",
        hauptberuf: "Servicekraft",
        stellenangebotsBeschreibung: "Originally old; record modified today.",
        datumErsteVeroeffentlichung: isoDaysAgo(20),
        aenderungsdatum: isoDaysAgo(0),
        entfernung: 4,
        stellenlokationen: [{ adresse: { plz: "04229", ort: "Leipzig" } }]
      }
    ]
  };
}

test("returns only originally published recent local jobs within the chosen radius and marks approximate source distances", async () => {
  const fixture = sampleSources();
  const { fetch, urls } = fakeSourceFetch(fixture);
  const res = await handleJobsRequest(requestFor({ days: "90" }), {
    fetch,
    geocode: async () => ({ latitude: 51.35, longitude: 12.37, precision: "city" }),
    now: () => NOW,
    photonMinDelayMs: 0
  });
  const payload = await res.json();
  assert.equal(res.status, 200);
  assert.equal(payload.days, 14);
  assert.equal(payload.radiusKm, 30);
  assert.equal(payload.jobs.length, 2);
  assert.deepEqual(new Set(payload.jobs.map((job) => job.company)), new Set(["Restaurant Example", "Local Employer"]));
  assert.ok(payload.jobs.every((job) => Date.parse(job.publishedAtOriginal) >= Date.parse(isoDaysAgo(14))));
  assert.ok(payload.jobs.some((job) => job.company === "Local Employer" && job.distanceApproximate === true));
  assert.ok(payload.jobs.every((job) => !job.remote));
  assert.ok(payload.jobs.every((job) => job.applyUrl.startsWith("https://")));
  const searchUrl = urls.find((url) => url.pathname.endsWith("/pc/v6/jobs"));
  assert.equal(searchUrl.searchParams.get("wo"), "04229 Leipzig");
  assert.equal(searchUrl.searchParams.get("veroeffentlichtseit"), "14");
  assert.equal(payload.counts.unverifiedWorkplaces, 0);
});

test("does not fabricate zero-distance results when a workplace cannot be geocoded", async () => {
  const fixture = sampleSources();
  fixture.arbeitnow = [fixture.arbeitnow[0]];
  fixture.arbeitsagentur = [];
  const { fetch } = fakeSourceFetch(fixture);
  const res = await handleJobsRequest(requestFor(), {
    fetch,
    geocode: async () => null,
    now: () => NOW,
    photonMinDelayMs: 0
  });
  const payload = await res.json();
  assert.equal(res.status, 200);
  assert.equal(payload.jobs.length, 0);
  assert.equal(payload.counts.unverifiedWorkplaces, 1);
  assert.equal(payload.jobs.some((job) => job.distanceKm === 0), false);
});

test("includes an exact-radius workplace and excludes a point just outside the chosen boundary", async () => {
  const longitudeAt30Km = 30 / 6371 * (180 / Math.PI);
  const jobs = [
    { title: "At boundary", company: "Exact", location: "Boundary Place", remote: false, sourceDistanceKm: 1 },
    { title: "Outside boundary", company: "Outside", location: "Outside Place", remote: false, sourceDistanceKm: 0 }
  ];
  const result = await jobsInternals.addDistanceMetadata(jobs, { latitude: 0, longitude: 0, precision: "address" }, 30, async (place) => ({
    latitude: 0,
    longitude: place === "Boundary Place" ? longitudeAt30Km : longitudeAt30Km * 1.001,
    precision: "address"
  }), { minDelayMs: 0 });
  assert.equal(result.jobs[0].distanceKm, 30);
  assert.equal(result.jobs[0].locationVerified, true);
  assert.equal(result.jobs[1].locationVerified, false);
  assert.ok(result.jobs[1].distanceKm <= 30);
});

test("partial source failures are surfaced while successful source data is retained", async () => {
  const fixture = sampleSources();
  fixture.remoteOk = [];
  fixture.arbeitsagentur = [];
  const { fetch } = fakeSourceFetch({ ...fixture, fail: ["Remote OK", "Arbeitsagentur"] });
  const res = await handleJobsRequest(requestFor(), {
    fetch,
    geocode: async () => ({ latitude: 51.35, longitude: 12.37, precision: "city" }),
    now: () => NOW,
    photonMinDelayMs: 0
  });
  const payload = await res.json();
  assert.equal(res.status, 200);
  assert.equal(payload.sources.includes("Arbeitnow"), true);
  assert.equal(payload.jobs.length, 1);
  assert.deepEqual(Object.keys(payload.sourceFailures).sort(), ["Arbeitsagentur", "Remote OK"].sort());
});

test("merges current Jobicy API and We Work Remotely RSS listings with genuine source links", async () => {
  const fixture = {
    jobicy: [{ id: 765, jobTitle: "Servicekraft", companyName: "Jobicy Employer", jobGeo: "Germany", jobType: ["Part-Time"], jobDescription: "Guest service and flexible shifts.", jobExcerpt: "Part-time service work.", pubDate: isoDaysAgo(1), url: "https://jobicy.com/jobs/service-test" }],
    wwrXml: `<rss><channel><item><title>WWR Employer: Servicekraft</title><link>https://weworkremotely.com/remote-jobs/wwr-service</link><pubDate>${isoDaysAgo(2)}</pubDate><description><![CDATA[Remote service support, part-time.]]></description><country>Germany</country></item></channel></rss>`
  };
  const { fetch } = fakeSourceFetch(fixture);
  const res = await handleJobsRequest(requestFor({ radiusKm: "0" }), { fetch, now: () => NOW });
  const payload = await res.json();
  assert.equal(res.status, 200);
  assert.ok(payload.sources.includes("Jobicy"));
  assert.ok(payload.sources.includes("We Work Remotely"));
  assert.ok(payload.jobs.some((job) => job.source === "Jobicy" && job.applyUrl === "https://jobicy.com/jobs/service-test"));
  assert.ok(payload.jobs.some((job) => job.source === "We Work Remotely" && job.company === "WWR Employer" && job.applyUrl === "https://weworkremotely.com/remote-jobs/wwr-service"));
  assert.ok(payload.jobs.every((job) => Date.parse(job.publishedAtOriginal) >= Date.parse(isoDaysAgo(14))));
});

test("all provider failures return an explicit error rather than a successful empty search", async () => {
  const { fetch } = fakeSourceFetch({ fail: ["Arbeitnow", "Remote OK", "Jobicy", "We Work Remotely", "Arbeitsagentur"] });
  const res = await handleJobsRequest(requestFor(), { fetch, now: () => NOW });
  const payload = await res.json();
  assert.equal(res.status, 502);
  assert.match(payload.error, /all live job sources failed/i);
  assert.equal(Object.keys(payload.sourceFailures).length, 5);
});

test("source request timeouts are bounded and reported", async () => {
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === "www.arbeitnow.com") {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    }
    return response({ error: "source unavailable" }, 503);
  };
  const res = await handleJobsRequest(requestFor(), { fetch, sourceTimeoutMs: 10, now: () => NOW });
  const payload = await res.json();
  assert.equal(res.status, 502);
  assert.match(payload.sourceFailures.Arbeitnow, /aborted|abort/i);
});

test("rejects radius searches without a verified origin rather than widening the location filter", async () => {
  const params = new URLSearchParams({ q: "Servicekraft", location: "04229 Leipzig", radiusKm: "30", days: "14" });
  const res = await handleJobsRequest(new Request(`https://example.test/api/jobs?${params}`), {
    fetch: fakeSourceFetch(sampleSources()).fetch,
    now: () => NOW
  });
  const payload = await res.json();
  assert.equal(res.status, 400);
  assert.match(payload.error, /verified origin/i);
});

test("does not send a private street address to the Federal Employment Agency search query", async () => {
  const fixture = sampleSources();
  const { fetch, urls } = fakeSourceFetch(fixture);
  const params = new URLSearchParams({
    q: "Servicekraft",
    location: "Musterstraße 9, 04229 Leipzig",
    radiusKm: "30",
    days: "14",
    originLat: String(origin.latitude),
    originLon: String(origin.longitude),
    originPrecision: "address"
  });
  await handleJobsRequest(new Request(`https://example.test/api/jobs?${params}`), {
    fetch,
    geocode: async () => ({ latitude: 51.35, longitude: 12.37, precision: "city" }),
    now: () => NOW,
    photonMinDelayMs: 0
  });
  const searchUrl = urls.find((url) => url.pathname.endsWith("/pc/v6/jobs"));
  assert.equal(searchUrl.searchParams.get("wo"), "04229 Leipzig");
  assert.equal(searchUrl.searchParams.get("wo").includes("Musterstraße"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { resolveOrigin, geocodePlace } from "../functions/shared/geocoder.mjs";
import { handleLocationRequest } from "../functions/shared/location.mjs";

function feature({ house = "9", street = "Musterstraße", postcode = "04229", city = "Leipzig", country = "Germany", type = "house", longitude = 12.37, latitude = 51.34 } = {}) {
  return {
    type: "Feature",
    properties: { name: `${street} ${house}`, street, housenumber: house, postcode, city, country, osm_value: type, type },
    geometry: { type: "Point", coordinates: [longitude, latitude] }
  };
}

function payload(features) {
  return new Response(JSON.stringify({ type: "FeatureCollection", features }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("resolves a street address only when house number, street, postcode, and country match", async () => {
  const called = [];
  const fetch = async (input) => {
    const url = new URL(input);
    called.push(url.searchParams.get("q"));
    return payload([feature(), feature({ house: "91", longitude: 12.39 })]);
  };
  const result = await resolveOrigin("Leipzig: Musterstraße 9, 04229", { fetch, minDelayMs: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.precision, "address");
  assert.equal(result.fallback, false);
  assert.equal(result.latitude, 51.34);
  assert.equal(called.length, 1);
});

test("falls back to the postcode area only with an explicit precision notice when house-level verification fails", async () => {
  const calls = [];
  const fetch = async (input) => {
    const url = new URL(input);
    const query = url.searchParams.get("q");
    calls.push(query);
    if (query.startsWith("Musterstraße 9")) return payload([feature({ house: "91" })]);
    return payload([feature({ house: "", street: "", type: "postcode", longitude: 12.36 })]);
  };
  const result = await resolveOrigin("Leipzig: Musterstraße 9, 04229", { fetch, minDelayMs: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.precision, "postcode");
  assert.equal(result.fallback, true);
  assert.match(result.notice, /house-number location could not be verified/i);
  assert.deepEqual(calls, ["Musterstraße 9, 04229 Leipzig, Germany", "04229 Leipzig, Germany"]);
});

test("resolves city-only search locations without claiming house-level precision", async () => {
  const fetch = async () => payload([feature({ house: "", street: "", type: "city" })]);
  const result = await geocodePlace("Leipzig", { fetch, minDelayMs: 0 });
  assert.equal(result.precision, "city");
  assert.ok(Math.abs(result.latitude - 51.34) < 0.001);
});

test("same-origin location endpoint returns precision, label, and Photon provider metadata", async () => {
  const fetch = async () => payload([feature()]);
  const response = await handleLocationRequest(new Request("https://example.test/api/location?query=Leipzig"), {
    fetch,
    photonMinDelayMs: 0
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.provider, "Photon");
  assert.equal(body.location.precision, "city");
});

test("same-origin location endpoint reverse-geocodes browser coordinates for the existing Use my location control", async () => {
  const response = await handleLocationRequest(new Request("https://example.test/api/location?lat=51.34&lon=12.37"), {
    fetch: async (input) => {
      assert.equal(new URL(input).pathname, "/reverse");
      return payload([feature()]);
    },
    photonMinDelayMs: 0
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.location.precision, "address");
  assert.match(body.location.location, /Musterstraße 9, 04229, Leipzig, Germany/);
});

test("unavailable geocoding returns an explicit error and does not invent coordinates", async () => {
  const response = await handleLocationRequest(new Request("https://example.test/api/location?query=Leipzig"), {
    fetch: async () => { throw new Error("network offline"); },
    photonMinDelayMs: 0
  });
  const body = await response.json();
  assert.equal(response.status, 422);
  assert.equal(body.ok, false);
  assert.equal(body.latitude, undefined);
  assert.match(body.notice, /could not be verified/i);
});

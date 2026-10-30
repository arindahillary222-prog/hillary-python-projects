import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const logic = require("../job-logic.js");
const FIXED_NOW = Date.parse("2026-10-28T10:00:00Z");

const anonymizedCv = `
Studentin, Servicekraft / Kellnerin • Minijob & Teilzeit
Auch offen für Küche, Housekeeping, Lager, Verpackung, Produktion sowie Regal- und Warenverräumung
BERUFLICHES PROFIL
Freundliche, zuverlässige Studentin mit mehrjähriger Erfahrung in der persönlichen Betreuung von Menschen, bei Veranstaltungen und in der Materialorganisation.
BERUFSERFAHRUNG
Kundenbetreuung: persönliche Ansprechperson; Auskünfte gegeben und bei Anliegen unterstützt.
Veranstaltungsvorbereitung: Aktionsflächen aufgebaut, Materialien bereitgestellt und bei Veranstaltungen unterstützt.
Materialorganisation: Bestände und Arbeitsmaterialien kontrolliert, sortiert und nachverfolgt.
Teamabläufe: Aufgaben abgestimmt und bei höherem Besucheraufkommen strukturiert gearbeitet.
Deutsch: B1
Englisch: C1 – fließend
Vorlesungszeit: bis 20 Std./Woche
Vorlesungsfreie Zeit: bis 40 Std./Woche
Leipzig: Musterstraße 9, 04229 BERUFLICHES PROFIL
`;

test("reconstructs a two-column PDF row left-to-right without merging the opposite column into an address", () => {
  const item = (str, x, y, width) => ({ str, width, transform: [1, 0, 0, 1, x, y] });
  const lines = logic.extractPdfPageLines([
    item("Musterstraße", 40, 800, 62), item("9,", 106, 800, 8), item("Column heading", 350, 800, 70),
    item("04229", 40, 780, 30), item("Leipzig", 74, 780, 42), item("English C1", 350, 780, 55)
  ]);
  assert.deepEqual(lines, ["Musterstraße 9,", "Column heading", "04229 Leipzig", "English C1"]);
});

test("extracts target roles, skills, language levels, availability, and anonymized two-column address without returning raw CV text", () => {
  const profile = logic.extractCvProfile(anonymizedCv);
  assert.deepEqual(profile.categories, ["service", "kitchen", "housekeeping", "warehouse", "retail", "production"]);
  assert.ok(profile.skills.includes("customerCare"));
  assert.ok(profile.skills.includes("eventSupport"));
  assert.ok(profile.skills.includes("materials"));
  assert.ok(profile.skills.includes("teamwork"));
  assert.equal(profile.languages.german, "B1");
  assert.equal(profile.languages.english, "C1");
  assert.equal(profile.student, true);
  assert.equal(profile.hoursPerWeekDuringSemester, 20);
  assert.equal(profile.hoursPerWeekDuringBreak, 40);
  assert.equal(profile.address.street, "Musterstraße");
  assert.equal(profile.address.houseNumber, "9");
  assert.equal(profile.address.postcode, "04229");
  assert.equal(profile.address.city, "Leipzig");
  assert.equal(profile.address.precision, "address");
  assert.equal(Object.hasOwn(profile, "rawText"), false);
  assert.equal(JSON.stringify(profile).includes("Musterstraße 9"), true);
  assert.equal(JSON.stringify(profile).includes("Kundenbetreuung:"), false);
});

test("search queries cover each expressly listed CV role family and stay within the bounded query set", () => {
  const queries = logic.getCvSearchQueries(anonymizedCv);
  assert.ok(queries.some((query) => /Servicekraft/i.test(query)));
  assert.ok(queries.some((query) => /Küche/i.test(query)));
  assert.ok(queries.some((query) => /Housekeeping/i.test(query)));
  assert.ok(queries.some((query) => /room attendant/i.test(query)));
  assert.ok(queries.some((query) => /Lager/i.test(query)));
  assert.ok(queries.some((query) => /warehouse assistant/i.test(query)));
  assert.ok(queries.some((query) => /Warenverräumung|Regal/i.test(query)));
  assert.ok(queries.some((query) => /shelf stacker/i.test(query)));
  assert.ok(queries.some((query) => /Produktion/i.test(query)));
  assert.ok(queries.some((query) => /production worker/i.test(query)));
  assert.ok(queries.some((query) => /waiter/i.test(query)));
  assert.ok(queries.some((query) => /kitchen assistant/i.test(query)));
  assert.ok(queries.length <= 12);
  assert.equal(logic.categoriesForTitle("Training and Outreach Officer").length, 0);
});

test("scores explainable compatibility, does not treat distance as match quality, and rejects unrelated senior roles", () => {
  const profile = logic.extractCvProfile(anonymizedCv);
  const service = logic.matchJobToProfile({
    title: "Servicekraft / Kellnerin",
    summary: "Gästeservice, Veranstaltungen, Team, Deutsch B1 erforderlich, Teilzeit"
  }, profile);
  assert.equal(service.roleAligned, true);
  assert.ok(service.match >= 0 && service.match <= 100);
  assert.ok(service.strengths.some((item) => /Customer care/i.test(item)));
  assert.ok(service.missing.some((item) => /direct experience/i.test(item)));
  assert.equal(Object.hasOwn(service, "successRate"), false);

  const kitchen = logic.matchJobToProfile({ title: "Küchenhilfe - Gastronomie", summary: "Unterstützung bei Vorbereitungsarbeiten in einem kleinen Team." }, profile);
  assert.equal(kitchen.matchedCategory, "kitchen");
  assert.equal(kitchen.strengths.includes("Customer care / participant support experience"), false);
  assert.equal(kitchen.strengths.includes("Event preparation and on-site support"), false);

  const unrelated = logic.matchJobToProfile({
    title: "Senior Customer Experience Manager",
    summary: "Leads a customer support team"
  }, profile);
  assert.equal(unrelated.roleAligned, false);
  assert.equal(unrelated.match, 0);
  assert.ok(unrelated.missing.some((item) => /senior|management|specialist/i.test(item)));
});

test("mandatory unmet language and licence requirements prevent an 85%+ score", () => {
  const profile = logic.extractCvProfile(anonymizedCv);
  const job = logic.matchJobToProfile({
    title: "Servicekraft",
    summary: "Gästeservice. German B2 required; a driving licence is mandatory. Teilzeit."
  }, profile);
  assert.ok(job.mandatoryIssues.length >= 2);
  assert.ok(job.match <= 84);
  assert.ok(job.missing.some((item) => /German B2 required/i.test(item)));
});

test("student suitability is a separate ranking signal and penalizes advertised hours above the CV limit", () => {
  const profile = logic.extractCvProfile(anonymizedCv);
  const flexibleJob = { title: "Teilzeit Servicekraft", summary: "Flexible Arbeitszeiten für Studierende, Quereinstieg willkommen." };
  const incompatibleJob = { title: "Servicekraft Vollzeit", summary: "40 Stunden pro Woche." };
  assert.ok(logic.studentSuitabilityScore(flexibleJob, profile) > logic.studentSuitabilityScore(incompatibleJob, profile));
  const jobs = [
    { id: "general", match: 82, studentFitScore: 0, publishedAtOriginal: new Date(FIXED_NOW - 60 * 60 * 1000).toISOString() },
    { id: "student", match: 82, studentFitScore: 8, publishedAtOriginal: new Date(FIXED_NOW - 60 * 60 * 1000).toISOString() }
  ];
  jobs.sort((a, b) => logic.compareRank(a, b, FIXED_NOW));
  assert.deepEqual(jobs.map((job) => job.id), ["student", "general"]);
});

test("cover-letter generator always writes German, names the role/employer, and uses only explicit student availability", () => {
  const profile = logic.extractCvProfile(anonymizedCv);
  const analysis = logic.matchJobToProfile({ title: "Servicekraft", summary: "Gästeservice und Unterstützung im Team." }, profile);
  const letter = logic.buildGermanCoverLetter({ role: "Servicekraft", company: "Beispielhotel", analysis, profile });
  assert.match(letter, /Bewerbung als Servicekraft bei Beispielhotel/);
  assert.match(letter, /Sehr geehrte Damen und Herren/);
  assert.match(letter, /Kunden- und Gästebetreuung/);
  assert.match(letter, /bis zu 20 Stunden pro Woche/);
  assert.match(letter, /Mit freundlichen Grüßen/);
  assert.doesNotMatch(letter, /Dear |Sincerely|my relevant experience/i);

  const withoutExplicitHours = logic.buildGermanCoverLetter({ role: "Küchenhilfe", company: "Musterbetrieb", analysis: {}, profile: { student: true, hoursPerWeekDuringSemester: null } });
  assert.match(withoutExplicitHours, /Da ich studiere/);
  assert.doesNotMatch(withoutExplicitHours, /0 Stunden|20 Stunden/);
});

test("freshness uses original publication time, caps at 14 days, and rejects missing, invalid, and future dates", () => {
  const daysAgo = (days) => new Date(FIXED_NOW - days * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(logic.isDateEligible({ publishedAtOriginal: daysAgo(14), modifiedAt: daysAgo(0) }, 90, FIXED_NOW), true);
  assert.equal(logic.isDateEligible({ publishedAtOriginal: daysAgo(14.01), modifiedAt: daysAgo(0) }, 90, FIXED_NOW), false);
  assert.equal(logic.isDateEligible({ modifiedAt: daysAgo(0) }, 14, FIXED_NOW), false);
  assert.equal(logic.isDateEligible({ publishedAtOriginal: "not-a-date", modifiedAt: daysAgo(0) }, 14, FIXED_NOW), false);
  assert.equal(logic.isDateEligible({ publishedAtOriginal: new Date(FIXED_NOW + 1000).toISOString() }, 14, FIXED_NOW), false);
  assert.equal(logic.isDateEligible({ publishedAtOriginal: daysAgo(2) }, 2, FIXED_NOW), true);
  assert.equal(logic.isDateEligible({ publishedAtOriginal: daysAgo(3) }, 2, FIXED_NOW), false);
});

test("radius eligibility never converts a missing distance to zero", () => {
  assert.equal(logic.parseDistanceKm(null), null);
  assert.equal(logic.parseDistanceKm(""), null);
  assert.equal(logic.isDistanceEligible(null, 30), false);
  assert.equal(logic.isDistanceEligible("not-a-number", 30), false);
  assert.equal(logic.isDistanceEligible(0, 30), true);
  assert.equal(logic.isDistanceEligible(30, 30), true);
  assert.equal(logic.isDistanceEligible(30.01, 30), false);
  assert.equal(logic.isDistanceEligible(null, 0), true);
});

test("freshness is prioritized within comparable compatibility bands, with exact recency as the tie-breaker", () => {
  const daysAgo = (days) => new Date(FIXED_NOW - days * 24 * 60 * 60 * 1000).toISOString();
  const jobs = [
    { id: "old", match: 61, publishedAtOriginal: daysAgo(10) },
    { id: "newer", match: 60, publishedAtOriginal: daysAgo(4) },
    { id: "fresh", match: 51, publishedAtOriginal: daysAgo(1) },
    { id: "high", match: 85, publishedAtOriginal: daysAgo(12) }
  ];
  jobs.sort((a, b) => logic.compareRank(a, b, FIXED_NOW));
  assert.deepEqual(jobs.map((job) => job.id), ["high", "fresh", "newer", "old"]);
});

(function attachJobRaderLogic(globalObject, createLogic) {
  const api = createLogic();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalObject.JobRaderJobLogic = api;
})(globalThis, function createLogic() {
  const MAX_FRESHNESS_DAYS = 14;
  const CITY_NAMES = [
    "Aachen", "Augsburg", "Berlin", "Bielefeld", "Bonn", "Bremen", "Darmstadt", "Dresden",
    "Duisburg", "Düsseldorf", "Erfurt", "Essen", "Frankfurt", "Freiburg", "Hamburg", "Hannover",
    "Heidelberg", "Ingolstadt", "Jena", "Karlsruhe", "Kassel", "Kiel", "Koblenz", "Köln", "Leipzig",
    "Magdeburg", "Mainz", "Mannheim", "München", "Münster", "Nürnberg", "Osnabrück", "Paderborn",
    "Potsdam", "Regensburg", "Rostock", "Saarbrücken", "Stuttgart", "Trier", "Ulm", "Wiesbaden", "Würzburg"
  ];
  const ADDRESS_POSTCODE_CITY_PREFIXES = { "040": "Leipzig", "041": "Leipzig", "042": "Leipzig", "043": "Leipzig" };
  const STREET_TYPE = "(?:straße|strasse|str\\.?|weg|platz|allee|ring|gasse|damm|chaussee|ufer)";
  const CATEGORIES = [
    {
      id: "service",
      query: ["Servicekraft", "waiter"],
      title: /\b(servicekraft|servicemitarbeiter(?:in)?|kellner(?:in)?|waiter|waitress|restaurant\s*(?:staff|mitarbeiter(?:in)?|service)|gastronomie|gastgewerbe|barista|bartender|gastgeber(?:in)?|host)\b/i
    },
    {
      id: "kitchen",
      query: ["Küchenhilfe", "kitchen assistant"],
      title: /\b(küche|kitchen|küchenhilfe|küchenhelfer(?:in)?|küchenkraft|spülkraft|spüler(?:in)?|dishwasher|dish\s*washer|kitchen\s*(?:assistant|helper|staff|porter|hand))\b/i
    },
    {
      id: "housekeeping",
      query: ["Housekeeping", "room attendant"],
      title: /\b(housekeeping|housekeeper|zimmermädchen|room\s*attendant|cleaner|reinigungskraft|reinigungskraft|cleaning\s*(?:staff|assistant))\b/i
    },
    {
      id: "warehouse",
      query: ["Lagerhelfer", "warehouse assistant"],
      title: /\b(warehouse|lager|logistik|paketsortierung|verpackung|lagermitarbeiter(?:in)?|lagerhelfer(?:in)?|kommissionierer(?:in)?|picker|packer|verpacker(?:in)?|paketsortierer(?:in)?|versandmitarbeiter(?:in)?|shipping\s*assistant|stock\s*room\s*(?:assistant|operative))\b/i
    },
    {
      id: "retail",
      query: ["Warenverräumung", "shelf stacker"],
      title: /\b(regal|warenverräum(?:ung|er(?:in)?)|verkäufer(?:in)?|verkaufskraft|warenverräumer(?:in)?|regal(?:auffüller|einräumer)(?:in)?|retail\s*(?:assistant|associate)|sales\s*assistant|merchandiser|shelf\s*stacker|store\s*assistant)\b/i
    },
    {
      id: "production",
      query: ["Produktionshelfer", "production worker"],
      title: /\b(produktion|produktionshelfer(?:in)?|produktionsmitarbeiter(?:in)?|production\s*(?:helper|worker|operative|assistant)|fertigungshelfer(?:in)?|montagehelfer(?:in)?|assembly\s*worker|packaging\s*operative)\b/i
    }
  ];
  const SKILLS = [
    { id: "customerCare", pattern: /\b(kundenbetreuung|kund(?:en)?kontakt|customer\s*(?:care|service|support)|guest\s*(?:service|support)|gäste(?:betreuung|service)|teilnehmende.*unterstützt|beratung)\b/i },
    { id: "eventSupport", pattern: /\b(veranstaltung(?:en)?|event(?:s)?|aktionsflächen|event\s*(?:setup|support|preparation)|aufgebaut|veranstaltungsvorbereitung)\b/i },
    { id: "materials", pattern: /\b(material(?:organisation|ien)?|bestände|bestand|inventory|stock\s*(?:control|management|taking)|sortiert|nachverfolgt|organisation)\b/i },
    { id: "teamwork", pattern: /\b(team(?:arbeit|abläufe)?|teamfähig|teamwork|collaboration|zusammenarbeit|aufgaben abgestimmt)\b/i },
    { id: "reliability", pattern: /\b(zuverlässig|pünktlich|reliable|punctual|sorgfältig|structured|strukturiert)\b/i }
  ];
  const CATEGORY_SKILLS = {
    service: ["customerCare", "eventSupport", "teamwork", "reliability"],
    kitchen: ["teamwork", "reliability", "materials"],
    housekeeping: ["reliability", "materials", "teamwork"],
    warehouse: ["materials", "teamwork", "reliability"],
    retail: ["customerCare", "materials", "teamwork", "reliability"],
    production: ["materials", "teamwork", "reliability"]
  };
  const SENIOR_OR_SPECIALIST_TITLE = /\b(senior|head|director|chief|manager|management|team\s*lead|lead|principal|specialist|consultant)\b/i;

  function clean(value) {
    return String(value || "").replace(/[\u00ad\u200b\ufeff]/g, "").replace(/\s+/g, " ").trim();
  }

  function normalizeWords(value) {
    return clean(value).toLocaleLowerCase("de-DE").replace(/[ä]/g, "ae").replace(/[ö]/g, "oe").replace(/[ü]/g, "ue").replace(/ß/g, "ss");
  }

  function parseAddress(value) {
    const original = String(value || "");
    const flattened = clean(original);
    const postcodeMatch = flattened.match(/\b(\d{5})\b/);
    const postcode = postcodeMatch?.[1] || "";
    const streetExpression = new RegExp(`\\b([\\p{L}][\\p{L}0-9.'’\\-]*(?:[\\s-]+[\\p{L}0-9.'’\\-]+){0,3}?${STREET_TYPE}\\s*\\d+[a-zA-Z]?)\\b`, "iu");
    const streetMatch = flattened.match(streetExpression);
    const streetAndNumber = clean(streetMatch?.[1] || "");
    const houseNumberMatch = streetAndNumber.match(/\b(\d+[a-zA-Z]?)$/);
    const houseNumber = houseNumberMatch?.[1] || "";
    const street = houseNumber ? clean(streetAndNumber.slice(0, -houseNumber.length)) : "";

    let city = "";
    if (street) {
      const beforeStreet = flattened.slice(0, flattened.indexOf(streetAndNumber));
      const label = beforeStreet.match(/\b([\p{L}][\p{L}-]{2,})\s*:\s*$/u);
      if (label && !/^(kontakt|contact|adresse|address)$/i.test(label[1])) {
        city = label[1];
      }
    }
    if (!city && postcode) {
      const afterPostcode = flattened.slice(flattened.indexOf(postcode) + postcode.length);
      const listedCity = CITY_NAMES.find((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(afterPostcode));
      city = listedCity || ADDRESS_POSTCODE_CITY_PREFIXES[postcode.slice(0, 3)] || "";
    }
    if (!city) {
      city = CITY_NAMES.find((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(flattened)) || "";
    }

    const hasStreetAddress = Boolean(street && houseNumber);
    const query = [streetAndNumber, [postcode, city].filter(Boolean).join(" "), "Germany"].filter(Boolean).join(", ");
    return {
      street,
      houseNumber,
      postcode,
      city,
      country: /\b(germany|deutschland)\b/i.test(flattened) ? "Germany" : (postcode || city ? "Germany" : ""),
      hasStreetAddress,
      query,
      precision: hasStreetAddress && postcode && city ? "address" : postcode ? "postcode" : city ? "city" : "unknown"
    };
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractCvProfile(text) {
    const cvText = String(text || "");
    const categories = CATEGORIES.filter((category) => category.title.test(cvText)).map((category) => category.id);
    const skills = SKILLS.filter((skill) => skill.pattern.test(cvText)).map((skill) => skill.id);
    const languages = {};
    const languagePatterns = [
      ["german", /\b(?:deutsch|german)(?:kenntnisse|e)?\s*[:\-]?\s*(?:niveau\s*)?(a1|a2|b1|b2|c1|c2)\b|\b(a1|a2|b1|b2|c1|c2)\s*[-–—]\s*(?:fließend|fliessend|fluent)\b[^\n]{0,24}\b(?:deutsch|german)\b/i],
      ["english", /\b(?:englisch|english)(?:kenntnisse|e)?\s*[:\-]?\s*(?:level\s*)?(a1|a2|b1|b2|c1|c2)\b|\b(a1|a2|b1|b2|c1|c2)\s*[-–—]\s*(?:fließend|fliessend|fluent)\b[^\n]{0,24}\b(?:englisch|english)\b/i]
    ];
    for (const [language, pattern] of languagePatterns) {
      const match = cvText.match(pattern);
      const level = match?.[1] || match?.[2] || "";
      if (level) {
        languages[language] = level.toUpperCase();
      }
    }

    const qualifications = [];
    if (/\b(b\.?\s*sc\.?|bachelor(?:'s)?|baccalaureate)\b/i.test(cvText)) {
      qualifications.push("bachelor degree");
    }
    if (/\b(m\.?\s*sc\.?|master(?:'s)?)\b/i.test(cvText)) {
      qualifications.push("master degree");
    }
    if (/\b(ausbildung|apprenticeship|vocational qualification|berufsausbildung)\b/i.test(cvText)) {
      qualifications.push("vocational qualification");
    }
    if (/\b(führerschein|fuehrerschein|driving licen[cs]e|fahrerlaubnis|klasse b|class b)\b/i.test(cvText)) {
      qualifications.push("driving licence mentioned");
    }

    const hoursSemester = cvText.match(/(?:vorlesungszeit|semester)[^\n]{0,70}?\b(\d{1,2})\s*(?:stunden|std\.?|hrs?)\s*(?:\/|pro|per)\s*woche/i);
    const hoursBreak = cvText.match(/(?:vorlesungsfrei|semesterferien|lecture[- ]free)[^\n]{0,70}?\b(\d{1,2})\s*(?:stunden|std\.?|hrs?)\s*(?:\/|pro|per)\s*woche/i);
    const student = /\b(student(?:in)?|studierende|studium|university student)\b/i.test(cvText);
    const address = parseAddress(cvText);
    const directCategoryText = (cvText.match(/(?:berufserfahrung|work experience|professional experience)([\s\S]{0,1600}?)(?:zielpositionen|target roles|studium|education|sprachen|languages)/i) || [])[1] || "";
    const directCategories = CATEGORIES.filter((category) => category.title.test(directCategoryText)).map((category) => category.id);
    return {
      categories,
      directCategories,
      skills,
      languages,
      qualifications,
      student,
      hoursPerWeekDuringSemester: hoursSemester ? Number(hoursSemester[1]) : null,
      hoursPerWeekDuringBreak: hoursBreak ? Number(hoursBreak[1]) : null,
      address: address.precision === "unknown" ? null : address,
      evidence: {
        customerCare: skills.includes("customerCare"),
        eventSupport: skills.includes("eventSupport"),
        materialsOrganization: skills.includes("materials"),
        teamwork: skills.includes("teamwork"),
        reliability: skills.includes("reliability")
      }
    };
  }

  function getCvSearchQueries(textOrProfile) {
    const profile = typeof textOrProfile === "string" ? extractCvProfile(textOrProfile) : textOrProfile;
    const queries = [];
    for (const category of CATEGORIES) {
      if (profile?.categories?.includes(category.id)) {
        queries.push(...category.query);
      }
    }
    return [...new Set(queries)].slice(0, 12);
  }

  function categoriesForTitle(title) {
    const value = String(title || "");
    const matches = CATEGORIES.filter((category) => category.title.test(value)).map((category) => category.id);
    const explicitServiceRole = /\b(servicekraft|servicemitarbeiter(?:in)?|kellner(?:in)?|waiter|waitress|barista|bartender|gastgeber(?:in)?|host)\b/i.test(value);
    return matches.includes("kitchen") && !explicitServiceRole ? matches.filter((category) => category !== "service") : matches;
  }

  function detectMandatoryIssues(profile, jobText) {
    const text = String(jobText || "");
    const normalized = normalizeWords(text);
    const issues = [];
    const requiredPattern = /\b(required|must(?: have)?|mandatory|voraussetzung|vorausgesetzt|zwingend|erforderlich|notwendig|muss)\b/i;
    const germanLevel = normalized.match(/(?:deutsch|german)[^\n]{0,55}\b(a1|a2|b1|b2|c1|c2)\b|\b(a1|a2|b1|b2|c1|c2)\b[^\n]{0,55}(?:deutsch|german)/i);
    const englishLevel = normalized.match(/(?:englisch|english)[^\n]{0,55}\b(a1|a2|b1|b2|c1|c2)\b|\b(a1|a2|b1|b2|c1|c2)\b[^\n]{0,55}(?:englisch|english)/i);
    for (const [language, match] of [["German", germanLevel], ["English", englishLevel]]) {
      if (!match) continue;
      const level = (match[1] || match[2]).toUpperCase();
      const candidateLevel = profile.languages?.[language.toLowerCase()];
      const clause = text.slice(Math.max(0, match.index - 35), Math.min(text.length, match.index + match[0].length + 55));
      if (requiredPattern.test(clause) && (!candidateLevel || candidateLevel.localeCompare(level, undefined, { sensitivity: "base" }) < 0)) {
        issues.push(`${language} ${level} required; CV shows ${candidateLevel || "no verified level"}`);
      }
    }

    const licenseRequired = /(?:führerschein|fuehrerschein|driving licen[cs]e|fahrerlaubnis|forklift|gabelstapler|staplerschein)[^.!?\n]{0,90}(?:required|must|mandatory|voraussetzung|zwingend|erforderlich|notwendig|muss)|(?:required|must|mandatory|voraussetzung|zwingend|erforderlich|notwendig|muss)[^.!?\n]{0,90}(?:führerschein|fuehrerschein|driving licen[cs]e|fahrerlaubnis|forklift|gabelstapler|staplerschein)/i;
    const candidateHasLicense = (profile.qualifications || []).some((item) => item.includes("licence"));
    if (licenseRequired.test(text) && !candidateHasLicense) {
      issues.push("A required driving or equipment licence is not verified in the CV");
    }

    const formalTrainingRequired = /(?:ausbildung|apprenticeship|vocational|berufsausbildung|degree|abschluss)[^.!?\n]{0,90}(?:required|must|mandatory|voraussetzung|zwingend|erforderlich|notwendig|muss)|(?:required|must|mandatory|voraussetzung|zwingend|erforderlich|notwendig|muss)[^.!?\n]{0,90}(?:ausbildung|apprenticeship|vocational|berufsausbildung|degree|abschluss)/i;
    const relevantTraining = (profile.qualifications || []).includes("vocational qualification");
    if (formalTrainingRequired.test(text) && !relevantTraining) {
      issues.push("A mandatory vocational qualification is not verified in the CV");
    }
    return issues;
  }

  function matchJobToProfile(job, profile) {
    const title = String(job?.title || "");
    const jobText = `${title} ${job?.summary || ""} ${job?.description || ""} ${(job?.tags || []).join(" ")}`;
    const jobCategories = categoriesForTitle(title);
    const matchingCategories = jobCategories.filter((category) => profile?.categories?.includes(category));
    const seniorTitle = SENIOR_OR_SPECIALIST_TITLE.test(title);
    const roleAligned = !seniorTitle && matchingCategories.length > 0;
    const requiredIssues = detectMandatoryIssues(profile || {}, jobText);
    if (!profile || !roleAligned) {
      return {
        match: 0,
        strengths: [],
        missing: seniorTitle ? ["Role is senior, management, or specialist-level and is not supported by the CV"] : ["Job title does not match a CV-supported target category"],
        recommendations: [],
        roleAligned: false,
        titleAligned: false,
        evidenceCount: 0,
        mandatoryIssues: requiredIssues
      };
    }

    const matchedCategory = matchingCategories[0];
    const cvSkills = new Set(profile.skills || []);
    const categorySkills = CATEGORY_SKILLS[matchedCategory] || [];
    const text = normalizeWords(jobText);
    const evidenceRules = {
      customerCare: /customer|client|guest|gaeste|kunden|beratung|teilnehm|support|hospitality/.test(text),
      eventSupport: /event|veranstaltung|aktionsflaechen|event\s*(?:setup|support|preparation)/.test(text),
      materials: /material|bestand|stock|inventory|sort|lager|warehouse|pack|verpack|logistik|versand|waren|production|produktion/.test(text),
      teamwork: /team|kolleg|zusammenarbeit|collaborat/.test(text),
      reliability: /zuverlass|reliable|punctual|sorgfaeltig|belastbar|structured|sicher/.test(text)
    };
    const matchedSkills = categorySkills.filter((skill) => cvSkills.has(skill) && evidenceRules[skill]);
    const strengths = [];
    const strengthLabels = {
      customerCare: "Customer care / participant support experience",
      eventSupport: "Event preparation and on-site support",
      materials: "Materials and stock organization",
      teamwork: "Teamwork and coordinated operations",
      reliability: "Reliability and careful work"
    };
    for (const skill of matchedSkills) strengths.push(strengthLabels[skill]);
    strengths.unshift(`CV target category: ${matchedCategory}`);

    const directExperience = (profile.directCategories || []).includes(matchedCategory);
    const rolePoints = directExperience ? 30 : 18;
    const skillPoints = Math.min(30, matchedSkills.reduce((sum, skill) => sum + ({ customerCare: 10, eventSupport: 9, materials: 10, teamwork: 5, reliability: 5 }[skill] || 0), 0));
    const experiencePoints = directExperience ? 15 : Math.min(12, matchedSkills.filter((skill) => skill === "customerCare" || skill === "materials" || skill === "eventSupport").length * 5);

    const hasMandatoryTraining = /(?:ausbildung|apprenticeship|vocational|berufsausbildung|degree|abschluss)[^.!?\n]{0,90}(?:required|must|mandatory|voraussetzung|zwingend|erforderlich|notwendig|muss)|(?:required|must|mandatory|voraussetzung|zwingend|erforderlich|notwendig|muss)[^.!?\n]{0,90}(?:ausbildung|apprenticeship|vocational|berufsausbildung|degree|abschluss)/i.test(jobText);
    const qualificationPoints = hasMandatoryTraining ? (profile.qualifications?.includes("vocational qualification") ? 15 : 0) : 12;
    const languageMentioned = /\b(deutsch|german|englisch|english|language|sprache)\b/i.test(jobText);
    const mandatoryLanguageIssue = requiredIssues.some((issue) => /\b(German|English)\s+[A-C][12]\b/.test(issue));
    const languagePoints = mandatoryLanguageIssue ? 0 : languageMentioned ? 15 : 10;
    const partTimeRole = /\b(teilzeit|part[\s-]?time|minijob|mini[\s-]?job|student(?:en)?job|working student)\b/i.test(`${title} ${jobText}`);
    const availabilityPoints = partTimeRole && profile.student ? 3 : 0;
    let score = Math.min(100, rolePoints + skillPoints + experiencePoints + qualificationPoints + languagePoints + availabilityPoints);
    if (requiredIssues.length) score = Math.min(score, 84);

    const missing = [];
    if (!matchedSkills.includes("customerCare") && ["service", "retail"].includes(matchedCategory)) missing.push("No customer-facing experience evidence in the CV");
    if (!matchedSkills.includes("materials") && ["warehouse", "production", "housekeeping", "kitchen"].includes(matchedCategory)) missing.push("No directly matching materials, stock, or task evidence in the CV");
    missing.push(...requiredIssues);
    if (!languageMentioned) missing.push("The vacancy does not specify a language requirement");
    if (!directExperience) missing.push("No direct experience in this exact job category is listed");
    return {
      match: score,
      strengths: [...new Set(strengths)].slice(0, 8),
      missing: [...new Set(missing)].slice(0, 10),
      recommendations: requiredIssues.length ? ["Check the mandatory eligibility requirement before applying"] : [],
      roleAligned: true,
      titleAligned: true,
      evidenceCount: matchedSkills.length + (directExperience ? 1 : 0) + 1,
      mandatoryIssues: requiredIssues,
      matchedCategory
    };
  }

  function extractPdfPageLines(items) {
    const positioned = (items || []).filter((item) => String(item.str || "").trim()).map((item) => ({
      text: String(item.str || "").trim(),
      x: Number(item.transform?.[4]),
      y: Number(item.transform?.[5]),
      width: Number(item.width)
    }));
    if (!positioned.length) return [];
    if (positioned.some((item) => !Number.isFinite(item.x) || !Number.isFinite(item.y))) {
      return [positioned.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim()];
    }

    positioned.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const item of positioned) {
      let row = rows[rows.length - 1];
      if (!row || Math.abs(row.y - item.y) > 3.5) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    }

    return rows.flatMap((row) => {
      const ordered = row.items.sort((a, b) => a.x - b.x);
      const segments = [];
      let segment = [];
      let previousRight = null;
      for (const item of ordered) {
        if (segment.length && previousRight !== null && item.x - previousRight > 45) {
          segments.push(segment.join(" ").replace(/\s+/g, " ").trim());
          segment = [];
        }
        segment.push(item.text);
        const width = Number.isFinite(item.width) && item.width > 0 ? item.width : item.text.length * 3;
        previousRight = Math.max(previousRight ?? item.x, item.x + width);
      }
      if (segment.length) segments.push(segment.join(" ").replace(/\s+/g, " ").trim());
      return segments.filter(Boolean);
    });
  }

  function parseDistanceKm(value) {
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function isDistanceEligible(value, radiusKm) {
    const radius = Number(radiusKm);
    if (!Number.isFinite(radius) || radius <= 0) return true;
    const distance = parseDistanceKm(value);
    return distance !== null && distance <= radius;
  }

  function originalPublicationDate(job) {
    return job?.publishedAtOriginal || job?.originalPublishedAt || job?.postedAt || null;
  }

  function isDateEligible(valueOrJob, days = MAX_FRESHNESS_DAYS, now = Date.now()) {
    const value = typeof valueOrJob === "object" && valueOrJob !== null ? originalPublicationDate(valueOrJob) : valueOrJob;
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    const current = typeof now === "number" ? now : new Date(now).getTime();
    if (!Number.isFinite(timestamp) || !Number.isFinite(current)) return false;
    const limit = Math.min(MAX_FRESHNESS_DAYS, Math.max(1, Number(days) || MAX_FRESHNESS_DAYS));
    const age = current - timestamp;
    return age >= 0 && age <= limit * 24 * 60 * 60 * 1000;
  }

  function freshnessBand(value, now = Date.now()) {
    const timestamp = new Date(value || "").getTime();
    const current = typeof now === "number" ? now : new Date(now).getTime();
    if (!Number.isFinite(timestamp) || !Number.isFinite(current) || timestamp > current) return 3;
    const ageDays = (current - timestamp) / (24 * 60 * 60 * 1000);
    return ageDays <= 2 ? 0 : ageDays <= 7 ? 1 : ageDays <= MAX_FRESHNESS_DAYS ? 2 : 3;
  }

  function suitabilityBand(score) {
    const value = Number(score);
    if (!Number.isFinite(value)) return -1;
    if (value >= 85) return 4;
    if (value >= 70) return 3;
    if (value >= 50) return 2;
    if (value > 0) return 1;
    return 0;
  }

  function compareRank(a, b, now = Date.now()) {
    const suitabilityDiff = suitabilityBand(b.match) - suitabilityBand(a.match);
    if (suitabilityDiff) return suitabilityDiff;
    const freshnessDiff = freshnessBand(originalPublicationDate(a), now) - freshnessBand(originalPublicationDate(b), now);
    if (freshnessDiff) return freshnessDiff;
    const scoreDiff = Number(b.match || 0) - Number(a.match || 0);
    if (scoreDiff) return scoreDiff;
    return new Date(originalPublicationDate(b) || 0) - new Date(originalPublicationDate(a) || 0);
  }

  return Object.freeze({
    MAX_FRESHNESS_DAYS,
    CATEGORIES,
    clean,
    parseAddress,
    extractCvProfile,
    extractPdfPageLines,
    getCvSearchQueries,
    categoriesForTitle,
    detectMandatoryIssues,
    matchJobToProfile,
    parseDistanceKm,
    isDistanceEligible,
    originalPublicationDate,
    isDateEligible,
    freshnessBand,
    suitabilityBand,
    compareRank
  });
});

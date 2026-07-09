const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function assertEmptyArray(value) {
  assert.equal(Array.isArray(value), true);
  assert.equal(value.length, 0);
}

function createStorage(backing = {}) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(backing, key) ? backing[key] : null;
    },
    setItem(key, value) {
      backing[key] = String(value);
    },
    removeItem(key) {
      delete backing[key];
    },
    clear() {
      for (const key of Object.keys(backing)) delete backing[key];
    },
    dump() {
      return { ...backing };
    }
  };
}

function createElement() {
  return {
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    innerHTML: "",
    textContent: "",
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    appendChild() {},
    append() {},
    closest() { return null; },
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    showModal() {},
    close() {},
    focus() {},
    reset() {}
  };
}

function loadCore({ standalone = false, backing = {} } = {}) {
  let uuid = 0;
  const storage = createStorage(backing);
  const document = {
    documentElement: createElement(),
    body: createElement(),
    title: "",
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    getElementById() { return createElement(); },
    createElement() { return createElement(); }
  };
  const navigator = {
    standalone,
    serviceWorker: undefined,
    canShare() { return false; },
    share: async () => {}
  };
  const windowObject = {
    document,
    navigator,
    localStorage: storage,
    location: { hash: "", search: "" },
    matchMedia(query) {
      return {
        matches: standalone && /standalone|fullscreen|minimal-ui/.test(query),
        addEventListener() {},
        removeEventListener() {}
      };
    },
    addEventListener() {},
    removeEventListener() {},
    alert() {},
    confirm() { return true; },
    open() { return null; }
  };

  const sandbox = {
    Blob,
    Date,
    File: typeof File === "undefined" ? class File extends Blob {} : File,
    Intl,
    URLSearchParams,
    console,
    crypto: { randomUUID: () => `test-id-${++uuid}` },
    document,
    localStorage: storage,
    location: windowObject.location,
    navigator,
    window: windowObject,
    setTimeout,
    clearTimeout
  };

  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  new vm.Script(source, { filename: "app.js" }).runInContext(sandbox);
  return { core: sandbox.window.StudentControlCenterCore, storage, backing };
}

test("starts with empty public data and no hardcoded personal details", () => {
  const { core } = loadCore();
  const data = core.getEmptyAppData();
  assert.equal(data.version, "2.0.0");
  assertEmptyArray(data.jobs);
  assertEmptyArray(data.shifts);
  assertEmptyArray(data.payslips);
  assertEmptyArray(data.workingTimeAccounts);
  assertEmptyArray(data.transactions);
  assertEmptyArray(data.scholarships);
  assertEmptyArray(data.academicEvents);
  assertEmptyArray(data.permitItems);
  assert.equal(data.settings.weeklyLimitHours, 20);
  assert.equal(data.settings.yearlyDayLimit, 140);
  assert.equal(data.settings.monthlyBudget, 0);
  assert.equal(data.settings.currency, "EUR");
  assert.equal(data.settings.appName, "Student Control Center");
  assert.equal(data.settings.countryMode, "custom");
  assert.equal(data.settings.locale, "en");
  const forbidden = new RegExp([
    ["Hil", "lary"].join(""),
    ["Base", "44"].join(""),
    ["Malen", "go"].join(""),
    ["Per", "fekt"].join(""),
    ["Leh", "rieder"].join(""),
    ["Uga", "nda"].join(""),
    ["F", "AU"].join("")
  ].join("|"), "i");
  assert.doesNotMatch(JSON.stringify(data), forbidden);
});

test("preserves imported data while normalizing and deduplicating ledgers", () => {
  const { core } = loadCore();
  const imported = core.validateAndNormalizeAppData({
    version: "1.0.0",
    settings: { weeklyLimit: 18, currency: "usd", ectsCompleted: 42 },
    jobs: [{ id: "job-1", name: "Library Assistant", employerName: "Campus Library", hourlyWageGross: 15 }],
    shifts: [
      { jobId: "job-1", date: "2026-07-06", start: "09:00", end: "13:00", breakMinutes: 0 },
      { jobId: "job-1", date: "2026-07-06", start: "09:00", end: "13:00", breakMinutes: 0 }
    ],
    payslips: [
      { jobId: "job-1", payrollMonth: "2026-07", grossPaid: 60, netPaid: 50 },
      { jobId: "job-1", payrollMonth: "2026-07", grossPaid: 60, netPaid: 50 }
    ],
    transactions: [
      { date: "2026-07-30", amount: 50, description: "salary", kind: "income", linkedJobId: "job-1" },
      { date: "2026-07-30", amount: 50, description: "salary", kind: "income", linkedJobId: "job-1" }
    ]
  });

  assert.equal(imported.settings.weeklyLimitHours, 18);
  assert.equal(imported.settings.currency, "USD");
  assert.equal(imported.settings.ectsCompleted, 42);
  assert.equal(imported.jobs.length, 1);
  assert.equal(imported.shifts.length, 1);
  assert.equal(imported.payslips.length, 1);
  assert.equal(imported.transactions.length, 1);
});

test("keeps browser storage separate from installed PWA storage", () => {
  const backing = {};
  const browser = loadCore({ standalone: false, backing });
  const browserKey = browser.core.getStorageKey();
  const installed = loadCore({ standalone: true, backing });
  const installedKey = installed.core.getStorageKey();

  assert.match(browserKey, /:browser:/);
  assert.match(installedKey, /:installed:/);
  assert.notEqual(browserKey, installedKey);
  assert.equal(browser.core.shouldShowInstallButton(true), true);
  assert.equal(installed.core.shouldShowInstallButton(true), false);
});

test("calculates banked hours per job and respects employer-confirmed values", () => {
  const { core } = loadCore();
  const data = core.validateAndNormalizeAppData({
    jobs: [
      { id: "job-1", name: "Job One", weeklyLimitHours: 20, hourlyWageGross: 12 },
      { id: "job-2", name: "Job Two", weeklyLimitHours: 10, hourlyWageGross: 10 }
    ],
    shifts: [
      { jobId: "job-1", date: "2026-07-06", workedMinutes: 900 },
      { jobId: "job-1", date: "2026-07-07", workedMinutes: 600 },
      { jobId: "job-2", date: "2026-07-06", workedMinutes: 660 }
    ],
    workingTimeAccounts: [
      { jobId: "job-1", manualCarryInOutHours: 1, compensatedHoursAlreadyTaken: 2 },
      { jobId: "job-2", employerConfirmedBankedHours: 7 }
    ]
  });

  assert.equal(core.calculateExtraHoursFromShifts("job-1", data), 5);
  assert.equal(core.calculateBankedHours("job-1", data), 4);
  assert.equal(core.calculateBankedHours("job-2", data), 7);
  assert.equal(core.calculateTotalBankedHours(data), 11);
});

test("separates expected gross, paid gross, paid net, unpaid gross, and bank income", () => {
  const { core } = loadCore();
  const data = core.validateAndNormalizeAppData({
    jobs: [{ id: "job-1", name: "Job One", hourlyWageGross: 20 }],
    shifts: [
      { jobId: "job-1", date: "2026-07-06", grossPayExpected: 100 },
      { jobId: "job-1", date: "2026-07-07", grossPayExpected: 50 }
    ],
    payslips: [{ jobId: "job-1", payrollMonth: "2026-07", grossPaid: 80, netPaid: 65 }],
    transactions: [{ date: "2026-07-31", kind: "income", amount: 65, linkedJobId: "job-1" }]
  });

  assert.equal(core.getExpectedGrossForJobMonth("job-1", "2026-07", data), 150);
  assert.equal(core.getPayslipGrossForJobMonth("job-1", "2026-07", data), 80);
  assert.equal(core.getPayslipNetForJobMonth("job-1", "2026-07", data), 65);
  assert.equal(core.getUnpaidGrossForJobMonth("job-1", "2026-07", data), 70);
  assert.equal(core.getActualBankIncomeForJobMonth("job-1", "2026-07", data), 65);
});

test("supports local AI answers and sharing links without an API key", () => {
  const { core } = loadCore();
  const data = core.validateAndNormalizeAppData({
    jobs: [{ id: "job-1", name: "Lab Assistant", employerName: "University Lab", hourlyWageGross: 13 }],
    shifts: [{ jobId: "job-1", date: "2026-07-06", workedMinutes: 300 }],
    scholarships: [{ name: "Study Grant", provider: "Foundation", expectedMonthlyAmount: undefined, currency: "EUR" }]
  });

  assert.match(core.answerFromLocalData("which jobs do I have?", data), /University Lab/);
  assert.match(core.answerFromLocalData("scholarship", data), /Foundation/);
  assert.equal(core.createLedgerTitle({ name: "Lab Assistant", employerName: "University Lab" }, "2026-07"), "Shift Ledger - University Lab - 2026-07");
  assert.match(core.createEmailShareLink("Shift Ledger", "body text"), /^mailto:\?subject=Shift%20Ledger&body=body%20text$/);
  assert.match(core.createWhatsAppShareLink("hello world"), /^https:\/\/wa\.me\/\?text=hello%20world$/);
});

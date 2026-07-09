const APP_NAME = "SPEND WISE-HILLARY 21";
const STATE_KEY = "swh21.state.v1";
const LANGUAGE_KEY = "swh21.language";
const THEME_KEY = "swh21.theme";
const CURRENCY = "EUR";
const CATEGORY_DEFAULTS = ["Rent", "Food", "Transport", "Insurance", "Tuition", "Health", "Study", "Income", "Other"];
const JOB_TYPES = ["Part-time", "Mini job", "Full-time", "Student assistant", "Internship", "Other"];
const MONEY_KINDS = ["expense", "income"];

const TRANSLATIONS = {
  en: {
    navDashboard: "Dashboard", navWork: "Work Tracker", navFinance: "Finance", navScholarships: "Scholarships", navPermit: "Residence Permit", navCalendar: "Calendar Sync", navSettings: "Settings",
    workspace: "Student control center", language: "Language", theme: "Theme", light: "Light", dark: "Dark", installApp: "Install App", privateStorage: "Private local storage",
    dashboardTitle: "Legal, money, study, and permit overview", dashboardSub: "Know what is safe this week and what needs attention next.", workCompliance: "Work compliance", open: "Open", financeSnapshot: "Finance snapshot", nextDeadlines: "Next deadlines", sync: "Sync", permitReadiness: "Residence permit readiness",
    workTitle: "Work compliance tracker", workSub: "Breaks are excluded automatically. Extra hours above the weekly limit are banked.", addShift: "Add Shift", workingTimeAccount: "Working time account", manualCarry: "Manual carry-in/out hours", compensatedHours: "Compensated hours already taken", bankedExtra: "Banked extra hours", shiftLedger: "Shift ledger",
    financeTitle: "Finance and expense tracker", financeSub: "Log income and expenses in euros with fast categories.", addTransaction: "Add Transaction", moneyLedger: "Money ledger",
    scholarshipTitle: "Scholarship and academic monitoring", scholarshipSub: "Track funding, renewal dates, and ECTS progress before there is a problem.", addScholarship: "Add Scholarship", ectsProgress: "ECTS progress", ectsSub: "Set the target for your program and update completed credits.", ectsCompleted: "ECTS completed", ectsTarget: "ECTS target", progress: "Progress", academicDates: "Academic dates", addAcademicDate: "Add Academic Date",
    permitTitle: "Residence permit checklist", permitSub: "Prepare documents, appointment dates, and proof before renewal.", addPermitItem: "Add Item", appointmentDate: "Appointment date", permitExpiry: "Permit expiry", readiness: "Readiness",
    calendarTitle: "Google Calendar sync", calendarSub: "Add shifts, visa appointments, scholarship deadlines, and academic dates to your phone calendar.", downloadIcs: "Download Calendar File", calendarEvents: "Calendar events", googleReady: "Google links ready",
    settingsTitle: "Settings and job wages", settingsSub: "Set limits, wages, and private data controls.", addJob: "Add Job", complianceSettings: "Compliance settings", weeklyLimit: "Weekly lecture-period limit", yearlyDayLimit: "Yearly full-day limit", monthlyBudget: "Monthly budget", jobWages: "Jobs and hourly wages", autoPay: "Auto pay enabled", dataControls: "Data controls", exportData: "Export Data", importData: "Import Data", resetData: "Reset App Data", dataNote: "Data stays in this browser unless you export it.",
    date: "Date", job: "Job", type: "Type", time: "Time", break: "Break", worked: "Worked", wage: "Wage", expectedPay: "Expected money", actions: "Actions", exportCsv: "Export CSV", description: "Description", category: "Category", kind: "Kind", amount: "Amount", cancel: "Cancel", save: "Save",
    installable: "Installable app", installTitle: "Install SPEND WISE-HILLARY 21", installAndroid: "Open in Chrome, tap the browser menu, then choose Install app or Add to Home screen.", installIphone: "Open in Safari, tap Share, then choose Add to Home Screen.", installLaptop: "Open in Chrome or Edge and use the install icon in the address bar or browser menu."
  },
  de: {
    navDashboard: "Dashboard", navWork: "Arbeitszeit", navFinance: "Finanzen", navScholarships: "Stipendien", navPermit: "Aufenthaltstitel", navCalendar: "Kalender", navSettings: "Einstellungen",
    workspace: "Studentisches Kontrollzentrum", language: "Sprache", theme: "Design", light: "Hell", dark: "Dunkel", installApp: "App installieren", privateStorage: "Private lokale Speicherung",
    dashboardTitle: "Recht, Geld, Studium und Aufenthalt", workCompliance: "Arbeitszeit-Compliance", financeSnapshot: "Finanzuebersicht", nextDeadlines: "Naechste Fristen", permitReadiness: "Aufenthaltstitel-Bereitschaft",
    workTitle: "Arbeitszeit-Tracker", addShift: "Schicht hinzufuegen", workingTimeAccount: "Arbeitszeitkonto", manualCarry: "Manuelle Stundenkorrektur", compensatedHours: "Ausgeglichene Stunden", bankedExtra: "Gespeicherte Mehrstunden", financeTitle: "Finanz- und Ausgabentracker", addTransaction: "Buchung hinzufuegen",
    scholarshipTitle: "Stipendien und ECTS", addScholarship: "Stipendium hinzufuegen", academicDates: "Akademische Termine", addAcademicDate: "Termin hinzufuegen", permitTitle: "Checkliste Aufenthaltstitel", addPermitItem: "Element hinzufuegen", calendarTitle: "Google Kalender", settingsTitle: "Einstellungen und Stundenloehne",
    date: "Datum", job: "Job", type: "Typ", time: "Zeit", break: "Pause", worked: "Gearbeitet", wage: "Lohn", expectedPay: "Erwartetes Geld", actions: "Aktionen", save: "Speichern", cancel: "Abbrechen"
  },
  fr: { navDashboard: "Tableau", navWork: "Travail", navFinance: "Finance", navScholarships: "Bourses", navPermit: "Sejour", navCalendar: "Calendrier", navSettings: "Parametres", language: "Langue", theme: "Theme", installApp: "Installer", save: "Enregistrer", cancel: "Annuler" },
  zh: { navDashboard: "仪表板", navWork: "工作", navFinance: "财务", navScholarships: "奖学金", navPermit: "居留许可", navCalendar: "日历", navSettings: "设置", language: "语言", theme: "主题", installApp: "安装应用", save: "保存", cancel: "取消" },
  sw: { navDashboard: "Dashibodi", navWork: "Kazi", navFinance: "Fedha", navScholarships: "Ufadhili", navPermit: "Kibali", navCalendar: "Kalenda", navSettings: "Mipangilio", language: "Lugha", theme: "Mandhari", installApp: "Sakinisha", save: "Hifadhi", cancel: "Ghairi" },
  hi: { navDashboard: "डैशबोर्ड", navWork: "काम", navFinance: "वित्त", navScholarships: "छात्रवृत्ति", navPermit: "निवास परमिट", navCalendar: "कैलेंडर", navSettings: "सेटिंग", language: "भाषा", theme: "थीम", installApp: "इंस्टॉल", save: "सेव", cancel: "रद्द" },
  pt: { navDashboard: "Painel", navWork: "Trabalho", navFinance: "Financas", navScholarships: "Bolsas", navPermit: "Residencia", navCalendar: "Calendario", navSettings: "Definicoes", language: "Idioma", theme: "Tema", installApp: "Instalar", save: "Salvar", cancel: "Cancelar" },
  ar: { navDashboard: "لوحة التحكم", navWork: "العمل", navFinance: "المال", navScholarships: "المنح", navPermit: "الإقامة", navCalendar: "التقويم", navSettings: "الإعدادات", language: "اللغة", theme: "النمط", installApp: "تثبيت", save: "حفظ", cancel: "إلغاء" }
};

const LANGUAGE_META = {
  en: { htmlLang: "en", dir: "ltr" },
  de: { htmlLang: "de", dir: "ltr" },
  fr: { htmlLang: "fr", dir: "ltr" },
  zh: { htmlLang: "zh", dir: "ltr" },
  sw: { htmlLang: "sw", dir: "ltr" },
  hi: { htmlLang: "hi", dir: "ltr" },
  pt: { htmlLang: "pt", dir: "ltr" },
  ar: { htmlLang: "ar", dir: "rtl" }
};

let state = loadState();
let currentLanguage = loadPreference(LANGUAGE_KEY, "en");
let currentTheme = loadPreference(THEME_KEY, "light");
let currentDialog = null;
let deferredInstallPrompt = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  document.title = APP_NAME;
  applyPreferences();
  applyTranslations();
  bindNavigation();
  bindControls();
  bindInstall();
  registerServiceWorker();
  renderAll();
  showRoute(initialRoute());
});

function defaultState() {
  return {
    settings: {
      weeklyLimit: 20,
      yearlyDayLimit: 140,
      monthlyBudget: 950,
      manualTimeCarry: 0,
      compensatedHours: 0,
      ectsCompleted: 42,
      ectsTarget: 180,
      permitAppointment: "",
      permitExpiry: ""
    },
    jobs: [
      { id: crypto.randomUUID(), name: "Part-time job", type: "Part-time", wage: 13.5 },
      { id: crypto.randomUUID(), name: "Mini job", type: "Mini job", wage: 13.5 },
      { id: crypto.randomUUID(), name: "Student assistant", type: "Student assistant", wage: 14.5 }
    ],
    shifts: [],
    transactions: [],
    scholarships: [],
    academicEvents: [],
    permitItems: [
      { id: crypto.randomUUID(), name: "Valid passport", status: "missing", dueDate: "", notes: "" },
      { id: crypto.randomUUID(), name: "Biometric photo", status: "missing", dueDate: "", notes: "" },
      { id: crypto.randomUUID(), name: "Enrollment certificate", status: "missing", dueDate: "", notes: "" },
      { id: crypto.randomUUID(), name: "Proof of health insurance", status: "missing", dueDate: "", notes: "" },
      { id: crypto.randomUUID(), name: "Proof of finances / blocked account", status: "missing", dueDate: "", notes: "" },
      { id: crypto.randomUUID(), name: "Rental contract or address registration", status: "missing", dueDate: "", notes: "" }
    ]
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
    return saved ? mergeState(defaultState(), saved) : defaultState();
  } catch {
    return defaultState();
  }
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    settings: { ...base.settings, ...(saved.settings || {}) },
    jobs: saved.jobs?.length ? saved.jobs : base.jobs,
    shifts: saved.shifts || [],
    transactions: saved.transactions || [],
    scholarships: saved.scholarships || [],
    academicEvents: saved.academicEvents || [],
    permitItems: saved.permitItems?.length ? saved.permitItems : base.permitItems
  };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadPreference(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function t(key, vars = {}) {
  const template = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function applyPreferences() {
  const meta = LANGUAGE_META[currentLanguage] || LANGUAGE_META.en;
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dir = meta.dir;
  document.documentElement.dataset.theme = currentTheme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = currentTheme === "dark" ? "#101816" : "#123c38";
  }
}

function applyTranslations() {
  $$("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  $("#languageSelect").value = currentLanguage;
  $("#themeSelect").value = currentTheme;
  $("#pageTitle").textContent = t(routeTitleKey(currentRoute()));
}

function bindNavigation() {
  $$(".nav-item, .brand").forEach((button) => {
    button.addEventListener("click", () => showRoute(button.dataset.route));
  });
  $$("[data-route-jump]").forEach((button) => {
    button.addEventListener("click", () => showRoute(button.dataset.routeJump));
  });
}

function showRoute(route) {
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.route === route));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${route}`));
  $("#pageTitle").textContent = t(routeTitleKey(route));
}

function currentRoute() {
  return $(".nav-item.active")?.dataset.route || "dashboard";
}

function initialRoute() {
  const route = new URLSearchParams(window.location.search).get("view");
  return ["dashboard", "work", "finance", "scholarships", "permit", "calendar", "settings"].includes(route) ? route : currentRoute();
}

function routeTitleKey(route) {
  return {
    dashboard: "navDashboard",
    work: "navWork",
    finance: "navFinance",
    scholarships: "navScholarships",
    permit: "navPermit",
    calendar: "navCalendar",
    settings: "navSettings"
  }[route] || "navDashboard";
}

function bindControls() {
  $("#languageSelect").addEventListener("change", (event) => {
    currentLanguage = event.target.value;
    savePreference(LANGUAGE_KEY, currentLanguage);
    applyPreferences();
    applyTranslations();
    renderAll();
  });
  $("#themeSelect").addEventListener("change", (event) => {
    currentTheme = event.target.value === "dark" ? "dark" : "light";
    savePreference(THEME_KEY, currentTheme);
    applyPreferences();
  });

  $("#addShiftButton").addEventListener("click", () => openShiftDialog());
  $("#addMoneyButton").addEventListener("click", () => openMoneyDialog());
  $("#addScholarshipButton").addEventListener("click", () => openScholarshipDialog());
  $("#addAcademicDateButton").addEventListener("click", () => openAcademicDialog());
  $("#addPermitItemButton").addEventListener("click", () => openPermitDialog());
  $("#addJobButton").addEventListener("click", () => openJobDialog());
  $("#entryForm").addEventListener("submit", handleDialogSubmit);

  $("#manualTimeCarry").addEventListener("input", updateSettingsFromInputs);
  $("#compensatedHours").addEventListener("input", updateSettingsFromInputs);
  $("#weeklyLimit").addEventListener("input", updateSettingsFromInputs);
  $("#yearlyDayLimit").addEventListener("input", updateSettingsFromInputs);
  $("#monthlyBudget").addEventListener("input", updateSettingsFromInputs);
  $("#ectsCompleted").addEventListener("input", updateSettingsFromInputs);
  $("#ectsTarget").addEventListener("input", updateSettingsFromInputs);
  $("#permitAppointment").addEventListener("input", updateSettingsFromInputs);
  $("#permitExpiry").addEventListener("input", updateSettingsFromInputs);

  $("#exportShiftsCsv").addEventListener("click", () => downloadCsv("spend-wise-shifts.csv", shiftCsvRows()));
  $("#exportMoneyCsv").addEventListener("click", () => downloadCsv("spend-wise-money.csv", moneyCsvRows()));
  $("#downloadIcsButton").addEventListener("click", downloadCalendarFile);
  $("#exportDataButton").addEventListener("click", exportData);
  $("#importDataButton").addEventListener("click", () => $("#importDataInput").click());
  $("#importDataInput").addEventListener("change", importData);
  $("#resetDataButton").addEventListener("click", resetData);
}

function bindInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });
  $("#installButton").addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return;
    }
    $("#installDialog").showModal();
  });
  $("#closeInstallDialog").addEventListener("click", () => $("#installDialog").close());
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function renderAll() {
  renderDashboard();
  renderWork();
  renderFinance();
  renderScholarships();
  renderPermit();
  renderCalendar();
  renderSettings();
}

function getAnalytics() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearlyShifts = state.shifts.filter((shift) => new Date(shift.date).getFullYear() === now.getFullYear());
  const weeklyShifts = state.shifts.filter((shift) => inRange(new Date(shift.date), weekStart, weekEnd));
  const monthlyTransactions = state.transactions.filter((item) => inRange(new Date(item.date), monthStart, monthEnd));
  const weeklyHours = sum(weeklyShifts.map((shift) => calculateShift(shift).workedHours));
  const yearlyDayUnits = sum(yearlyShifts.filter((shift) => shift.countsForVisa !== false).map((shift) => calculateShift(shift).dayUnit));
  const weeklyExtra = Math.max(0, weeklyHours - number(state.settings.weeklyLimit));
  const weekGroups = groupByWeek(state.shifts);
  const bankedFromWeeks = sum([...weekGroups.values()].map((shifts) => Math.max(0, sum(shifts.map((shift) => calculateShift(shift).workedHours)) - number(state.settings.weeklyLimit))));
  const bankedExtra = Math.max(0, bankedFromWeeks + number(state.settings.manualTimeCarry) - number(state.settings.compensatedHours));
  const expectedPay = sum(state.shifts.map((shift) => calculateShift(shift).pay));
  const monthIncome = sum(monthlyTransactions.filter((item) => item.kind === "income").map((item) => number(item.amount)));
  const monthExpenses = sum(monthlyTransactions.filter((item) => item.kind === "expense").map((item) => number(item.amount)));
  const workIncomeThisMonth = sum(state.shifts.filter((shift) => inRange(new Date(shift.date), monthStart, monthEnd)).map((shift) => calculateShift(shift).pay));
  const balance = monthIncome + workIncomeThisMonth - monthExpenses;
  return {
    weeklyHours,
    yearlyDayUnits,
    weeklyExtra,
    bankedExtra,
    expectedPay,
    monthIncome,
    monthExpenses,
    workIncomeThisMonth,
    balance,
    remainingWeekly: number(state.settings.weeklyLimit) - weeklyHours,
    remainingDays: number(state.settings.yearlyDayLimit) - yearlyDayUnits
  };
}

function renderDashboard() {
  const data = getAnalytics();
  $("#todayPill").textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  $("#metricGrid").innerHTML = [
    metric("Weekly hours", `${formatHours(data.weeklyHours)} h`, `${formatHours(Math.max(0, data.remainingWeekly))} h remaining`, data.remainingWeekly < 0 ? "status-danger" : "status-good"),
    metric("Working days", `${formatNumber(data.yearlyDayUnits)} / ${state.settings.yearlyDayLimit}`, "140 full-day annual rule", data.remainingDays < 0 ? "status-danger" : "status-good"),
    metric("Expected pay", formatMoney(data.expectedPay), "From logged work hours", "status-good"),
    metric("Month balance", formatMoney(data.balance), `${formatMoney(data.monthExpenses)} expenses`, data.balance < 0 ? "status-danger" : "status-good")
  ].join("");
  renderCompliancePanel(data);
  renderFinanceSnapshot(data);
  renderDeadlineList();
  renderPermitSummary();
}

function metric(label, value, sub, statusClass = "") {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong class="${statusClass}">${escapeHtml(value)}</strong><small>${escapeHtml(sub)}</small></article>`;
}

function renderCompliancePanel(data) {
  const percent = pct(data.weeklyHours, state.settings.weeklyLimit);
  const status = data.weeklyHours > state.settings.weeklyLimit ? "Over limit" : data.weeklyHours >= state.settings.weeklyLimit * 0.85 ? "Approaching limit" : "Safe";
  $("#weeklyComplianceBand").innerHTML = `<strong class="${data.weeklyHours > state.settings.weeklyLimit ? "status-danger" : "status-good"}">${escapeHtml(status)}</strong><p>${formatHours(data.weeklyHours)} of ${formatHours(state.settings.weeklyLimit)} hours this week. Breaks are excluded.</p>`;
  $("#complianceProgress").innerHTML = [
    progressRow("Weekly 20-hour model", percent, `${formatHours(data.weeklyHours)} / ${formatHours(state.settings.weeklyLimit)} h`),
    progressRow("Annual 140-day model", pct(data.yearlyDayUnits, state.settings.yearlyDayLimit), `${formatNumber(data.yearlyDayUnits)} / ${state.settings.yearlyDayLimit}`),
    progressRow("Banked extra hours", pct(data.bankedExtra, 20), `${formatHours(data.bankedExtra)} h`)
  ].join("");
}

function progressRow(label, value, text) {
  return `<div class="progress-row"><header><span>${escapeHtml(label)}</span><strong>${escapeHtml(text)}</strong></header><div class="bar"><span style="--value:${Math.min(100, value)}%"></span></div></div>`;
}

function renderFinanceSnapshot(data) {
  const budget = Math.max(1, number(state.settings.monthlyBudget));
  const used = Math.min(100, (data.monthExpenses / budget) * 100);
  $("#financeDonut").style.setProperty("--pct", `${used}%`);
  $("#financeDonut span").textContent = `${Math.round(used)}%`;
  const grouped = groupTransactionsByCategory();
  $("#categoryBreakdown").innerHTML = grouped.length
    ? grouped.slice(0, 5).map(([cat, amount]) => `<div class="list-row"><span>${escapeHtml(cat)}</span><strong>${formatMoney(amount)}</strong></div>`).join("")
    : `<p class="muted">No expenses recorded yet.</p>`;
}

function renderDeadlineList() {
  const events = calendarEvents().filter((event) => event.date).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
  $("#deadlineList").innerHTML = events.length
    ? events.map((event) => `<div class="list-row"><span>${escapeHtml(event.title)}<small>${escapeHtml(event.type)}</small></span><strong>${formatDate(event.date)}</strong></div>`).join("")
    : `<p class="muted">No deadlines yet.</p>`;
}

function renderPermitSummary() {
  const ready = permitReadiness();
  $("#permitReadinessPercent").textContent = `${ready.percent}%`;
  $("#permitReadinessText").textContent = ready.percent >= 90 ? "Ready for appointment" : "Prepare missing documents before the appointment.";
  $("#missingPermitList").innerHTML = ready.missing.length
    ? ready.missing.slice(0, 4).map((item) => `<div class="list-row"><span>${escapeHtml(item.name)}</span><strong class="status-warn">Missing</strong></div>`).join("")
    : `<p class="muted">All checklist items are ready.</p>`;
}

function renderWork() {
  const data = getAnalytics();
  $("#workMetricGrid").innerHTML = [
    metric("This week", `${formatHours(data.weeklyHours)} h`, `${formatHours(data.weeklyExtra)} h extra banked`, data.weeklyExtra > 0 ? "status-warn" : "status-good"),
    metric("Annual days", `${formatNumber(data.yearlyDayUnits)}`, `${formatNumber(Math.max(0, data.remainingDays))} remaining`, data.remainingDays < 0 ? "status-danger" : "status-good"),
    metric("Expected pay", formatMoney(data.expectedPay), "All logged shifts", "status-good"),
    metric("Bank", `${formatHours(data.bankedExtra)} h`, "Working time account", data.bankedExtra > 0 ? "status-warn" : "status-good"),
    metric("Breaks excluded", `${formatHours(totalBreakHours())} h`, "Not counted as work", "")
  ].join("");
  $("#manualTimeCarry").value = state.settings.manualTimeCarry;
  $("#compensatedHours").value = state.settings.compensatedHours;
  $("#bankedExtraHours").textContent = `${formatHours(data.bankedExtra)} h`;
  $("#timeAccountStatus").textContent = data.bankedExtra > 0 ? "Carry forward active" : "Balanced";
  $("#shiftRows").innerHTML = state.shifts.length
    ? [...state.shifts].sort((a, b) => new Date(b.date) - new Date(a.date)).map(renderShiftRow).join("")
    : `<tr><td colspan="9">No shifts logged yet.</td></tr>`;
  bindRowActions();
}

function renderShiftRow(shift) {
  const calc = calculateShift(shift);
  return `<tr>
    <td>${escapeHtml(formatDate(shift.date))}</td>
    <td><strong>${escapeHtml(shift.employer || jobName(shift.jobId))}</strong><small>${escapeHtml(shift.notes || "")}</small></td>
    <td>${escapeHtml(shift.jobType || jobType(shift.jobId))}</td>
    <td>${escapeHtml(shift.startTime)} - ${escapeHtml(shift.endTime)}</td>
    <td>${escapeHtml(String(shift.breakMinutes || 0))} min</td>
    <td><strong>${formatHours(calc.workedHours)} h</strong><small>${calc.dayUnit === 1 ? "full day" : "half day"}</small></td>
    <td>${formatMoney(calc.wage)}/h</td>
    <td><strong>${formatMoney(calc.pay)}</strong></td>
    <td><div class="row-actions"><button class="quiet-button small" data-edit-shift="${shift.id}">Edit</button><button class="danger-button small" data-delete-shift="${shift.id}">Delete</button></div></td>
  </tr>`;
}

function renderFinance() {
  const data = getAnalytics();
  $("#quickExpenseChips").innerHTML = CATEGORY_DEFAULTS.slice(0, 8).map((category) => `<button class="chip" type="button" data-quick-category="${escapeAttribute(category)}">${escapeHtml(category)}</button>`).join("");
  $("#financeMetricGrid").innerHTML = [
    metric("Income", formatMoney(data.monthIncome + data.workIncomeThisMonth), "This month incl. wages", "status-good"),
    metric("Expenses", formatMoney(data.monthExpenses), "This month", data.monthExpenses > state.settings.monthlyBudget ? "status-danger" : ""),
    metric("Budget left", formatMoney(state.settings.monthlyBudget - data.monthExpenses), "Monthly budget", state.settings.monthlyBudget - data.monthExpenses < 0 ? "status-danger" : "status-good"),
    metric("Balance", formatMoney(data.balance), "Income - expenses", data.balance < 0 ? "status-danger" : "status-good"),
    metric("Work pay", formatMoney(data.workIncomeThisMonth), "Expected this month", "status-good")
  ].join("");
  $("#moneyRows").innerHTML = state.transactions.length
    ? [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map(renderMoneyRow).join("")
    : `<tr><td colspan="6">No transactions recorded yet.</td></tr>`;
  $$("[data-quick-category]").forEach((button) => button.addEventListener("click", () => openMoneyDialog({ category: button.dataset.quickCategory, kind: "expense" })));
  bindRowActions();
}

function renderMoneyRow(item) {
  return `<tr>
    <td>${escapeHtml(formatDate(item.date))}</td>
    <td><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.notes || "")}</small></td>
    <td>${escapeHtml(item.category)}</td>
    <td>${escapeHtml(item.kind)}</td>
    <td><strong class="${item.kind === "income" ? "status-good" : ""}">${formatMoney(item.amount)}</strong></td>
    <td><div class="row-actions"><button class="quiet-button small" data-edit-money="${item.id}">Edit</button><button class="danger-button small" data-delete-money="${item.id}">Delete</button></div></td>
  </tr>`;
}

function renderScholarships() {
  $("#ectsCompleted").value = state.settings.ectsCompleted;
  $("#ectsTarget").value = state.settings.ectsTarget;
  $("#ectsPercent").textContent = `${Math.round(pct(state.settings.ectsCompleted, state.settings.ectsTarget))}%`;
  $("#scholarshipCards").innerHTML = state.scholarships.length
    ? [...state.scholarships].sort((a, b) => new Date(a.expirationDate || "9999-12-31") - new Date(b.expirationDate || "9999-12-31")).map(renderScholarshipCard).join("")
    : `<p class="muted">No scholarships yet. Add one to monitor funding and renewal conditions.</p>`;
  $("#academicEventList").innerHTML = state.academicEvents.length
    ? [...state.academicEvents].sort((a, b) => new Date(a.date) - new Date(b.date)).map(renderAcademicEvent).join("")
    : `<p class="muted">No academic dates yet. Add exams, ECTS deadlines, enrollment tasks, or semester dates.</p>`;
  bindRowActions();
}

function renderScholarshipCard(item) {
  const days = item.expirationDate ? daysUntil(item.expirationDate) : null;
  const status = days == null ? "Active" : days < 0 ? "Expired" : days <= 30 ? "Expiring soon" : "Active";
  return `<article class="scholarship-card">
    <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.conditions || "")}</small></div>
    <div class="tag-line"><span class="tag">${formatMoney(item.amount || 0)}</span><span class="tag">${escapeHtml(status)}</span>${item.ectsRequired ? `<span class="tag">ECTS ${escapeHtml(item.ectsRequired)}</span>` : ""}</div>
    <div><small>Expires</small><strong>${escapeHtml(item.expirationDate ? formatDate(item.expirationDate) : "No date")}</strong></div>
    <div class="row-actions"><button class="quiet-button small" data-edit-scholarship="${item.id}">Edit</button><button class="danger-button small" data-delete-scholarship="${item.id}">Delete</button></div>
  </article>`;
}

function renderAcademicEvent(item) {
  return `<div class="calendar-item">
    <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(`${formatDate(item.date)} | ${item.notes || "Academic date"}`)}</small></div>
    <div class="row-actions"><button class="quiet-button small" data-edit-academic="${item.id}">Edit</button><button class="danger-button small" data-delete-academic="${item.id}">Delete</button></div>
  </div>`;
}

function renderPermit() {
  $("#permitAppointment").value = state.settings.permitAppointment;
  $("#permitExpiry").value = state.settings.permitExpiry;
  const ready = permitReadiness();
  $("#permitReadinessLarge").textContent = `${ready.percent}%`;
  $("#permitChecklist").innerHTML = state.permitItems.map((item) => {
    const detail = item.notes || (item.dueDate ? `Due ${formatDate(item.dueDate)}` : "");
    return `<div class="check-item">
    <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(detail)}</small></div>
    <span class="status-pill ${item.status === "ready" ? "status-good" : "status-warn"}">${escapeHtml(item.status === "ready" ? "Ready" : "Missing")}</span>
    <div class="row-actions"><button class="quiet-button small" data-toggle-permit="${item.id}">${item.status === "ready" ? "Mark missing" : "Mark ready"}</button><button class="quiet-button small" data-edit-permit="${item.id}">Edit</button><button class="danger-button small" data-delete-permit="${item.id}">Delete</button></div>
  </div>`;
  }).join("");
  bindRowActions();
}

function renderCalendar() {
  const events = calendarEvents().sort((a, b) => new Date(a.date) - new Date(b.date));
  $("#calendarEvents").innerHTML = events.length
    ? events.map((event) => `<div class="calendar-item"><div><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(`${event.type} | ${formatDate(event.date)}`)}</small></div><a class="quiet-button small" href="${googleCalendarUrl(event)}" target="_blank" rel="noopener">Google</a></div>`).join("")
    : `<p class="muted">No events yet. Add shifts, scholarships, or permit dates.</p>`;
}

function renderSettings() {
  $("#weeklyLimit").value = state.settings.weeklyLimit;
  $("#yearlyDayLimit").value = state.settings.yearlyDayLimit;
  $("#monthlyBudget").value = state.settings.monthlyBudget;
  $("#jobList").innerHTML = state.jobs.map((job) => `<div class="job-row">
    <div><strong>${escapeHtml(job.name)}</strong><small>${escapeHtml(job.type)}</small></div>
    <strong>${formatMoney(job.wage)}/h</strong>
    <div class="row-actions"><button class="quiet-button small" data-edit-job="${job.id}">Edit</button><button class="danger-button small" data-delete-job="${job.id}">Delete</button></div>
  </div>`).join("");
  bindRowActions();
}

function bindRowActions() {
  $$("[data-edit-shift]").forEach((button) => button.addEventListener("click", () => openShiftDialog(findById(state.shifts, button.dataset.editShift))));
  $$("[data-delete-shift]").forEach((button) => button.addEventListener("click", () => removeItem("shifts", button.dataset.deleteShift)));
  $$("[data-edit-money]").forEach((button) => button.addEventListener("click", () => openMoneyDialog(findById(state.transactions, button.dataset.editMoney))));
  $$("[data-delete-money]").forEach((button) => button.addEventListener("click", () => removeItem("transactions", button.dataset.deleteMoney)));
  $$("[data-edit-scholarship]").forEach((button) => button.addEventListener("click", () => openScholarshipDialog(findById(state.scholarships, button.dataset.editScholarship))));
  $$("[data-delete-scholarship]").forEach((button) => button.addEventListener("click", () => removeItem("scholarships", button.dataset.deleteScholarship)));
  $$("[data-edit-academic]").forEach((button) => button.addEventListener("click", () => openAcademicDialog(findById(state.academicEvents, button.dataset.editAcademic))));
  $$("[data-delete-academic]").forEach((button) => button.addEventListener("click", () => removeItem("academicEvents", button.dataset.deleteAcademic)));
  $$("[data-edit-permit]").forEach((button) => button.addEventListener("click", () => openPermitDialog(findById(state.permitItems, button.dataset.editPermit))));
  $$("[data-delete-permit]").forEach((button) => button.addEventListener("click", () => removeItem("permitItems", button.dataset.deletePermit)));
  $$("[data-toggle-permit]").forEach((button) => button.addEventListener("click", () => togglePermit(button.dataset.togglePermit)));
  $$("[data-edit-job]").forEach((button) => button.addEventListener("click", () => openJobDialog(findById(state.jobs, button.dataset.editJob))));
  $$("[data-delete-job]").forEach((button) => button.addEventListener("click", () => removeItem("jobs", button.dataset.deleteJob)));
}

function openShiftDialog(item = {}) {
  const firstJob = state.jobs[0] || {};
  currentDialog = { type: "shift", id: item.id };
  openDialog("Work shift", item.id ? "Edit shift" : "Add shift", [
    field("date", "Date", "date", item.date || today()),
    selectField("jobId", "Job profile", state.jobs.map((job) => [job.id, `${job.name} (${formatMoney(job.wage)}/h)`]), item.jobId || firstJob.id || ""),
    field("employer", "Employer / workplace", "text", item.employer || firstJob.name || ""),
    selectField("jobType", "Job type", JOB_TYPES.map((type) => [type, type]), item.jobType || firstJob.type || "Part-time"),
    field("startTime", "Start time", "time", item.startTime || "09:00"),
    field("endTime", "End time", "time", item.endTime || "13:00"),
    field("breakMinutes", "Break minutes", "number", item.breakMinutes ?? 0, "1"),
    field("wage", "Hourly wage EUR", "number", item.wage ?? firstJob.wage ?? 13.5, "0.01"),
    checkboxField("countsForVisa", "Counts for 140-day rule", item.countsForVisa !== false),
    field("notes", "Notes", "text", item.notes || "")
  ]);
  $("#field-jobId").addEventListener("change", (event) => {
    const job = findById(state.jobs, event.target.value);
    if (job) {
      $("#field-employer").value = job.name;
      $("#field-jobType").value = job.type;
      $("#field-wage").value = job.wage;
    }
  });
}

function openMoneyDialog(item = {}) {
  currentDialog = { type: "money", id: item.id };
  openDialog("Finance", item.id ? "Edit transaction" : "Add transaction", [
    field("date", "Date", "date", item.date || today()),
    selectField("kind", "Kind", MONEY_KINDS.map((kind) => [kind, kind]), item.kind || "expense"),
    selectField("category", "Category", CATEGORY_DEFAULTS.map((cat) => [cat, cat]), item.category || "Food"),
    field("amount", "Amount EUR", "number", item.amount || "", "0.01"),
    field("description", "Description", "text", item.description || ""),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openScholarshipDialog(item = {}) {
  currentDialog = { type: "scholarship", id: item.id };
  openDialog("Scholarship", item.id ? "Edit scholarship" : "Add scholarship", [
    field("name", "Name", "text", item.name || ""),
    field("amount", "Monthly amount EUR", "number", item.amount || "", "0.01"),
    field("expirationDate", "Funding expiry date", "date", item.expirationDate || ""),
    field("renewalDeadline", "Renewal deadline", "date", item.renewalDeadline || ""),
    field("ectsRequired", "ECTS required", "number", item.ectsRequired || "", "1"),
    field("conditions", "Renewal conditions", "text", item.conditions || "")
  ]);
}

function openAcademicDialog(item = {}) {
  currentDialog = { type: "academic", id: item.id };
  openDialog("Academic date", item.id ? "Edit academic date" : "Add academic date", [
    field("title", "Title", "text", item.title || ""),
    field("date", "Date", "date", item.date || today()),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openPermitDialog(item = {}) {
  currentDialog = { type: "permit", id: item.id };
  openDialog("Residence permit", item.id ? "Edit checklist item" : "Add checklist item", [
    field("name", "Document / task", "text", item.name || ""),
    selectField("status", "Status", [["missing", "Missing"], ["ready", "Ready"]], item.status || "missing"),
    field("dueDate", "Due date", "date", item.dueDate || ""),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openJobDialog(item = {}) {
  currentDialog = { type: "job", id: item.id };
  openDialog("Job wages", item.id ? "Edit job" : "Add job", [
    field("name", "Job / employer name", "text", item.name || ""),
    selectField("type", "Job type", JOB_TYPES.map((type) => [type, type]), item.type || "Part-time"),
    field("wage", "Hourly wage EUR", "number", item.wage || 13.5, "0.01")
  ]);
}

function openDialog(eyebrow, title, fields) {
  $("#dialogEyebrow").textContent = eyebrow;
  $("#dialogTitle").textContent = title;
  $("#dialogFields").innerHTML = fields.join("");
  $("#entryDialog").showModal();
}

function field(name, label, type, value = "", step = "") {
  return `<label><span>${escapeHtml(label)}</span><input id="field-${escapeAttribute(name)}" name="${escapeAttribute(name)}" type="${type}" value="${escapeAttribute(value)}" ${step ? `step="${escapeAttribute(step)}"` : ""}></label>`;
}

function selectField(name, label, options, value = "") {
  return `<label><span>${escapeHtml(label)}</span><select id="field-${escapeAttribute(name)}" name="${escapeAttribute(name)}">${options.map(([val, text]) => `<option value="${escapeAttribute(val)}" ${String(val) === String(value) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
}

function checkboxField(name, label, checked) {
  return `<label><span>${escapeHtml(label)}</span><select id="field-${escapeAttribute(name)}" name="${escapeAttribute(name)}"><option value="true" ${checked ? "selected" : ""}>Yes</option><option value="false" ${!checked ? "selected" : ""}>No</option></select></label>`;
}

function handleDialogSubmit(event) {
  if (event.submitter?.value === "cancel") {
    return;
  }
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const id = currentDialog?.id || crypto.randomUUID();
  if (currentDialog.type === "shift") {
    upsert("shifts", { id, ...values, breakMinutes: number(values.breakMinutes), wage: number(values.wage), countsForVisa: values.countsForVisa === "true" });
  }
  if (currentDialog.type === "money") {
    upsert("transactions", { id, ...values, amount: number(values.amount) });
  }
  if (currentDialog.type === "scholarship") {
    upsert("scholarships", { id, ...values, amount: number(values.amount), ectsRequired: number(values.ectsRequired) });
  }
  if (currentDialog.type === "academic") {
    upsert("academicEvents", { id, ...values });
  }
  if (currentDialog.type === "permit") {
    upsert("permitItems", { id, ...values });
  }
  if (currentDialog.type === "job") {
    upsert("jobs", { id, ...values, wage: number(values.wage) });
  }
  $("#entryDialog").close();
  saveState();
  renderAll();
}

function updateSettingsFromInputs() {
  state.settings = {
    ...state.settings,
    manualTimeCarry: number($("#manualTimeCarry").value),
    compensatedHours: number($("#compensatedHours").value),
    weeklyLimit: number($("#weeklyLimit").value),
    yearlyDayLimit: number($("#yearlyDayLimit").value),
    monthlyBudget: number($("#monthlyBudget").value),
    ectsCompleted: number($("#ectsCompleted").value),
    ectsTarget: number($("#ectsTarget").value),
    permitAppointment: $("#permitAppointment").value,
    permitExpiry: $("#permitExpiry").value
  };
  saveState();
  renderAll();
}

function upsert(collection, item) {
  const index = state[collection].findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    state[collection][index] = item;
  } else {
    state[collection].unshift(item);
  }
}

function removeItem(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function togglePermit(id) {
  state.permitItems = state.permitItems.map((item) => item.id === id ? { ...item, status: item.status === "ready" ? "missing" : "ready" } : item);
  saveState();
  renderAll();
}

function calculateShift(shift) {
  const start = timeToMinutes(shift.startTime);
  let end = timeToMinutes(shift.endTime);
  if (end < start) {
    end += 24 * 60;
  }
  const breakMinutes = Math.max(0, number(shift.breakMinutes));
  const workedHours = Math.max(0, (end - start - breakMinutes) / 60);
  const wage = number(shift.wage || findById(state.jobs, shift.jobId)?.wage || 0);
  return {
    workedHours,
    wage,
    pay: workedHours * wage,
    dayUnit: workedHours > 4 ? 1 : workedHours > 0 ? 0.5 : 0
  };
}

function calendarEvents() {
  const events = [];
  state.shifts.forEach((shift) => {
    events.push({
      type: "Work shift",
      title: `${shift.employer || jobName(shift.jobId)} shift`,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      details: `Break: ${shift.breakMinutes || 0} minutes. Expected pay: ${formatMoney(calculateShift(shift).pay)}.`
    });
  });
  state.scholarships.forEach((scholarship) => {
    if (scholarship.renewalDeadline) {
      events.push({ type: "Scholarship", title: `${scholarship.name} renewal deadline`, date: scholarship.renewalDeadline, details: scholarship.conditions || "" });
    }
    if (scholarship.expirationDate) {
      events.push({ type: "Scholarship", title: `${scholarship.name} funding expires`, date: scholarship.expirationDate, details: scholarship.conditions || "" });
    }
  });
  state.academicEvents.forEach((item) => {
    events.push({ type: "Academic", title: item.title, date: item.date, details: item.notes || "" });
  });
  if (state.settings.permitAppointment) {
    events.push({ type: "Residence permit", title: "Residence permit appointment", date: state.settings.permitAppointment, details: "Bring all ready documents and copies." });
  }
  if (state.settings.permitExpiry) {
    events.push({ type: "Residence permit", title: "Residence permit expires", date: state.settings.permitExpiry, details: "Renew before this date." });
  }
  return events.filter((event) => event.date);
}

function googleCalendarUrl(event) {
  const start = event.startTime ? `${event.date}T${event.startTime}` : `${event.date}T09:00`;
  const end = event.endTime ? `${event.date}T${event.endTime}` : `${event.date}T10:00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: event.details || "",
    location: ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadCalendarFile() {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SPEND WISE-HILLARY 21//Student Control Center//EN"];
  calendarEvents().forEach((event) => {
    const start = event.startTime ? `${event.date}T${event.startTime}` : `${event.date}T09:00`;
    const end = event.endTime ? `${event.date}T${event.endTime}` : `${event.date}T10:00`;
    lines.push("BEGIN:VEVENT", `UID:${crypto.randomUUID()}@spend-wise-hillary-21`, `DTSTAMP:${calendarStamp(new Date().toISOString().slice(0, 16))}`, `DTSTART:${calendarStamp(start)}`, `DTEND:${calendarStamp(end)}`, `SUMMARY:${icsText(event.title)}`, `DESCRIPTION:${icsText(event.details || event.type)}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  downloadText("spend-wise-hillary-21-calendar.ics", lines.join("\r\n"), "text/calendar");
}

function permitReadiness() {
  const total = Math.max(1, state.permitItems.length);
  const ready = state.permitItems.filter((item) => item.status === "ready");
  return {
    percent: Math.round((ready.length / total) * 100),
    missing: state.permitItems.filter((item) => item.status !== "ready")
  };
}

function groupTransactionsByCategory() {
  const groups = new Map();
  state.transactions.filter((item) => item.kind === "expense").forEach((item) => groups.set(item.category, (groups.get(item.category) || 0) + number(item.amount)));
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}

function groupByWeek(shifts) {
  const groups = new Map();
  shifts.forEach((shift) => {
    const key = isoWeekKey(new Date(shift.date));
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(shift);
  });
  return groups;
}

function shiftCsvRows() {
  return [["date", "job", "type", "start", "end", "break_minutes", "worked_hours", "wage", "expected_pay", "visa_day_unit"], ...state.shifts.map((shift) => {
    const calc = calculateShift(shift);
    return [shift.date, shift.employer || jobName(shift.jobId), shift.jobType || jobType(shift.jobId), shift.startTime, shift.endTime, shift.breakMinutes || 0, calc.workedHours.toFixed(2), calc.wage.toFixed(2), calc.pay.toFixed(2), calc.dayUnit];
  })];
}

function moneyCsvRows() {
  return [["date", "kind", "category", "description", "amount", "notes"], ...state.transactions.map((item) => [item.date, item.kind, item.category, item.description, number(item.amount).toFixed(2), item.notes || ""])];
}

function downloadCsv(filename, rows) {
  downloadText(filename, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function exportData() {
  downloadText("spend-wise-hillary-21-data.json", JSON.stringify(state, null, 2), "application/json");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = mergeState(defaultState(), JSON.parse(String(reader.result || "{}")));
      saveState();
      renderAll();
    } catch {
      window.alert("The selected file could not be imported.");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!window.confirm("Reset all SPEND WISE-HILLARY 21 data in this browser?")) {
    return;
  }
  state = defaultState();
  saveState();
  renderAll();
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function findById(items, id) {
  return items.find((item) => item.id === id);
}

function jobName(id) {
  return findById(state.jobs, id)?.name || "Job";
}

function jobType(id) {
  return findById(state.jobs, id)?.type || "Other";
}

function removeFalsy(items) {
  return items.filter(Boolean);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(value, max) {
  return max ? Math.max(0, (number(value) / number(max)) * 100) : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat(currentLanguage === "de" ? "de-DE" : "en-DE", { style: "currency", currency: CURRENCY }).format(number(value));
}

function formatHours(value) {
  return number(value).toFixed(2).replace(/\.00$/, "");
}

function formatNumber(value) {
  return number(value).toFixed(1).replace(/\.0$/, "");
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(value) {
  return Math.ceil((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(number);
  return hours * 60 + minutes;
}

function totalBreakHours() {
  return sum(state.shifts.map((shift) => number(shift.breakMinutes) / 60));
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function inRange(date, start, end) {
  return date >= start && date < end;
}

function isoWeekKey(date) {
  const start = startOfWeek(date);
  return start.toISOString().slice(0, 10);
}

function calendarStamp(value) {
  return String(value).replaceAll("-", "").replaceAll(":", "").replace(".", "").slice(0, 15);
}

function icsText(value) {
  return String(value || "").replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

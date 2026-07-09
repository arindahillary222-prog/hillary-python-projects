const APP_NAME = "CONTROL CENTER Hillary.21";
const APP_VERSION = "2.0.0";
const LEGACY_STATE_KEY = "swh21.state.v1";
const BASE_STORAGE_KEY = "student_control_center_data_v2";
const INSTALL_ID_KEY = "student_control_center_install_id_v1";
const LANGUAGE_KEY = "scc.language";
const THEME_KEY = "scc.theme";
const CATEGORY_DEFAULTS = ["Rent", "Food", "Transport", "Insurance", "Tuition", "Health", "Study", "Income", "Bank income", "Other"];
const MONEY_KINDS = ["expense", "income"];
const PAID_STATUSES = ["unpaid", "partially_paid", "paid", "unknown"];
const JOB_TYPES = [
  ["part_time", "Part time"],
  ["mini_job", "Mini job"],
  ["student_assistant", "Student assistant"],
  ["short_term", "Short term"],
  ["internship", "Internship"],
  ["freelance", "Freelance"],
  ["full_time", "Full time"],
  ["other", "Other"]
];
const PERMIT_STATUSES = [
  ["missing", "Missing"],
  ["available", "Available"],
  ["submitted", "Submitted"],
  ["not_required", "Not required"]
];

const TRANSLATIONS = {
  en: {
    navDashboard: "Dashboard", navWork: "Work Tracker", navFinance: "Finance", navScholarships: "Scholarships", navPermit: "Residence Permit", navCalendar: "Calendar Sync", navAi: "AI Assistant", navSettings: "Settings",
    workspace: "CONTROL CENTER Hillary.21", language: "Language", theme: "Theme", light: "Light", dark: "Dark", installApp: "Install App", privateStorage: "Private local storage",
    dashboardTitle: "Legal, money, study, and permit overview", dashboardSub: "Know what is safe this week and what needs attention next.", workCompliance: "Work compliance", open: "Open", financeSnapshot: "Finance snapshot", nextDeadlines: "Next deadlines", sync: "Sync", permitReadiness: "Residence permit readiness",
    workTitle: "Work compliance tracker", workSub: "Breaks are excluded automatically. Extra hours above the weekly limit are banked per job.", addShift: "Add Shift", addPayslip: "Add Payslip", workingTimeAccount: "Working time account", accountJob: "Account job", manualCarry: "Manual carry-in/out hours", compensatedHours: "Compensated hours already taken", confirmedBanked: "Employer-confirmed banked hours", bankedExtra: "Banked extra hours", shiftLedger: "Shift ledger",
    filterJob: "Job / employer", filterMonth: "Month", dateFrom: "Date from", dateTo: "Date to", paidStatus: "Paid status", exportPdf: "Export PDF", exportDocx: "Export DOCX", emailShare: "Email", whatsAppShare: "WhatsApp", payslipLedger: "Payslips", payslipsSeparate: "Separate from shifts", month: "Month", paidGross: "Paid gross", paidNet: "Paid net", hoursPaid: "Hours paid",
    financeTitle: "Finance and expense tracker", financeSub: "Log income and expenses with fast categories.", addTransaction: "Add Transaction", moneyLedger: "Money ledger", payReconciliation: "Pay reconciliation", grossNetSeparated: "Gross, net, unpaid, bank income separated",
    scholarshipTitle: "Scholarship and academic monitoring", scholarshipSub: "Track funding, renewal dates, variable payments, and ECTS progress before there is a problem.", addScholarship: "Add Scholarship", ectsProgress: "ECTS progress", ectsSub: "Set the target for your program and update completed credits.", ectsCompleted: "ECTS completed", ectsTarget: "ECTS target", progress: "Progress", academicDates: "Academic dates", addAcademicDate: "Add Academic Date",
    permitTitle: "Residence permit checklist", permitSub: "Prepare documents, appointment dates, and proof before renewal.", addPermitItem: "Add Item", appointmentDate: "Appointment date", permitExpiry: "Permit expiry", readiness: "Readiness",
    calendarTitle: "Google Calendar sync", calendarSub: "Add shifts, visa appointments, scholarship deadlines, and academic dates to your phone calendar.", downloadIcs: "Download Calendar File", calendarEvents: "Calendar events", googleReady: "Google links ready",
    aiTitle: "AI Data Assistant", aiSub: "Ask local questions about your own saved data. No API key is required.", ask: "Ask",
    settingsTitle: "Settings and job wages", settingsSub: "Set limits, wages, and private data controls.", addJob: "Add Job", complianceSettings: "Compliance settings", weeklyLimit: "Weekly work limit", yearlyDayLimit: "Yearly day-equivalent limit", monthlyBudget: "Monthly budget", currency: "Currency", countryMode: "Country mode", jobWages: "Jobs and hourly wages", autoPay: "Auto pay enabled", dataControls: "Data controls", exportData: "Export Data", importData: "Import Data", resetData: "Reset App Data", dataNote: "Data stays in this browser or installed app unless you export it.",
    date: "Date", job: "Job", type: "Type", time: "Time", break: "Break", worked: "Worked", wage: "Wage", expectedPay: "Expected money", actions: "Actions", exportCsv: "Export CSV", description: "Description", category: "Category", kind: "Kind", amount: "Amount", cancel: "Cancel", save: "Save",
    importPreview: "Import preview", reviewImportedData: "Review imported data", installable: "Installable app", installTitle: "Install CONTROL CENTER Hillary.21", installAndroid: "Open in Chrome, tap the browser menu, then choose Install app or Add to Home screen.", installIphone: "Open in Safari, tap Share, then choose Add to Home Screen.", installLaptop: "Open in Chrome or Edge and use the install icon in the address bar or browser menu."
  },
  de: { navDashboard: "Dashboard", navWork: "Arbeitszeit", navFinance: "Finanzen", navScholarships: "Stipendien", navPermit: "Aufenthalt", navCalendar: "Kalender", navAi: "KI Assistent", navSettings: "Einstellungen", language: "Sprache", theme: "Design", light: "Hell", dark: "Dunkel", installApp: "App installieren", save: "Speichern", cancel: "Abbrechen" },
  fr: { navDashboard: "Tableau", navWork: "Travail", navFinance: "Finance", navScholarships: "Bourses", navPermit: "Sejour", navCalendar: "Calendrier", navAi: "Assistant IA", navSettings: "Parametres", language: "Langue", theme: "Theme", installApp: "Installer", save: "Enregistrer", cancel: "Annuler" },
  zh: { navDashboard: "仪表板", navWork: "工作", navFinance: "财务", navScholarships: "奖学金", navPermit: "居留许可", navCalendar: "日历", navAi: "AI 助手", navSettings: "设置", language: "语言", theme: "主题", installApp: "安装应用", save: "保存", cancel: "取消" },
  sw: { navDashboard: "Dashibodi", navWork: "Kazi", navFinance: "Fedha", navScholarships: "Ufadhili", navPermit: "Kibali", navCalendar: "Kalenda", navAi: "Msaidizi AI", navSettings: "Mipangilio", language: "Lugha", theme: "Mandhari", installApp: "Sakinisha", save: "Hifadhi", cancel: "Ghairi" },
  hi: { navDashboard: "डैशबोर्ड", navWork: "काम", navFinance: "वित्त", navScholarships: "छात्रवृत्ति", navPermit: "निवास परमिट", navCalendar: "कैलेंडर", navAi: "AI सहायक", navSettings: "सेटिंग", language: "भाषा", theme: "थीम", installApp: "इंस्टॉल", save: "सेव", cancel: "रद्द" },
  pt: { navDashboard: "Painel", navWork: "Trabalho", navFinance: "Financas", navScholarships: "Bolsas", navPermit: "Residencia", navCalendar: "Calendario", navAi: "Assistente IA", navSettings: "Definicoes", language: "Idioma", theme: "Tema", installApp: "Instalar", save: "Salvar", cancel: "Cancelar" },
  ar: { navDashboard: "لوحة التحكم", navWork: "العمل", navFinance: "المال", navScholarships: "المنح", navPermit: "الإقامة", navCalendar: "التقويم", navAi: "مساعد الذكاء", navSettings: "الإعدادات", language: "اللغة", theme: "النمط", installApp: "تثبيت", save: "حفظ", cancel: "إلغاء" }
};

const LANGUAGE_META = {
  en: { htmlLang: "en", dir: "ltr" }, de: { htmlLang: "de", dir: "ltr" }, fr: { htmlLang: "fr", dir: "ltr" },
  zh: { htmlLang: "zh", dir: "ltr" }, sw: { htmlLang: "sw", dir: "ltr" }, hi: { htmlLang: "hi", dir: "ltr" },
  pt: { htmlLang: "pt", dir: "ltr" }, ar: { htmlLang: "ar", dir: "rtl" }
};

let state = loadAppData();
let currentLanguage = loadPreference(LANGUAGE_KEY, state.settings.locale || "en");
let currentTheme = loadPreference(THEME_KEY, "light");
let currentDialog = null;
let deferredInstallPrompt = null;
let pendingImportData = null;

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

function getEmptyAppData() {
  return {
    version: APP_VERSION,
    jobs: [],
    shifts: [],
    payslips: [],
    workingTimeAccounts: [],
    transactions: [],
    scholarships: [],
    academicEvents: [],
    permitItems: [],
    settings: {
      weeklyLimitHours: 20,
      yearlyDayLimit: 140,
      monthlyBudget: 0,
      currency: "EUR",
      appName: APP_NAME,
      countryMode: "custom",
      locale: "en"
    }
  };
}

function migrateLegacyAppData(raw) {
  const empty = getEmptyAppData();
  if (!raw || typeof raw !== "object") return empty;
  const source = raw.version === APP_VERSION ? raw : raw;
  const jobs = asArray(source.jobs).map((job) => normalizeJob(job));
  const settings = {
    ...empty.settings,
    ...(source.settings || {}),
    weeklyLimitHours: number(source.settings?.weeklyLimitHours ?? source.settings?.weeklyLimit ?? empty.settings.weeklyLimitHours),
    yearlyDayLimit: number(source.settings?.yearlyDayLimit ?? empty.settings.yearlyDayLimit),
    monthlyBudget: number(source.settings?.monthlyBudget ?? empty.settings.monthlyBudget),
    currency: String(source.settings?.currency || "EUR").toUpperCase().slice(0, 3),
    appName: APP_NAME,
    countryMode: source.settings?.countryMode || "custom",
    locale: source.settings?.locale || "en",
    ectsCompleted: number(source.settings?.ectsCompleted ?? 0),
    ectsTarget: number(source.settings?.ectsTarget ?? 0),
    permitAppointment: source.settings?.permitAppointment || "",
    permitExpiry: source.settings?.permitExpiry || ""
  };
  const firstJobId = jobs[0]?.id || "";
  const shifts = asArray(source.shifts).map((shift) => normalizeShift(shift, jobs));
  const accounts = asArray(source.workingTimeAccounts).map((account) => normalizeAccount(account));
  if (!accounts.length && firstJobId && (source.settings?.manualTimeCarry || source.settings?.compensatedHours)) {
    accounts.push({
      id: crypto.randomUUID(),
      jobId: firstJobId,
      manualCarryInOutHours: number(source.settings?.manualTimeCarry),
      compensatedHoursAlreadyTaken: number(source.settings?.compensatedHours),
      notes: "Migrated from legacy global working-time account."
    });
  }
  return {
    version: APP_VERSION,
    jobs,
    shifts,
    payslips: asArray(source.payslips).map((payslip) => normalizePayslip(payslip, settings.currency)),
    workingTimeAccounts: accounts,
    transactions: asArray(source.transactions).map((transaction) => normalizeTransaction(transaction, settings.currency)),
    scholarships: asArray(source.scholarships).map((scholarship) => normalizeScholarship(scholarship, settings.currency)),
    academicEvents: asArray(source.academicEvents).map((event) => normalizeAcademicEvent(event)),
    permitItems: asArray(source.permitItems).map((item) => normalizePermitItem(item)),
    settings
  };
}

function validateAndNormalizeAppData(raw) {
  const migrated = migrateLegacyAppData(raw);
  return {
    version: APP_VERSION,
    jobs: migrated.jobs ?? [],
    shifts: removeDuplicateShifts(migrated.shifts ?? []),
    payslips: removeDuplicatePayslips(migrated.payslips ?? []),
    workingTimeAccounts: migrated.workingTimeAccounts ?? [],
    transactions: removeDuplicateTransactions(migrated.transactions ?? []),
    scholarships: migrated.scholarships ?? [],
    academicEvents: migrated.academicEvents ?? [],
    permitItems: migrated.permitItems ?? [],
    settings: { ...getEmptyAppData().settings, ...(migrated.settings ?? {}), appName: APP_NAME }
  };
}

function normalizeJob(job = {}) {
  return {
    id: String(job.id || crypto.randomUUID()),
    name: String(job.name || job.employerName || "Job"),
    employerName: String(job.employerName || job.employer || ""),
    type: normalizeJobType(job.type),
    hourlyWageGross: number(job.hourlyWageGross ?? job.wage),
    currency: String(job.currency || "EUR").toUpperCase().slice(0, 3),
    startDate: job.startDate || "",
    endDate: job.endDate || "",
    weeklyLimitHours: job.weeklyLimitHours === "" ? undefined : optionalNumber(job.weeklyLimitHours),
    yearlyDayLimit: job.yearlyDayLimit === "" ? undefined : optionalNumber(job.yearlyDayLimit),
    monthlyPayoutCapGross: job.monthlyPayoutCapGross === "" ? undefined : optionalNumber(job.monthlyPayoutCapGross),
    hasWorkingTimeAccount: job.hasWorkingTimeAccount !== false,
    paymentDayOfFollowingMonth: job.paymentDayOfFollowingMonth === "" ? null : optionalNumber(job.paymentDayOfFollowingMonth),
    notes: job.notes || ""
  };
}

function normalizeShift(shift = {}, jobs = []) {
  const job = jobs.find((entry) => entry.id === shift.jobId);
  const start = shift.start || shift.startTime || "";
  const end = shift.end || shift.endTime || "";
  const breakMinutes = number(shift.breakMinutes);
  const workedMinutes = shift.workedMinutes !== undefined ? number(shift.workedMinutes) : calculateWorkedMinutes(start, end, breakMinutes);
  const wage = number(shift.wage ?? job?.hourlyWageGross);
  return {
    id: String(shift.id || crypto.randomUUID()),
    jobId: String(shift.jobId || job?.id || ""),
    date: shift.date || today(),
    start,
    end,
    breakMinutes,
    workedMinutes,
    grossPayExpected: number(shift.grossPayExpected ?? (workedMinutes / 60) * wage),
    paidStatus: PAID_STATUSES.includes(shift.paidStatus) ? shift.paidStatus : "unpaid",
    notes: shift.notes || "",
    source: shift.source || { type: "manual", verified: true }
  };
}

function normalizePayslip(payslip = {}, currency = "EUR") {
  return {
    id: String(payslip.id || crypto.randomUUID()),
    jobId: String(payslip.jobId || ""),
    payrollMonth: String(payslip.payrollMonth || getMonthKey(payslip.paymentDate || today())),
    grossPaid: number(payslip.grossPaid),
    netPaid: number(payslip.netPaid),
    hoursPaid: optionalNumber(payslip.hoursPaid),
    paymentDate: payslip.paymentDate || "",
    currency: String(payslip.currency || currency).toUpperCase().slice(0, 3),
    sourceFile: payslip.sourceFile || "",
    notes: payslip.notes || ""
  };
}

function normalizeAccount(account = {}) {
  return {
    id: String(account.id || crypto.randomUUID()),
    jobId: String(account.jobId || ""),
    employerConfirmedBankedHours: account.employerConfirmedBankedHours === "" || account.employerConfirmedBankedHours === undefined ? undefined : number(account.employerConfirmedBankedHours),
    manualCarryInOutHours: number(account.manualCarryInOutHours),
    compensatedHoursAlreadyTaken: number(account.compensatedHoursAlreadyTaken),
    notes: account.notes || ""
  };
}

function normalizeTransaction(transaction = {}, currency = "EUR") {
  return {
    id: String(transaction.id || crypto.randomUUID()),
    date: transaction.date || today(),
    description: String(transaction.description || ""),
    category: String(transaction.category || "Other"),
    kind: MONEY_KINDS.includes(transaction.kind) ? transaction.kind : "expense",
    amount: number(transaction.amount),
    currency: String(transaction.currency || currency).toUpperCase().slice(0, 3),
    linkedJobId: transaction.linkedJobId || "",
    linkedScholarshipId: transaction.linkedScholarshipId || "",
    linkedPayslipId: transaction.linkedPayslipId || "",
    source: transaction.source || "manual",
    notes: transaction.notes || ""
  };
}

function normalizeScholarship(scholarship = {}, currency = "EUR") {
  return {
    id: String(scholarship.id || crypto.randomUUID()),
    name: String(scholarship.name || ""),
    provider: String(scholarship.provider || ""),
    expectedMonthlyAmount: optionalNumber(scholarship.expectedMonthlyAmount ?? scholarship.amount),
    currency: String(scholarship.currency || currency).toUpperCase().slice(0, 3),
    startDate: scholarship.startDate || "",
    endDate: scholarship.endDate || "",
    renewalDeadline: scholarship.renewalDeadline || "",
    fundingExpiryDate: scholarship.fundingExpiryDate || scholarship.expirationDate || "",
    ectsRequired: optionalNumber(scholarship.ectsRequired),
    notes: scholarship.notes || scholarship.conditions || ""
  };
}

function normalizeAcademicEvent(event = {}) {
  return {
    id: String(event.id || crypto.randomUUID()),
    title: String(event.title || ""),
    date: event.date || "",
    type: event.type || "other",
    ects: optionalNumber(event.ects),
    status: event.status || "unknown",
    notes: event.notes || ""
  };
}

function normalizePermitItem(item = {}) {
  const status = item.status === "ready" ? "available" : item.status;
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || ""),
    status: ["missing", "available", "submitted", "not_required"].includes(status) ? status : "missing",
    dueDate: item.dueDate || "",
    sourceDocument: item.sourceDocument || "",
    notes: item.notes || ""
  };
}

function isStandaloneApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
    window.navigator?.standalone === true
  );
}

function getInstallId() {
  let id = localStorage.getItem(INSTALL_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(INSTALL_ID_KEY, id);
  }
  return id;
}

function getRuntimeMode() {
  return isStandaloneApp() ? "installed" : "browser";
}

function getStorageKey() {
  return `${BASE_STORAGE_KEY}:${getRuntimeMode()}:${getInstallId()}`;
}

function saveAppData(data) {
  state = validateAndNormalizeAppData(data);
  localStorage.setItem(getStorageKey(), JSON.stringify(state));
}

function loadAppData() {
  const raw = localStorage.getItem(getStorageKey());
  if (raw) {
    try {
      return validateAndNormalizeAppData(JSON.parse(raw));
    } catch {
      return getEmptyAppData();
    }
  }
  const legacyRaw = localStorage.getItem(LEGACY_STATE_KEY);
  if (legacyRaw) {
    try {
      const migrated = validateAndNormalizeAppData(JSON.parse(legacyRaw));
      localStorage.setItem(getStorageKey(), JSON.stringify(migrated));
      return migrated;
    } catch {
      return getEmptyAppData();
    }
  }
  return getEmptyAppData();
}

function saveState() {
  saveAppData(state);
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
  if (themeMeta) themeMeta.content = currentTheme === "dark" ? "#101827" : "#38bdf8";
}

function applyTranslations() {
  $$("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $("#languageSelect").value = currentLanguage;
  $("#themeSelect").value = currentTheme;
  $("#pageTitle").textContent = t(routeTitleKey(currentRoute()));
}

function bindNavigation() {
  $$(".nav-item, .brand").forEach((button) => button.addEventListener("click", () => showRoute(button.dataset.route)));
  $$("[data-route-jump]").forEach((button) => button.addEventListener("click", () => showRoute(button.dataset.routeJump)));
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
  return ["dashboard", "work", "finance", "scholarships", "permit", "calendar", "ai", "settings"].includes(route) ? route : currentRoute();
}

function routeTitleKey(route) {
  return { dashboard: "navDashboard", work: "navWork", finance: "navFinance", scholarships: "navScholarships", permit: "navPermit", calendar: "navCalendar", ai: "navAi", settings: "navSettings" }[route] || "navDashboard";
}

function bindControls() {
  $("#languageSelect").addEventListener("change", (event) => {
    currentLanguage = event.target.value;
    state.settings.locale = currentLanguage;
    savePreference(LANGUAGE_KEY, currentLanguage);
    saveState();
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
  $("#addPayslipButton").addEventListener("click", () => openPayslipDialog());
  $("#addMoneyButton").addEventListener("click", () => openMoneyDialog());
  $("#addScholarshipButton").addEventListener("click", () => openScholarshipDialog());
  $("#addAcademicDateButton").addEventListener("click", () => openAcademicDialog());
  $("#addPermitItemButton").addEventListener("click", () => openPermitDialog());
  $("#addJobButton").addEventListener("click", () => openJobDialog());
  $("#entryForm").addEventListener("submit", handleDialogSubmit);
  ["manualTimeCarry", "compensatedHours", "confirmedBankedHours", "weeklyLimit", "yearlyDayLimit", "monthlyBudget", "currencySetting", "countryMode", "ectsCompleted", "ectsTarget", "permitAppointment", "permitExpiry"].forEach((id) => {
    const node = $(`#${id}`);
    if (node) node.addEventListener("input", updateSettingsFromInputs);
  });
  $("#timeAccountJob").addEventListener("change", renderWork);
  ["ledgerJobFilter", "ledgerMonthFilter", "ledgerDateFrom", "ledgerDateTo"].forEach((id) => $(`#${id}`).addEventListener("input", renderWork));
  $("#exportShiftsCsv").addEventListener("click", exportFilteredShiftCsv);
  $("#exportShiftsPdf").addEventListener("click", exportFilteredShiftPdf);
  $("#emailLedgerButton").addEventListener("click", emailLedger);
  $("#whatsAppLedgerButton").addEventListener("click", whatsAppLedger);
  $("#exportMoneyCsv").addEventListener("click", () => downloadCsv("control-center-hillary-21-money.csv", moneyCsvRows()));
  $("#downloadIcsButton").addEventListener("click", downloadCalendarFile);
  $("#exportDataButton").addEventListener("click", exportData);
  $("#importDataButton").addEventListener("click", () => $("#importDataInput").click());
  $("#importDataInput").addEventListener("change", importData);
  $("#confirmImportButton").addEventListener("click", confirmImportData);
  $("#rejectImportButton").addEventListener("click", closeImportPreview);
  $("#cancelImportPreview").addEventListener("click", closeImportPreview);
  $("#resetDataButton").addEventListener("click", resetData);
  $("#aiForm").addEventListener("submit", handleAiQuestion);
}

function bindInstall() {
  const canInstallNow = !isStandaloneApp();
  $("#installButton").hidden = !canInstallNow;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("#installButton").hidden = !shouldShowInstallButton(true);
  });
  $("#installButton").addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $("#installButton").hidden = !shouldShowInstallButton(false);
      return;
    }
    $("#installDialog").showModal();
  });
  $("#closeInstallDialog").addEventListener("click", () => $("#installDialog").close());
}

function shouldShowInstallButton(canInstall) {
  return canInstall && !isStandaloneApp();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

function renderAll() {
  renderDashboard();
  renderWork();
  renderFinance();
  renderScholarships();
  renderPermit();
  renderCalendar();
  renderAi();
  renderSettings();
}

function getAnalytics() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const month = getMonthKey(today());
  const yearlyShifts = state.shifts.filter((shift) => new Date(shift.date).getFullYear() === now.getFullYear());
  const weeklyShifts = state.shifts.filter((shift) => inRange(new Date(shift.date), weekStart, weekEnd));
  const weeklyHours = sum(weeklyShifts.map((shift) => shift.workedMinutes / 60));
  const actualShiftDays = new Set(yearlyShifts.filter((shift) => shift.workedMinutes > 0).map((shift) => shift.date)).size;
  const yearlyDayUnits = sum(yearlyShifts.map((shift) => legalDayEquivalent(shift.workedMinutes / 60)));
  const weeklyExtra = Math.max(0, weeklyHours - state.settings.weeklyLimitHours);
  const expectedPay = sum(state.shifts.map((shift) => shift.grossPayExpected));
  const monthIncome = sum(state.transactions.filter((item) => item.kind === "income" && getMonthKey(item.date) === month).map((item) => item.amount));
  const monthExpenses = sum(state.transactions.filter((item) => item.kind === "expense" && getMonthKey(item.date) === month).map((item) => item.amount));
  const workIncomeThisMonth = sum(state.shifts.filter((shift) => getMonthKey(shift.date) === month).map((shift) => shift.grossPayExpected));
  const balance = monthIncome + workIncomeThisMonth - monthExpenses;
  return {
    weeklyHours,
    yearlyDayUnits,
    actualShiftDays,
    weeklyExtra,
    bankedExtra: calculateTotalBankedHours(state),
    expectedPay,
    monthIncome,
    monthExpenses,
    workIncomeThisMonth,
    balance,
    remainingWeekly: state.settings.weeklyLimitHours - weeklyHours,
    remainingDays: state.settings.yearlyDayLimit - yearlyDayUnits
  };
}

function renderDashboard() {
  const data = getAnalytics();
  $("#todayPill").textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  $("#metricGrid").innerHTML = [
    metric("Weekly hours", `${formatHours(data.weeklyHours)} h`, `${formatHours(Math.max(0, data.remainingWeekly))} h remaining`, data.remainingWeekly < 0 ? "status-danger" : "status-good"),
    metric("Day equivalents", `${formatNumber(data.yearlyDayUnits)} / ${state.settings.yearlyDayLimit}`, `${data.actualShiftDays} actual shift days`, data.remainingDays < 0 ? "status-danger" : "status-good"),
    metric("Expected gross", formatMoney(data.expectedPay), "From logged work hours", "status-good"),
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
  const percent = pct(data.weeklyHours, state.settings.weeklyLimitHours);
  const status = data.weeklyHours > state.settings.weeklyLimitHours ? "Over limit" : data.weeklyHours >= state.settings.weeklyLimitHours * 0.85 ? "Approaching limit" : "Safe";
  $("#weeklyComplianceBand").innerHTML = `<strong class="${data.weeklyHours > state.settings.weeklyLimitHours ? "status-danger" : "status-good"}">${escapeHtml(status)}</strong><p>${formatHours(data.weeklyHours)} of ${formatHours(state.settings.weeklyLimitHours)} hours this week. Breaks are excluded.</p>`;
  $("#complianceProgress").innerHTML = [
    progressRow("Weekly work-limit model", percent, `${formatHours(data.weeklyHours)} / ${formatHours(state.settings.weeklyLimitHours)} h`),
    progressRow("Legal day-equivalent model", pct(data.yearlyDayUnits, state.settings.yearlyDayLimit), `${formatNumber(data.yearlyDayUnits)} / ${state.settings.yearlyDayLimit}`),
    progressRow("Actual shift days", pct(data.actualShiftDays, state.settings.yearlyDayLimit), `${data.actualShiftDays} days`),
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
  $("#categoryBreakdown").innerHTML = grouped.length ? grouped.slice(0, 5).map(([cat, amount]) => `<div class="list-row"><span>${escapeHtml(cat)}</span><strong>${formatMoney(amount)}</strong></div>`).join("") : `<p class="muted">No expenses recorded yet.</p>`;
}

function renderDeadlineList() {
  const events = calendarEvents().filter((event) => event.date).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
  $("#deadlineList").innerHTML = events.length ? events.map((event) => `<div class="list-row"><span>${escapeHtml(event.title)}<small>${escapeHtml(event.type)}</small></span><strong>${formatDate(event.date)}</strong></div>`).join("") : `<p class="muted">No deadlines yet.</p>`;
}

function renderPermitSummary() {
  const ready = permitReadiness();
  $("#permitReadinessPercent").textContent = `${ready.percent}%`;
  $("#permitReadinessText").textContent = ready.percent >= 90 ? "Ready for appointment" : "Prepare missing documents before the appointment.";
  $("#missingPermitList").innerHTML = ready.missing.length ? ready.missing.slice(0, 4).map((item) => `<div class="list-row"><span>${escapeHtml(item.name)}</span><strong class="status-warn">${escapeHtml(item.status)}</strong></div>`).join("") : `<p class="muted">All checklist items are ready or not required.</p>`;
}

function renderWork() {
  renderLedgerFilterOptions();
  const data = getAnalytics();
  const selectedJobId = $("#timeAccountJob").value || state.jobs[0]?.id || "";
  const account = getOrCreateAccount(selectedJobId);
  const bankedForJob = selectedJobId ? calculateBankedHours(selectedJobId, state) : 0;
  $("#workMetricGrid").innerHTML = [
    metric("This week", `${formatHours(data.weeklyHours)} h`, `${formatHours(data.weeklyExtra)} h extra`, data.weeklyExtra > 0 ? "status-warn" : "status-good"),
    metric("Actual days", `${data.actualShiftDays}`, `${formatNumber(data.yearlyDayUnits)} legal equivalents`, data.remainingDays < 0 ? "status-danger" : "status-good"),
    metric("Expected gross", formatMoney(data.expectedPay), "All logged shifts", "status-good"),
    metric("Bank total", `${formatHours(data.bankedExtra)} h`, "All jobs", data.bankedExtra > 0 ? "status-warn" : "status-good"),
    metric("Breaks excluded", `${formatHours(totalBreakHours())} h`, "Not counted as work", "")
  ].join("");
  $("#manualTimeCarry").value = account?.manualCarryInOutHours ?? 0;
  $("#compensatedHours").value = account?.compensatedHoursAlreadyTaken ?? 0;
  $("#confirmedBankedHours").value = account?.employerConfirmedBankedHours ?? "";
  $("#bankedExtraHours").textContent = `${formatHours(bankedForJob)} h`;
  $("#timeAccountStatus").textContent = bankedForJob > 0 ? "Carry forward active" : "Balanced";
  $("#timeAccountRows").innerHTML = state.jobs.length ? state.jobs.map((job) => `<div class="list-row"><span>${escapeHtml(jobLabel(job))}</span><strong>${formatHours(calculateBankedHours(job.id, state))} h</strong></div>`).join("") : `<p class="muted">Add a job to track banked hours.</p>`;
  const shifts = getFilteredLedgerShifts();
  $("#shiftRows").innerHTML = shifts.length ? shifts.sort((a, b) => new Date(b.date) - new Date(a.date)).map(renderShiftRow).join("") : `<tr><td colspan="10">No shifts match this ledger filter.</td></tr>`;
  $("#payslipRows").innerHTML = state.payslips.length ? state.payslips.sort((a, b) => b.payrollMonth.localeCompare(a.payrollMonth)).map(renderPayslipRow).join("") : `<tr><td colspan="6">No payslips recorded yet.</td></tr>`;
  bindRowActions();
}

function renderLedgerFilterOptions() {
  const jobOptions = [`<option value="all">All Jobs</option>`, ...state.jobs.map((job) => `<option value="${escapeAttribute(job.id)}">${escapeHtml(jobLabel(job))}</option>`)].join("");
  if ($("#ledgerJobFilter").innerHTML !== jobOptions) $("#ledgerJobFilter").innerHTML = jobOptions;
  const accountOptions = state.jobs.map((job) => `<option value="${escapeAttribute(job.id)}">${escapeHtml(jobLabel(job))}</option>`).join("");
  if ($("#timeAccountJob").innerHTML !== accountOptions) $("#timeAccountJob").innerHTML = accountOptions || `<option value="">No jobs yet</option>`;
}

function renderShiftRow(shift) {
  const calc = calculateShift(shift);
  const job = findById(state.jobs, shift.jobId);
  return `<tr>
    <td>${escapeHtml(formatDate(shift.date))}</td>
    <td><strong>${escapeHtml(jobLabel(job))}</strong><small>${escapeHtml(shift.notes || "")}</small></td>
    <td>${escapeHtml(jobTypeLabel(job?.type || "other"))}</td>
    <td>${escapeHtml(shift.start)} - ${escapeHtml(shift.end)}</td>
    <td>${escapeHtml(String(shift.breakMinutes || 0))} min</td>
    <td><strong>${formatHours(calc.workedHours)} h</strong><small>${calc.dayUnit === 1 ? "full day equivalent" : "half day equivalent"}</small></td>
    <td>${formatMoney(calc.wage)}/h</td>
    <td><strong>${formatMoney(calc.pay)}</strong></td>
    <td>${escapeHtml(shift.paidStatus)}</td>
    <td><div class="row-actions"><button class="quiet-button small" data-edit-shift="${shift.id}">Edit</button><button class="danger-button small" data-delete-shift="${shift.id}">Delete</button></div></td>
  </tr>`;
}

function renderPayslipRow(payslip) {
  return `<tr>
    <td>${escapeHtml(payslip.payrollMonth)}</td>
    <td>${escapeHtml(jobLabel(findById(state.jobs, payslip.jobId)))}</td>
    <td><strong>${formatMoney(payslip.grossPaid, payslip.currency)}</strong></td>
    <td><strong>${formatMoney(payslip.netPaid, payslip.currency)}</strong></td>
    <td>${payslip.hoursPaid === undefined ? "" : `${formatHours(payslip.hoursPaid)} h`}</td>
    <td><div class="row-actions"><button class="quiet-button small" data-edit-payslip="${payslip.id}">Edit</button><button class="danger-button small" data-delete-payslip="${payslip.id}">Delete</button></div></td>
  </tr>`;
}

function renderFinance() {
  const data = getAnalytics();
  $("#quickExpenseChips").innerHTML = CATEGORY_DEFAULTS.slice(0, 9).map((category) => `<button class="chip" type="button" data-quick-category="${escapeAttribute(category)}">${escapeHtml(category)}</button>`).join("");
  $("#financeMetricGrid").innerHTML = [
    metric("Actual bank income", formatMoney(data.monthIncome), "Recorded transactions", "status-good"),
    metric("Expected gross", formatMoney(data.workIncomeThisMonth), "This month shifts", "status-good"),
    metric("Expenses", formatMoney(data.monthExpenses), "This month", data.monthExpenses > state.settings.monthlyBudget && state.settings.monthlyBudget > 0 ? "status-danger" : ""),
    metric("Budget left", formatMoney(state.settings.monthlyBudget - data.monthExpenses), "Monthly budget", state.settings.monthlyBudget - data.monthExpenses < 0 ? "status-danger" : "status-good"),
    metric("Balance", formatMoney(data.balance), "Income + expected gross - expenses", data.balance < 0 ? "status-danger" : "status-good")
  ].join("");
  renderPayReconciliation();
  $("#moneyRows").innerHTML = state.transactions.length ? state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(renderMoneyRow).join("") : `<tr><td colspan="6">No transactions recorded yet.</td></tr>`;
  $$("[data-quick-category]").forEach((button) => button.addEventListener("click", () => openMoneyDialog({ category: button.dataset.quickCategory, kind: button.dataset.quickCategory === "Income" || button.dataset.quickCategory === "Bank income" ? "income" : "expense" })));
  bindRowActions();
}

function renderPayReconciliation() {
  const month = getMonthKey(today());
  $("#payReconciliationRows").innerHTML = state.jobs.length ? state.jobs.map((job) => {
    const expected = getExpectedGrossForJobMonth(job.id, month, state);
    const paidGross = getPayslipGrossForJobMonth(job.id, month, state);
    const paidNet = getPayslipNetForJobMonth(job.id, month, state);
    const unpaid = getUnpaidGrossForJobMonth(job.id, month, state);
    const bank = getActualBankIncomeForJobMonth(job.id, month, state);
    return `<div class="list-row"><span>${escapeHtml(jobLabel(job))}<small>${escapeHtml(month)}</small></span><strong>${formatMoney(expected)} expected | ${formatMoney(paidGross)} gross paid | ${formatMoney(paidNet)} net | ${formatMoney(unpaid)} unpaid | ${formatMoney(bank)} bank</strong></div>`;
  }).join("") : `<p class="muted">Add jobs, shifts, payslips, and bank-income transactions to reconcile pay.</p>`;
}

function renderMoneyRow(item) {
  return `<tr>
    <td>${escapeHtml(formatDate(item.date))}</td>
    <td><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.notes || item.source || "")}</small></td>
    <td>${escapeHtml(item.category)}</td>
    <td>${escapeHtml(item.kind)}</td>
    <td><strong class="${item.kind === "income" ? "status-good" : ""}">${formatMoney(item.amount, item.currency)}</strong></td>
    <td><div class="row-actions"><button class="quiet-button small" data-edit-money="${item.id}">Edit</button><button class="danger-button small" data-delete-money="${item.id}">Delete</button></div></td>
  </tr>`;
}

function renderScholarships() {
  const completed = state.settings.ectsCompleted ?? 0;
  const target = state.settings.ectsTarget ?? 0;
  $("#ectsCompleted").value = completed;
  $("#ectsTarget").value = target;
  $("#ectsPercent").textContent = `${Math.round(pct(completed, target))}%`;
  $("#scholarshipCards").innerHTML = state.scholarships.length ? state.scholarships.sort((a, b) => new Date(a.fundingExpiryDate || "9999-12-31") - new Date(b.fundingExpiryDate || "9999-12-31")).map(renderScholarshipCard).join("") : `<p class="muted">No scholarships yet. Add one to monitor funding and renewal conditions.</p>`;
  $("#academicEventList").innerHTML = state.academicEvents.length ? state.academicEvents.sort((a, b) => new Date(a.date || "9999-12-31") - new Date(b.date || "9999-12-31")).map(renderAcademicEvent).join("") : `<p class="muted">No academic dates yet. Add exams, ECTS deadlines, enrollment tasks, or semester dates.</p>`;
  bindRowActions();
}

function renderScholarshipCard(item) {
  const days = item.fundingExpiryDate ? daysUntil(item.fundingExpiryDate) : null;
  const status = days == null ? "Active" : days < 0 ? "Expired" : days <= 30 ? "Expiring soon" : "Active";
  return `<article class="scholarship-card">
    <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.provider || item.notes || "")}</small></div>
    <div class="tag-line"><span class="tag">${item.expectedMonthlyAmount === undefined ? "Variable" : formatMoney(item.expectedMonthlyAmount, item.currency)}</span><span class="tag">${escapeHtml(status)}</span>${item.ectsRequired ? `<span class="tag">ECTS ${escapeHtml(item.ectsRequired)}</span>` : ""}</div>
    <div><small>Funding expiry</small><strong>${escapeHtml(item.fundingExpiryDate ? formatDate(item.fundingExpiryDate) : "No date")}</strong></div>
    <div class="row-actions"><button class="quiet-button small" data-edit-scholarship="${item.id}">Edit</button><button class="danger-button small" data-delete-scholarship="${item.id}">Delete</button></div>
  </article>`;
}

function renderAcademicEvent(item) {
  return `<div class="calendar-item"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(`${formatDate(item.date)} | ${item.type || "Academic date"} | ${item.status || "unknown"}`)}</small></div><div class="row-actions"><button class="quiet-button small" data-edit-academic="${item.id}">Edit</button><button class="danger-button small" data-delete-academic="${item.id}">Delete</button></div></div>`;
}

function renderPermit() {
  $("#permitAppointment").value = state.settings.permitAppointment || "";
  $("#permitExpiry").value = state.settings.permitExpiry || "";
  const ready = permitReadiness();
  $("#permitReadinessLarge").textContent = `${ready.percent}%`;
  $("#permitChecklist").innerHTML = state.permitItems.map((item) => {
    const detail = item.notes || item.sourceDocument || (item.dueDate ? `Due ${formatDate(item.dueDate)}` : "");
    return `<div class="check-item">
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(detail)}</small></div>
      <span class="status-pill ${item.status === "available" || item.status === "submitted" || item.status === "not_required" ? "status-good" : "status-warn"}">${escapeHtml(item.status)}</span>
      <div class="row-actions"><button class="quiet-button small" data-toggle-permit="${item.id}">Cycle status</button><button class="quiet-button small" data-edit-permit="${item.id}">Edit</button><button class="danger-button small" data-delete-permit="${item.id}">Delete</button></div>
    </div>`;
  }).join("");
  bindRowActions();
}

function renderCalendar() {
  const events = calendarEvents().sort((a, b) => new Date(a.date) - new Date(b.date));
  $("#calendarEvents").innerHTML = events.length ? events.map((event) => `<div class="calendar-item"><div><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(`${event.type} | ${formatDate(event.date)}`)}</small></div><a class="quiet-button small" href="${googleCalendarUrl(event)}" target="_blank" rel="noopener">Google</a></div>`).join("") : `<p class="muted">No events yet. Add shifts, scholarships, or permit dates.</p>`;
}

function renderAi() {
  if (!$("#aiMessages").children.length) {
    $("#aiMessages").innerHTML = `<div class="ai-message assistant"><strong>Assistant</strong><p>Ask about shifts, jobs, pay, banked hours, scholarships, finance, permit checklist, academic events, and exports.</p></div>`;
  }
}

function renderSettings() {
  $("#weeklyLimit").value = state.settings.weeklyLimitHours;
  $("#yearlyDayLimit").value = state.settings.yearlyDayLimit;
  $("#monthlyBudget").value = state.settings.monthlyBudget;
  $("#currencySetting").value = state.settings.currency;
  $("#countryMode").value = state.settings.countryMode || "custom";
  $("#jobList").innerHTML = state.jobs.length ? state.jobs.map((job) => `<div class="job-row"><div><strong>${escapeHtml(job.name || "Job")}</strong><small>${escapeHtml(job.employerName || jobTypeLabel(job.type))}</small></div><strong>${formatMoney(job.hourlyWageGross, job.currency)}/h</strong><div class="row-actions"><button class="quiet-button small" data-edit-job="${job.id}">Edit</button><button class="danger-button small" data-delete-job="${job.id}">Delete</button></div></div>`).join("") : `<p class="muted">No jobs yet. Add a job to keep calculations separated by employer.</p>`;
  bindRowActions();
}

function bindRowActions() {
  $$("[data-edit-shift]").forEach((button) => button.addEventListener("click", () => openShiftDialog(findById(state.shifts, button.dataset.editShift))));
  $$("[data-delete-shift]").forEach((button) => button.addEventListener("click", () => removeItem("shifts", button.dataset.deleteShift)));
  $$("[data-edit-payslip]").forEach((button) => button.addEventListener("click", () => openPayslipDialog(findById(state.payslips, button.dataset.editPayslip))));
  $$("[data-delete-payslip]").forEach((button) => button.addEventListener("click", () => removeItem("payslips", button.dataset.deletePayslip)));
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
    selectField("jobId", "Job profile", state.jobs.map((job) => [job.id, `${jobLabel(job)} (${formatMoney(job.hourlyWageGross, job.currency)}/h)`]), item.jobId || firstJob.id || ""),
    field("start", "Start time", "time", item.start || "09:00"),
    field("end", "End time", "time", item.end || "13:00"),
    field("breakMinutes", "Break minutes", "number", item.breakMinutes ?? 0, "1"),
    selectField("paidStatus", "Paid status", PAID_STATUSES.map((status) => [status, status]), item.paidStatus || "unpaid"),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openPayslipDialog(item = {}) {
  currentDialog = { type: "payslip", id: item.id };
  openDialog("Payslip", item.id ? "Edit payslip" : "Add payslip", [
    selectField("jobId", "Job", state.jobs.map((job) => [job.id, jobLabel(job)]), item.jobId || state.jobs[0]?.id || ""),
    field("payrollMonth", "Payroll month", "month", item.payrollMonth || getMonthKey(today())),
    field("grossPaid", "Gross paid", "number", item.grossPaid || "", "0.01"),
    field("netPaid", "Net paid", "number", item.netPaid || "", "0.01"),
    field("hoursPaid", "Hours paid", "number", item.hoursPaid || "", "0.01"),
    field("paymentDate", "Payment date", "date", item.paymentDate || ""),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openMoneyDialog(item = {}) {
  currentDialog = { type: "money", id: item.id };
  openDialog("Finance", item.id ? "Edit transaction" : "Add transaction", [
    field("date", "Date", "date", item.date || today()),
    selectField("kind", "Kind", MONEY_KINDS.map((kind) => [kind, kind]), item.kind || "expense"),
    selectField("category", "Category", CATEGORY_DEFAULTS.map((cat) => [cat, cat]), item.category || "Food"),
    field("amount", "Amount", "number", item.amount || "", "0.01"),
    field("description", "Description", "text", item.description || ""),
    selectField("linkedJobId", "Linked job", [["", "None"], ...state.jobs.map((job) => [job.id, jobLabel(job)])], item.linkedJobId || ""),
    selectField("linkedPayslipId", "Linked payslip", [["", "None"], ...state.payslips.map((payslip) => [payslip.id, `${jobLabel(findById(state.jobs, payslip.jobId))} ${payslip.payrollMonth}`])], item.linkedPayslipId || ""),
    selectField("linkedScholarshipId", "Linked scholarship", [["", "None"], ...state.scholarships.map((scholarship) => [scholarship.id, scholarship.provider || scholarship.name || "Scholarship"])], item.linkedScholarshipId || ""),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openScholarshipDialog(item = {}) {
  currentDialog = { type: "scholarship", id: item.id };
  openDialog("Scholarship", item.id ? "Edit scholarship" : "Add scholarship", [
    field("name", "Name", "text", item.name || ""),
    field("provider", "Provider", "text", item.provider || ""),
    field("expectedMonthlyAmount", "Expected monthly amount", "number", item.expectedMonthlyAmount || "", "0.01"),
    field("renewalDeadline", "Renewal deadline", "date", item.renewalDeadline || ""),
    field("fundingExpiryDate", "Funding expiry date", "date", item.fundingExpiryDate || ""),
    field("ectsRequired", "ECTS required", "number", item.ectsRequired || "", "1"),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openAcademicDialog(item = {}) {
  currentDialog = { type: "academic", id: item.id };
  openDialog("Academic date", item.id ? "Edit academic date" : "Add academic date", [
    field("title", "Title", "text", item.title || ""),
    field("date", "Date", "date", item.date || today()),
    selectField("type", "Type", [["exam", "Exam"], ["deadline", "Deadline"], ["lecture", "Lecture"], ["assignment", "Assignment"], ["other", "Other"]], item.type || "other"),
    field("ects", "ECTS", "number", item.ects || "", "1"),
    selectField("status", "Status", [["planned", "Planned"], ["registered", "Registered"], ["passed", "Passed"], ["failed", "Failed"], ["unknown", "Unknown"]], item.status || "unknown"),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openPermitDialog(item = {}) {
  currentDialog = { type: "permit", id: item.id };
  openDialog("Residence permit", item.id ? "Edit checklist item" : "Add checklist item", [
    field("name", "Document / task", "text", item.name || ""),
    selectField("status", "Status", PERMIT_STATUSES, item.status || "missing"),
    field("dueDate", "Due date", "date", item.dueDate || ""),
    field("sourceDocument", "Source document", "text", item.sourceDocument || ""),
    field("notes", "Notes", "text", item.notes || "")
  ]);
}

function openJobDialog(item = {}) {
  currentDialog = { type: "job", id: item.id };
  openDialog("Job wages", item.id ? "Edit job" : "Add job", [
    field("name", "Job name", "text", item.name || ""),
    field("employerName", "Employer name", "text", item.employerName || ""),
    selectField("type", "Job type", JOB_TYPES, item.type || "part_time"),
    field("hourlyWageGross", "Hourly wage gross", "number", item.hourlyWageGross || "", "0.01"),
    field("weeklyLimitHours", "Weekly limit hours", "number", item.weeklyLimitHours ?? "", "0.5"),
    field("yearlyDayLimit", "Yearly day limit", "number", item.yearlyDayLimit ?? "", "1"),
    checkboxField("hasWorkingTimeAccount", "Has working time account", item.hasWorkingTimeAccount !== false),
    field("paymentDayOfFollowingMonth", "Payment day next month", "number", item.paymentDayOfFollowingMonth ?? "", "1"),
    field("notes", "Notes", "text", item.notes || "")
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
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const id = currentDialog?.id || crypto.randomUUID();
  if (currentDialog.type === "shift") upsert("shifts", normalizeShift({ id, ...values }, state.jobs));
  if (currentDialog.type === "payslip") upsert("payslips", normalizePayslip({ id, ...values }, state.settings.currency));
  if (currentDialog.type === "money") upsert("transactions", normalizeTransaction({ id, ...values }, state.settings.currency));
  if (currentDialog.type === "scholarship") upsert("scholarships", normalizeScholarship({ id, ...values }, state.settings.currency));
  if (currentDialog.type === "academic") upsert("academicEvents", normalizeAcademicEvent({ id, ...values }));
  if (currentDialog.type === "permit") upsert("permitItems", normalizePermitItem({ id, ...values }));
  if (currentDialog.type === "job") upsert("jobs", normalizeJob({ id, ...values, hasWorkingTimeAccount: values.hasWorkingTimeAccount === "true", currency: state.settings.currency }));
  $("#entryDialog").close();
  saveState();
  renderAll();
}

function updateSettingsFromInputs() {
  const jobId = $("#timeAccountJob").value;
  if (jobId) {
    const account = getOrCreateAccount(jobId);
    account.manualCarryInOutHours = number($("#manualTimeCarry").value);
    account.compensatedHoursAlreadyTaken = number($("#compensatedHours").value);
    account.employerConfirmedBankedHours = $("#confirmedBankedHours").value === "" ? undefined : number($("#confirmedBankedHours").value);
    upsert("workingTimeAccounts", account);
  }
  state.settings = {
    ...state.settings,
    weeklyLimitHours: number($("#weeklyLimit").value),
    yearlyDayLimit: number($("#yearlyDayLimit").value),
    monthlyBudget: number($("#monthlyBudget").value),
    currency: String($("#currencySetting").value || "EUR").toUpperCase().slice(0, 3),
    countryMode: $("#countryMode").value || "custom",
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
  if (index >= 0) state[collection][index] = item;
  else state[collection].unshift(item);
}

function removeItem(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function togglePermit(id) {
  const order = ["missing", "available", "submitted", "not_required"];
  state.permitItems = state.permitItems.map((item) => item.id === id ? { ...item, status: order[(order.indexOf(item.status) + 1) % order.length] } : item);
  saveState();
  renderAll();
}

function getFilteredLedgerShifts() {
  const jobId = $("#ledgerJobFilter").value || "all";
  const month = $("#ledgerMonthFilter").value;
  const from = $("#ledgerDateFrom").value;
  const to = $("#ledgerDateTo").value;
  return state.shifts.filter((shift) => {
    if (jobId !== "all" && shift.jobId !== jobId) return false;
    if (month && getMonthKey(shift.date) !== month) return false;
    if (from && shift.date < from) return false;
    if (to && shift.date > to) return false;
    return true;
  });
}

function exportFilteredShiftCsv() {
  const shifts = getFilteredLedgerShifts();
  const title = createLedgerTitleForCurrentFilter();
  downloadText(`${safeFileName(title)}.csv`, ledgerRows(shifts).map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function exportFilteredShiftPdf() {
  const shifts = getFilteredLedgerShifts();
  const title = createLedgerTitleForCurrentFilter();
  const rows = ledgerRows(shifts);
  const html = `<!doctype html><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style><h1>${escapeHtml(title)}</h1><table>${rows.map((row, index) => `<tr>${row.map((cell) => index === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table><script>print()</script>`;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function emailLedger() {
  const title = createLedgerTitleForCurrentFilter();
  const summary = ledgerRows(getFilteredLedgerShifts()).map((row) => row.join(" | ")).join("\n");
  window.location.href = createEmailShareLink(title, summary);
}

function whatsAppLedger() {
  window.open(createWhatsAppShareLink(`${createLedgerTitleForCurrentFilter()}\n${ledgerRows(getFilteredLedgerShifts()).map((row) => row.join(" | ")).join("\n")}`), "_blank", "noopener");
}

function ledgerRows(shifts) {
  return [["Date", "Job", "Employer", "Start", "End", "Break Minutes", "Worked Hours", "Hourly Wage Gross", "Expected Gross Pay", "Paid Status"], ...shifts.map((shift) => {
    const job = findById(state.jobs, shift.jobId) || {};
    const calc = calculateShift(shift);
    return [shift.date, job.name || "Job", job.employerName || "", shift.start, shift.end, String(shift.breakMinutes), calc.workedHours.toFixed(2), calc.wage.toFixed(2), calc.pay.toFixed(2), shift.paidStatus];
  })];
}

function createLedgerTitleForCurrentFilter() {
  const jobId = $("#ledgerJobFilter").value || "all";
  const month = $("#ledgerMonthFilter").value || "all-dates";
  const job = jobId === "all" ? null : findById(state.jobs, jobId);
  return createLedgerTitle(job || { name: "All Jobs", employerName: "All Jobs" }, month);
}

function calculateShift(shift) {
  const job = findById(state.jobs, shift.jobId);
  const workedMinutes = shift.workedMinutes !== undefined ? number(shift.workedMinutes) : calculateWorkedMinutes(shift.start, shift.end, shift.breakMinutes);
  const wage = number(job?.hourlyWageGross);
  return {
    workedHours: workedMinutes / 60,
    wage,
    pay: shift.grossPayExpected !== undefined ? number(shift.grossPayExpected) : (workedMinutes / 60) * wage,
    dayUnit: legalDayEquivalent(workedMinutes / 60)
  };
}

function calculateWorkedMinutes(startValue, endValue, breakMinutesValue) {
  const start = timeToMinutes(startValue);
  let end = timeToMinutes(endValue);
  if (end < start) end += 24 * 60;
  return Math.max(0, end - start - Math.max(0, number(breakMinutesValue)));
}

function legalDayEquivalent(hours) {
  return hours > 4 ? 1 : hours > 0 ? 0.5 : 0;
}

function calculateExtraHoursFromShifts(jobId, data) {
  const job = data.jobs.find((entry) => entry.id === jobId);
  if (!job) return 0;
  const weeklyLimit = job.weeklyLimitHours ?? data.settings.weeklyLimitHours;
  if (!weeklyLimit) return 0;
  const weeks = new Map();
  data.shifts.filter((shift) => shift.jobId === jobId).forEach((shift) => {
    const weekKey = getIsoWeekKey(shift.date);
    weeks.set(weekKey, (weeks.get(weekKey) ?? 0) + shift.workedMinutes / 60);
  });
  return [...weeks.values()].reduce((extra, hours) => extra + Math.max(0, hours - weeklyLimit), 0);
}

function calculateBankedHours(jobId, data) {
  const account = data.workingTimeAccounts.find((entry) => entry.jobId === jobId);
  if (account?.employerConfirmedBankedHours !== undefined) return account.employerConfirmedBankedHours;
  return calculateExtraHoursFromShifts(jobId, data) + number(account?.manualCarryInOutHours) - number(account?.compensatedHoursAlreadyTaken);
}

function calculateTotalBankedHours(data) {
  return data.jobs.reduce((sumValue, job) => sumValue + calculateBankedHours(job.id, data), 0);
}

function getExpectedGrossForJobMonth(jobId, month, data) {
  return sum(data.shifts.filter((shift) => shift.jobId === jobId && getMonthKey(shift.date) === month).map((shift) => shift.grossPayExpected));
}

function getPayslipGrossForJobMonth(jobId, month, data) {
  return sum(data.payslips.filter((payslip) => payslip.jobId === jobId && payslip.payrollMonth === month).map((payslip) => payslip.grossPaid));
}

function getPayslipNetForJobMonth(jobId, month, data) {
  return sum(data.payslips.filter((payslip) => payslip.jobId === jobId && payslip.payrollMonth === month).map((payslip) => payslip.netPaid));
}

function getUnpaidGrossForJobMonth(jobId, month, data) {
  return Math.max(0, getExpectedGrossForJobMonth(jobId, month, data) - getPayslipGrossForJobMonth(jobId, month, data));
}

function getActualBankIncomeForJobMonth(jobId, month, data) {
  return sum(data.transactions.filter((transaction) => transaction.kind === "income" && transaction.linkedJobId === jobId && getMonthKey(transaction.date) === month).map((transaction) => transaction.amount));
}

function createLedgerTitle(job, monthLabel) {
  return `Shift Ledger - ${job.employerName || job.name} - ${monthLabel}`;
}

function createEmailShareLink(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function createWhatsAppShareLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

async function shareLedgerFile(file, title, text) {
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return true;
  }
  return false;
}

function answerFromLocalData(question, data) {
  const q = question.toLowerCase();
  if (q.includes("banked")) {
    const byJob = data.jobs.map((job) => `${job.employerName || job.name}: ${calculateBankedHours(job.id, data).toFixed(2)} h`);
    return `Total banked hours: ${calculateTotalBankedHours(data).toFixed(2)} h.\n${byJob.join("\n")}`;
  }
  if (q.includes("unpaid")) {
    const unpaid = data.jobs.map((job) => {
      const total = data.shifts.filter((shift) => shift.jobId === job.id && shift.paidStatus !== "paid").reduce((totalValue, shift) => totalValue + shift.grossPayExpected, 0);
      return `${job.employerName || job.name}: ${total.toFixed(2)} ${data.settings.currency}`;
    });
    return `Unpaid expected gross by job:\n${unpaid.join("\n")}`;
  }
  if (q.includes("hours") || q.includes("worked")) {
    const byJob = data.jobs.map((job) => `${job.employerName || job.name}: ${(sum(data.shifts.filter((shift) => shift.jobId === job.id).map((shift) => shift.workedMinutes)) / 60).toFixed(2)} h`);
    return `Total recorded worked time: ${(sum(data.shifts.map((shift) => shift.workedMinutes)) / 60).toFixed(2)} h.\n${byJob.join("\n")}`;
  }
  if (q.includes("jobs") || q.includes("employers")) {
    if (!data.jobs.length) return "No jobs are currently recorded.";
    return `Recorded jobs:\n${data.jobs.map((job) => `- ${job.employerName || job.name}`).join("\n")}`;
  }
  if (q.includes("scholarship")) {
    if (!data.scholarships.length) return "No scholarships are currently recorded.";
    return `Scholarships:\n${data.scholarships.map((scholarship) => `- ${scholarship.provider || scholarship.name}: ${scholarship.expectedMonthlyAmount ?? "variable"} ${scholarship.currency}`).join("\n")}`;
  }
  if (q.includes("permit")) {
    if (!data.permitItems.length) return "No permit checklist items are currently recorded.";
    const missing = data.permitItems.filter((item) => item.status === "missing");
    return `Permit checklist: ${missing.length} missing item(s).\n${missing.map((item) => `- ${item.name}`).join("\n")}`;
  }
  return "I can answer questions about shifts, jobs, pay, banked hours, scholarships, finance, permit checklist, academic events, and exports. Ask a specific question.";
}

function handleAiQuestion(event) {
  event.preventDefault();
  const question = $("#aiQuestion").value.trim();
  if (!question) return;
  const answer = answerFromLocalData(question, state);
  $("#aiMessages").insertAdjacentHTML("beforeend", `<div class="ai-message user"><strong>You</strong><p>${escapeHtml(question)}</p></div><div class="ai-message assistant"><strong>Assistant</strong><p>${escapeHtml(answer).replaceAll("\n", "<br>")}</p></div>`);
  $("#aiQuestion").value = "";
}

function calendarEvents() {
  const events = [];
  state.shifts.forEach((shift) => events.push({ type: "Work shift", title: `${jobLabel(findById(state.jobs, shift.jobId))} shift`, date: shift.date, startTime: shift.start, endTime: shift.end, details: `Break: ${shift.breakMinutes || 0} minutes. Expected gross: ${formatMoney(shift.grossPayExpected)}.` }));
  state.scholarships.forEach((scholarship) => {
    if (scholarship.renewalDeadline) events.push({ type: "Scholarship", title: `${scholarship.name} renewal deadline`, date: scholarship.renewalDeadline, details: scholarship.notes || "" });
    if (scholarship.fundingExpiryDate) events.push({ type: "Scholarship", title: `${scholarship.name} funding expires`, date: scholarship.fundingExpiryDate, details: scholarship.notes || "" });
  });
  state.academicEvents.forEach((item) => events.push({ type: "Academic", title: item.title, date: item.date, details: item.notes || "" }));
  if (state.settings.permitAppointment) events.push({ type: "Residence permit", title: "Residence permit appointment", date: state.settings.permitAppointment, details: "Bring all ready documents and copies." });
  if (state.settings.permitExpiry) events.push({ type: "Residence permit", title: "Residence permit expires", date: state.settings.permitExpiry, details: "Renew before this date." });
  return events.filter((event) => event.date);
}

function googleCalendarUrl(event) {
  const start = event.startTime ? `${event.date}T${event.startTime}` : `${event.date}T09:00`;
  const end = event.endTime ? `${event.date}T${event.endTime}` : `${event.date}T10:00`;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${calendarStamp(start)}/${calendarStamp(end)}`, details: event.details || "", location: "" }).toString()}`;
}

function downloadCalendarFile() {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CONTROL CENTER Hillary.21//Public PWA//EN"];
  calendarEvents().forEach((event) => {
    const start = event.startTime ? `${event.date}T${event.startTime}` : `${event.date}T09:00`;
    const end = event.endTime ? `${event.date}T${event.endTime}` : `${event.date}T10:00`;
    lines.push("BEGIN:VEVENT", `UID:${crypto.randomUUID()}@control-center-hillary-21`, `DTSTAMP:${calendarStamp(new Date().toISOString().slice(0, 16))}`, `DTSTART:${calendarStamp(start)}`, `DTEND:${calendarStamp(end)}`, `SUMMARY:${icsText(event.title)}`, `DESCRIPTION:${icsText(event.details || event.type)}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  downloadText("control-center-hillary-21-calendar.ics", lines.join("\r\n"), "text/calendar");
}

function permitReadiness() {
  const total = Math.max(1, state.permitItems.length);
  const ready = state.permitItems.filter((item) => ["available", "submitted", "not_required"].includes(item.status));
  return { percent: Math.round((ready.length / total) * 100), missing: state.permitItems.filter((item) => item.status === "missing") };
}

function groupTransactionsByCategory() {
  const groups = new Map();
  state.transactions.filter((item) => item.kind === "expense").forEach((item) => groups.set(item.category, (groups.get(item.category) || 0) + number(item.amount)));
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}

function getOrCreateAccount(jobId) {
  if (!jobId) return null;
  let account = state.workingTimeAccounts.find((entry) => entry.jobId === jobId);
  if (!account) {
    account = { id: crypto.randomUUID(), jobId, manualCarryInOutHours: 0, compensatedHoursAlreadyTaken: 0, notes: "" };
    state.workingTimeAccounts.push(account);
  }
  return account;
}

function moneyCsvRows() {
  return [["date", "kind", "category", "description", "amount", "currency", "linked_job", "linked_payslip", "linked_scholarship", "source", "notes"], ...state.transactions.map((item) => [item.date, item.kind, item.category, item.description, number(item.amount).toFixed(2), item.currency, item.linkedJobId || "", item.linkedPayslipId || "", item.linkedScholarshipId || "", item.source || "", item.notes || ""])];
}

function downloadCsv(filename, rows) {
  downloadText(filename, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function exportData() {
  downloadText("control-center-hillary-21-data.json", JSON.stringify(validateAndNormalizeAppData(state), null, 2), "application/json");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      pendingImportData = validateAndNormalizeAppData(JSON.parse(String(reader.result || "{}")));
      renderImportPreview(pendingImportData);
      $("#importPreviewDialog").showModal();
    } catch {
      window.alert("The selected file could not be imported because it is not valid CONTROL CENTER Hillary.21 JSON.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function renderImportPreview(data) {
  $("#importPreviewContent").innerHTML = [
    ["Jobs", data.jobs.length],
    ["Shifts", data.shifts.length],
    ["Payslips", data.payslips.length],
    ["Working time accounts", data.workingTimeAccounts.length],
    ["Transactions", data.transactions.length],
    ["Scholarships", data.scholarships.length],
    ["Academic events", data.academicEvents.length],
    ["Permit items", data.permitItems.length]
  ].map(([label, value]) => `<div class="list-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function confirmImportData() {
  if (!pendingImportData) return;
  state = pendingImportData;
  saveState();
  pendingImportData = null;
  closeImportPreview();
  renderAll();
}

function closeImportPreview() {
  pendingImportData = null;
  $("#importPreviewDialog").close();
}

function resetData() {
  if (!window.confirm("Reset all CONTROL CENTER Hillary.21 data for this browser or installed app?")) return;
  state = getEmptyAppData();
  saveState();
  renderAll();
}

function getShiftDuplicateKey(shift) {
  return `${shift.jobId}:${shift.date}:${shift.start}:${shift.end}`;
}

function removeDuplicateShifts(shifts) {
  const seen = new Set();
  return shifts.filter((shift) => {
    const key = getShiftDuplicateKey(shift);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeDuplicatePayslips(payslips) {
  const seen = new Set();
  return payslips.filter((payslip) => {
    const key = `${payslip.jobId}:${payslip.payrollMonth}:${payslip.grossPaid}:${payslip.netPaid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeDuplicateTransactions(transactions) {
  const seen = new Set();
  return transactions.filter((transaction) => {
    const key = `${transaction.date}:${transaction.amount}:${transaction.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function jobLabel(job) {
  if (!job) return "Job";
  return job.employerName ? `${job.employerName} - ${job.name}` : job.name || "Job";
}

function jobTypeLabel(type) {
  return JOB_TYPES.find(([value]) => value === type)?.[1] || "Other";
}

function normalizeJobType(value) {
  const text = String(value || "other").toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
  const map = { "part_time": "part_time", "parttime": "part_time", "mini_job": "mini_job", "minijob": "mini_job", "student_assistant": "student_assistant", "student": "student_assistant", "short_term": "short_term", "internship": "internship", "freelance": "freelance", "full_time": "full_time", "fulltime": "full_time" };
  return map[text] || "other";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return number(value);
}

function pct(value, max) {
  return max ? Math.max(0, (number(value) / number(max)) * 100) : 0;
}

function formatMoney(value, currency = state.settings.currency) {
  const locales = { de: "de-DE", fr: "fr-FR", zh: "zh-CN", sw: "sw-KE", hi: "hi-IN", pt: "pt-PT", ar: "ar-SA" };
  return new Intl.NumberFormat(locales[currentLanguage] || "en-US", { style: "currency", currency: currency || "EUR" }).format(number(value));
}

function formatHours(value) {
  return number(value).toFixed(2).replace(/\.00$/, "");
}

function formatNumber(value) {
  return number(value).toFixed(1).replace(/\.0$/, "");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey(date) {
  return String(date || "").slice(0, 7);
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

function getIsoWeekKey(dateValue) {
  const date = new Date(dateValue);
  return startOfWeek(date).toISOString().slice(0, 10);
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

function safeFileName(value) {
  return String(value || "export").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

if (typeof window !== "undefined") {
  window.StudentControlCenterCore = {
    getEmptyAppData,
    validateAndNormalizeAppData,
    isStandaloneApp,
    getRuntimeMode,
    getStorageKey,
    saveAppData,
    loadAppData,
    shouldShowInstallButton,
    calculateExtraHoursFromShifts,
    calculateBankedHours,
    calculateTotalBankedHours,
    getExpectedGrossForJobMonth,
    getPayslipGrossForJobMonth,
    getPayslipNetForJobMonth,
    getUnpaidGrossForJobMonth,
    getActualBankIncomeForJobMonth,
    createLedgerTitle,
    createEmailShareLink,
    createWhatsAppShareLink,
    shareLedgerFile,
    answerFromLocalData,
    removeDuplicateShifts,
    removeDuplicatePayslips,
    removeDuplicateTransactions
  };
}

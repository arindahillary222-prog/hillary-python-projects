const APP_NAME = "JOB RADER HILLARY.21";
const JobLogic = window.JobRaderJobLogic;
const APPLICATIONS_KEY = "jrh21.applications.v2";
const LEGACY_KEYS = ["jrh21.applications.v1"];
const STATUSES = ["Wishlist", "Applied", "Screening", "Interview", "Offer", "Rejected"];
const PRIVATE_KEY_MATCHERS = [/cv/i, /resume/i, /search/i, /query/i, /history/i, /profile/i, /document/i];
const FUNCTION_BASE = /\.pages\.dev$/i.test(window.location.hostname) ? "/api" : "/.netlify/functions";
const JOBS_ENDPOINT = `${FUNCTION_BASE}/jobs`;
const ALERTS_ENDPOINT = `${FUNCTION_BASE}/alerts`;
const LOCATION_ENDPOINT = `${FUNCTION_BASE}/location`;
const LANGUAGE_KEY = "jrh21.language";
const THEME_KEY = "jrh21.theme";
const ALERTS_KEY = "jrh21.jobAlerts.v1";
const AUTO_SEARCH_MIN_CV_CHARS = 80;
const DEFAULT_RADIUS_KM = 30;
const PDFJS_LIB_URL = "./assets/pdf.min.mjs";
const PDFJS_WORKER_URL = "./assets/pdf.worker.min.mjs";
const MANUAL_QUERY_EXPANSIONS = [
  { test: /\b(civil|construction)\b|\bbau/i, queries: ["Bauingenieur", "Bauingenieurwesen", "construction engineer"] },
  { test: /\bmechanical\b|maschinenbau/i, queries: ["Maschinenbau", "mechanical engineer"] },
  { test: /\belectrical\b|elektro/i, queries: ["Elektroingenieur", "Elektrotechnik", "electrical engineer"] },
  { test: /\bsoftware|developer|entwickler/i, queries: ["Softwareentwickler", "Softwareentwicklung", "developer"] },
  { test: /\bdata|analyst|analytics|analyse/i, queries: ["Data Analyst", "Datenanalyse"] },
  { test: /\bdhl\b|delivery|liefer|kurier|courier|fahrer|fahrrad|bike|paket|zustell/i, queries: ["Lieferfahrer", "Fahrradkurier", "Kurierfahrer", "Paketzusteller", "Auslieferungsfahrer", "Logistik", "Lagerhelfer"] },
  { test: /\blogistics|warehouse|logistik|lager/i, queries: ["Logistik", "Lagerhelfer"] },
  { test: /\bnursing|care|pflege/i, queries: ["Pflegehilfskraft", "Pflegefachkraft", "care assistant"] },
  { test: /\bstudent|werkstudent|studentenjob/i, queries: ["Studentenjob", "Praktikum"] },
  { test: /\bmini\s?job|minijob/i, queries: ["Minijob", "Aushilfe"] },
  { test: /\bpart[\s-]?time|teilzeit/i, queries: ["Teilzeit", "Aushilfe"] }
];

const TRANSLATIONS = {
  en: {
    languageName: "English",
    navUpload: "Upload CV",
    navJobs: "Job Feed",
    navTracker: "Tracker",
    navResume: "AI Resume",
    navDashboard: "Dashboard",
    workspaceEyebrow: "Private career workspace",
    languageLabel: "Language",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    installApp: "Install App",
    clearPrivate: "Clear CV + Searches",
    noCvStored: "No CV stored",
    cvInMemory: "CV in memory",
    cvWorkspace: "CV Workspace",
    cvWorkspaceSub: "Analyze roles with CV text held in memory only.",
    privateMode: "Private mode",
    readyToScore: "Ready to score",
    cvFile: "CV file",
    cvText: "CV text",
    cvTextPlaceholder: "Paste CV text here for stronger match scoring.",
    autoDeleteCv: "Delete CV automatically after this search",
    analyzeMatches: "Analyze Matches",
    deleteCv: "Delete CV",
    privacyActions: "Privacy Actions",
    clearSearchDrafts: "Clear Search Drafts",
    factoryReset: "Factory Reset App",
    uploadNoticeDefault: "Raw CV text is parsed in this browser and kept in page memory only; it is never stored or sent to job boards. CV-driven searches send role terms only. Radius searches send the entered or inferred address to Photon for geocoding; job searches use the coarse postcode/city and selected radius. Clear CV + Searches to erase temporary data.",
    noCvLoaded: "No CV loaded. Upload or paste a CV before matching.",
    cvLoaded: "{name} loaded for this session. Delete it before using another CV.",
    jobFeed: "Job Feed",
    jobFeedSub: "Pull fresh advertised roles, score them against your CV, and save promising leads.",
    freshFeed: "Fresh feed",
    role: "Role",
    rolePlaceholder: "Civil engineering, nursing, design",
    location: "Postal code or city",
    locationPlaceholder: "10115 Berlin, Munich, remote",
    minimumSuccess: "Minimum CV match",
    postedWithin: "Posted within",
    posted24Hours: "24 hours",
    remoteOnly: "Remote only",
    radiusKm: "Radius",
    anyDistance: "Any distance",
    useMyLocation: "Use my location",
    locationDetecting: "Detecting your current region...",
    locationReady: "Location set to {location}. Jobs will be pulled from this region.",
    locationUnavailable: "Location could not be detected. Enter a postal code or city instead.",
    locationPermissionDenied: "Location permission was denied. Enter a postal code or city instead.",
    jobType: "Job type",
    partTime: "Part time",
    studentJob: "Student job",
    miniJob: "Mini job",
    fullTime: "Full time",
    searchLiveJobs: "Search Live Jobs",
    jobAlerts: "Email job alerts",
    jobAlertsSub: "Create an alert from the current role, location, radius, and job-type filters.",
    alertEmail: "Alert email",
    alertEmailPlaceholder: "you@example.com",
    alertName: "Alert name",
    alertNamePlaceholder: "Berlin design jobs",
    createAlert: "Create Alert",
    alertStatusDefault: "Alerts are saved locally now. Email delivery activates when the mail service is connected.",
    alertNeedsRoleEmail: "Enter a role and email before creating an alert.",
    alertSavedLocal: "Alert saved. The app will watch this search locally and the backend will accept it when email delivery is configured.",
    alertSavedServer: "Alert saved on the server. Email delivery will send when the mail provider is configured.",
    alertServerUnavailable: "Alert saved locally. Email delivery needs a verified sender and mail provider configuration.",
    localAlertsMatched: "{count} saved alert(s) match this live search. Email delivery will send them when configured.",
    noAlerts: "No alerts yet",
    deleteAlert: "Delete alert",
    alertCurrentFilters: "Uses current filters",
    anyLocation: "Any location",
    distanceAway: "{distance} km away",
    distanceUnknown: "Distance not verified",
    feedStart: "Upload a CV to instantly pull current jobs, or enter a role to search live jobs.",
    searchCleared: "Search cleared. Upload a CV or enter a role to pull current advertised jobs.",
    enterRoleFirst: "Enter a role or upload a CV so the app can search relevant current jobs.",
    pullingJobs: "Pulling fresh jobs from live sources...",
    autoPullingJobs: "CV detected. Pulling current jobs matched to the CV...",
    searching: "Searching",
    liveJobsLoaded: "{count} fresh {roleWord} from {sources}. Updated {time}.",
    autoJobsLoaded: "{count} current {roleWord} matched to the CV from {sources}. Updated {time}.",
    fallbackJobsLoaded: "Showing broader current jobs because the first search was too narrow.",
    minimumRelaxed: "The app broadened the freshness window but kept CV and role relevance checks on.",
    liveJobsFailed: "Live jobs could not be loaded right now. Check your connection and try again.",
    searchAllSourcesFailed: "The live search failed across all available sources; this is not a no-jobs result. Try again later.",
    locationRequiredForRadius: "Enter a location or explicitly choose Any distance. The selected radius was not removed.",
    locationResolutionFailed: "The selected location could not be verified. Correct it or choose Any distance; no wider search was run.",
    noStrictMatches: "No live vacancies matched the selected role, {days}-day freshness window, and location filters. No limits were widened.",
    noResultsWithSourceFailures: "No verified vacancies were returned from responding sources; because one or more sources failed, this is not a confirmed no-jobs result.",
    noHighMatches: "No 85%+ CV-compatible vacancies were found within the selected radius and last {days} days.",
    strictUnverifiedPlaces: "{count} listing(s) without verifiable workplace distance were excluded.",
    partialSourceFailure: "Some sources failed ({sources}); results may be incomplete.",
    partialQueryFailure: "{count} search request(s) failed; successful results are shown without relaxing filters.",
    sourceAudit: "Sources responding: {responded}. Sources with matching vacancies: {matching}. Failed sources: {failed}.",
    externalSearchTitle: "Search these roles on external job platforms",
    externalSearchNote: "These open the platforms' own pages, not verified vacancies in this feed. Searches use CV-derived role terms and a coarse city/postcode; distance, date and work-type filters are passed only where supported. Check each listing's exact location, date, hours and eligibility. Your CV text is never sent.",
    externalSearchRole: "Role category",
    externalSearchButton: "Search {platform}",
    externalMore: "More boards, university and employer searches",
    externalBrowseOnly: "Browse {platform}",
    originFallbackNotice: "Exact address was not verified; distances use the {precision} fallback. Edit the location field to correct it.",
    remoteDistanceNotice: "Remote vacancies are shown separately and do not have a local workplace distance.",
    noCvJobCategories: "No supported job category could be extracted from this CV. Add a role or paste clearer experience text; no unrelated roles were substituted.",
    zeroRoles: "Finding live jobs",
    freshRoles: "{count} fresh {roleWord}",
    roleWordOne: "role",
    roleWordMany: "roles",
    searchingBoards: "Searching live job boards...",
    noCurrentRoles: "Ready for current jobs",
    emptyFeedBody: "Upload a CV and the app will automatically pull current jobs matched to it across job types.",
    languageRequired: "Language",
    languageGerman: "German",
    languageEnglish: "English",
    languageGermanEnglish: "German + English",
    languageNotMentioned: "Not mentioned",
    applicationTracker: "Application Tracker",
    trackerSub: "Move applications through each stage and remove old records.",
    addApplication: "Add Application",
    jobTitle: "Job title",
    roleTitlePlaceholder: "Role title",
    company: "Company",
    companyNamePlaceholder: "Company name",
    status: "Status",
    link: "Link",
    contact: "Contact",
    contactPlaceholder: "Email or website",
    save: "Save",
    statusWishlist: "Wishlist",
    statusApplied: "Applied",
    statusScreening: "Screening",
    statusInterview: "Interview",
    statusOffer: "Offer",
    statusRejected: "Rejected",
    noApplications: "No applications",
    openApplyPage: "Open apply page",
    aiCoach: "AI CV Coach",
    aiCoachSub: "Generate job-specific CV improvements and a cover letter instantly.",
    copyOutput: "Copy Output",
    targetRole: "Target role",
    targetRolePlaceholder: "Civil engineering assistant",
    jobRequirements: "Job requirements",
    requirementsPlaceholder: "Paste a job description or use a job-card action.",
    output: "Output",
    cvRecommendations: "CV recommendations",
    coverLetter: "Cover letter",
    both: "Both",
    generate: "Generate",
    dashboard: "Dashboard",
    dashboardSub: "Track progress without storing CV text or search history.",
    ready: "Ready",
    dataControls: "Data Controls",
    deleteAllApplications: "Delete All Applications",
    installableApp: "Installable app",
    installTitle: "Install JOB RADER HILLARY.21",
    installAndroid: "Open this site in Chrome, tap the browser menu, then choose Install app or Add to Home screen.",
    installIphone: "Open this site in Safari, tap Share, then choose Add to Home Screen.",
    installLaptop: "Open this site in Chrome or Edge and click the install icon in the address bar, or use the browser menu and choose Install.",
    installNote: "The app is a PWA, so phones and laptops install it from the browser without needing an app-store download.",
    selectedFileNeedsText: "Selected {name}. Supported local formats are PDF, DOCX, and text; paste its text if this file cannot be read.",
    readingPdf: "Reading text from {name}...",
    pdfTextLoaded: "{name} text was extracted in this browser and is ready for matching.",
    pdfTextMissing: "The app could not read useful text from {name}. Paste the CV text instead.",
    readingDocx: "Reading text from {name} in this browser...",
    docxTextLoaded: "{name} text was extracted locally and is ready for matching.",
    docxTextMissing: "The app could not read useful text from {name}. Paste the CV text instead.",
    fileLoaded: "{name} is loaded in memory only. Delete it before uploading another person's CV.",
    fileReadError: "The file could not be read. Paste the CV text instead.",
    cvReady: "CV is ready. Search live jobs to score it against fresh listings.",
    cvDeleted: "CV deleted. You can safely upload a different CV now.",
    cvAndSearchCleared: "CV and search information cleared.",
    confirmFactoryReset: "Delete CV, search drafts, and all saved applications?",
    confirmDeleteApps: "Delete all saved applications?",
    cvDeletedAfterSearch: "CV deleted after this search. Job scores remain visible, but new recommendations need another CV.",
    storageUnavailable: "Applications are kept for this session because browser storage is unavailable.",
    updated: "Updated {time}",
    savedMetric: "Saved",
    bestSuccessMetric: "Best CV match",
    liveAvgMetric: "Average CV match",
    dateNotListed: "date not listed",
    remote: "Remote",
    locationNotListed: "Location not listed",
    uploadCvShort: "upload CV",
    percentSuccess: "CV match",
    percentCompatibility: "CV compatibility",
    originallyPublished: "Originally published",
    cvNeeded: "CV needed",
    percentMatch: "{score}% match",
    interestNotPublished: "Interest not published",
    noSummary: "No summary provided by source.",
    strengths: "Strengths",
    missing: "Missing",
    applyContact: "Apply/contact",
    uploadCvStrengths: "Upload CV to identify strengths.",
    noMajorGaps: "No major gaps detected.",
    useApplyLink: "Use apply link",
    apply: "Apply",
    cvTips: "CV Tips",
    coverLetterAction: "Cover Letter",
    noCvRecommendation: "Upload or paste a CV to calculate CV compatibility and get targeted improvements.",
    addEvidence: "Add evidence for these job keywords: {keywords}.",
    keepStrengths: "Keep these strengths visible near the top: {strengths}.",
    mirrorTitle: "Mirror the job title \"{title}\" in your summary if it is truthful.",
    addMeasurable: "Add one measurable result for each key project, using numbers, tools, or project size.",
    rewriteProfile: "Before applying, rewrite the profile section and top skills so the first screen matches the role requirements.",
    improveCover: "Your CV already has useful overlap. Improve the cover letter by connecting your strongest match to the company's stated work.",
    recommendationsTitle: "CV recommendations for {role} at {company}",
    estimatedSuccess: "Estimated CV compatibility: {value}",
    uploadCvFirst: "Upload a CV first",
    immediateImprovements: "Immediate improvements",
    keywordsToAdd: "Keywords to add truthfully",
    matchingEvidence: "Best matching evidence already present",
    addCvToDetect: "Add CV text to detect matching evidence.",
    coverDraftTitle: "Cover letter draft for {role} at {company}",
    dearHiringTeam: "Dear Hiring Team,",
    coverIntro: "I am writing to apply for the {role} position at {company}. {line}",
    coverCvLine: "My background aligns most strongly with {strengths}, and I can connect that experience directly to the requirements of this role.",
    coverNoCvLine: "I would tailor this more strongly after adding CV text to the app.",
    coverAttraction: "What attracts me to this role is the chance to contribute to work that requires focus, structure, and practical delivery. {line}",
    coverMissingLine: "I also noticed the role emphasizes {missing}; I would address those points clearly in my CV and interview preparation.",
    coverNoMissingLine: "The role appears to match the current CV language well, so I would keep the application focused and specific.",
    coverClose: "I would welcome the opportunity to discuss how my experience can support your team and contribute from the first weeks of the role.",
    kindRegards: "Kind regards,",
    yourName: "[Your name]",
    beforeSending: "Before sending: replace generic sentences with one concrete project result from your CV.",
    pasteFullJob: "Paste the full job description for a sharper version.",
    installFallback: "Install on Android: Chrome menu > Install app. Install on iPhone: Safari Share > Add to Home Screen. Install on laptop: Chrome or Edge address-bar install icon."
  }
};

const LANGUAGE_META = {
  en: { htmlLang: "en", dir: "ltr" },
  de: { htmlLang: "de", dir: "ltr" },
  fr: { htmlLang: "fr", dir: "ltr" },
  zh: { htmlLang: "zh-CN", dir: "ltr" },
  sw: { htmlLang: "sw", dir: "ltr" },
  hi: { htmlLang: "hi", dir: "ltr" },
  pt: { htmlLang: "pt", dir: "ltr" },
  ar: { htmlLang: "ar", dir: "rtl" }
};

const PARTIAL_TRANSLATIONS = {
  de: {
    languageName: "Deutsch", navUpload: "CV hochladen", navJobs: "Jobbörse", navTracker: "Tracker", navResume: "KI-Lebenslauf", navDashboard: "Dashboard", workspaceEyebrow: "Privater Karrierebereich", languageLabel: "Sprache", themeLabel: "Design", themeLight: "Hell", themeDark: "Dunkel", installApp: "App installieren", clearPrivate: "CV + Suchen löschen", noCvStored: "Kein CV gespeichert", cvInMemory: "CV im Speicher", cvWorkspace: "CV-Arbeitsbereich", cvWorkspaceSub: "Analysiere Rollen mit CV-Text nur im Arbeitsspeicher.", privateMode: "Privater Modus", readyToScore: "Bereit zum Bewerten", cvFile: "CV-Datei", cvText: "CV-Text", cvTextPlaceholder: "CV-Text hier einfügen für stärkere Match-Bewertung.", autoDeleteCv: "CV nach dieser Suche automatisch löschen", analyzeMatches: "Matches analysieren", deleteCv: "CV löschen", privacyActions: "Datenschutzaktionen", clearSearchDrafts: "Suchentwürfe löschen", factoryReset: "App zurücksetzen", uploadNoticeDefault: "CV-Inhalt wird nicht hochgeladen oder im Browser gespeichert.", noCvLoaded: "Kein CV geladen. Lade einen CV hoch oder füge ihn vor dem Matching ein.", cvLoaded: "{name} ist für diese Sitzung geladen. Lösche ihn vor einem anderen CV.", jobFeed: "Jobbörse", jobFeedSub: "Ziehe frische Stellen, bewerte sie gegen deinen CV und speichere gute Chancen.", freshFeed: "Frischer Feed", role: "Rolle", location: "Ort", minimumSuccess: "Mindesterfolg", postedWithin: "Veröffentlicht in", remoteOnly: "Nur Remote", searchLiveJobs: "Live-Jobs suchen", feedStart: "CV hochladen, um sofort aktuelle Jobs zu laden, oder Rolle eingeben.", searchCleared: "Suche gelöscht. Rolle eingeben, um frische Stellen zu laden.", enterRoleFirst: "Gib eine Rolle ein oder lade einen CV hoch, damit die App relevante aktuelle Jobs suchen kann.", pullingJobs: "Frische Jobs werden geladen...", searching: "Suche", liveJobsFailed: "Live-Jobs konnten gerade nicht geladen werden. Verbindung prüfen und erneut versuchen.", zeroRoles: "0 Rollen", roleWordOne: "Rolle", roleWordMany: "Rollen", searchingBoards: "Live-Jobbörsen werden durchsucht...", noCurrentRoles: "Bereit für aktuelle Jobs", emptyFeedBody: "Suche echte ausgeschriebene Jobs nach Rolle und Ort. Lade zuerst einen CV hoch, um Match- und Erfolgswerte zu sehen.", applicationTracker: "Bewerbungs-Tracker", trackerSub: "Bewege Bewerbungen durch jede Phase und entferne alte Einträge.", addApplication: "Bewerbung hinzufügen", jobTitle: "Jobtitel", company: "Unternehmen", status: "Status", link: "Link", contact: "Kontakt", save: "Speichern", statusWishlist: "Wunschliste", statusApplied: "Beworben", statusScreening: "Screening", statusInterview: "Interview", statusOffer: "Angebot", statusRejected: "Abgelehnt", noApplications: "Keine Bewerbungen", openApplyPage: "Bewerbungsseite öffnen", aiCoach: "KI-CV-Coach", aiCoachSub: "Erzeuge sofort jobbezogene CV-Verbesserungen und Anschreiben.", copyOutput: "Ausgabe kopieren", targetRole: "Zielrolle", jobRequirements: "Jobanforderungen", output: "Ausgabe", cvRecommendations: "CV-Empfehlungen", coverLetter: "Anschreiben", both: "Beides", generate: "Generieren", dashboard: "Dashboard", dashboardSub: "Verfolge Fortschritt ohne CV-Text oder Suchverlauf zu speichern.", ready: "Bereit", dataControls: "Datenkontrollen", deleteAllApplications: "Alle Bewerbungen löschen", installableApp: "Installierbare App", installTitle: "JOB RADER HILLARY.21 installieren", installAndroid: "Öffne diese Seite in Chrome, tippe auf das Browsermenü und wähle App installieren oder Zum Startbildschirm hinzufügen.", installIphone: "Öffne diese Seite in Safari, tippe auf Teilen und wähle Zum Home-Bildschirm.", installLaptop: "Öffne diese Seite in Chrome oder Edge und klicke auf das Installationssymbol oder nutze das Browsermenü.", installNote: "Die App ist eine PWA, sodass Phones und Laptops sie direkt aus dem Browser installieren können.", selectedFileNeedsText: "{name} ausgewählt. Füge den CV-Text für detailliertes Matching ein.", fileLoaded: "{name} ist nur im Speicher geladen. Lösche ihn vor dem CV einer anderen Person.", fileReadError: "Die Datei konnte nicht gelesen werden. Füge den CV-Text stattdessen ein.", cvReady: "CV ist bereit. Suche Live-Jobs, um ihn gegen frische Anzeigen zu bewerten.", cvDeleted: "CV gelöscht. Du kannst jetzt sicher einen anderen CV hochladen.", cvAndSearchCleared: "CV und Suchinformationen gelöscht.", confirmFactoryReset: "CV, Suchentwürfe und alle gespeicherten Bewerbungen löschen?", confirmDeleteApps: "Alle gespeicherten Bewerbungen löschen?", updated: "Aktualisiert {time}", savedMetric: "Gespeichert", bestSuccessMetric: "Bester Erfolg", liveAvgMetric: "Live-Schnitt", apply: "Bewerben", cvTips: "CV-Tipps", coverLetterAction: "Anschreiben"
  },
  fr: {
    languageName: "Français", navUpload: "Importer CV", navJobs: "Offres", navTracker: "Suivi", navResume: "CV IA", navDashboard: "Tableau", workspaceEyebrow: "Espace carrière privé", languageLabel: "Langue", themeLabel: "Thème", themeLight: "Clair", themeDark: "Sombre", installApp: "Installer", clearPrivate: "Effacer CV + recherches", noCvStored: "Aucun CV stocké", cvInMemory: "CV en mémoire", cvWorkspace: "Espace CV", cvWorkspaceSub: "Analyse les rôles avec le CV gardé seulement en mémoire.", privateMode: "Mode privé", readyToScore: "Prêt à noter", cvFile: "Fichier CV", cvText: "Texte du CV", autoDeleteCv: "Supprimer le CV après cette recherche", analyzeMatches: "Analyser", deleteCv: "Supprimer CV", privacyActions: "Confidentialité", clearSearchDrafts: "Effacer recherches", factoryReset: "Réinitialiser", uploadNoticeDefault: "Le CV n'est pas téléversé ni stocké dans le navigateur.", noCvLoaded: "Aucun CV chargé. Importez ou collez un CV avant le matching.", jobFeed: "Offres", jobFeedSub: "Charge des offres récentes, les note avec votre CV et sauvegarde les meilleures.", freshFeed: "Flux frais", role: "Rôle", location: "Lieu", minimumSuccess: "Succès minimum", postedWithin: "Publié depuis", remoteOnly: "Télétravail", searchLiveJobs: "Chercher offres live", feedStart: "Importez un CV pour charger immédiatement les offres actuelles, ou saisissez un rôle.", applicationTracker: "Suivi des candidatures", trackerSub: "Déplacez les candidatures par étape et supprimez les anciens dossiers.", addApplication: "Ajouter", company: "Entreprise", status: "Statut", contact: "Contact", save: "Sauver", noApplications: "Aucune candidature", aiCoach: "Coach CV IA", aiCoachSub: "Génère des améliorations CV et une lettre de motivation.", coverLetter: "Lettre", both: "Les deux", generate: "Générer", dashboard: "Tableau", ready: "Prêt", installTitle: "Installer JOB RADER HILLARY.21", apply: "Postuler", cvTips: "Conseils CV"
  },
  zh: {
    languageName: "中文", navUpload: "上传简历", navJobs: "职位列表", navTracker: "跟踪", navResume: "AI 简历", navDashboard: "仪表盘", workspaceEyebrow: "私人求职空间", languageLabel: "语言", themeLabel: "主题", themeLight: "浅色", themeDark: "深色", installApp: "安装应用", clearPrivate: "清除简历和搜索", noCvStored: "未保存简历", cvInMemory: "简历在内存中", cvWorkspace: "简历工作区", cvWorkspaceSub: "只在内存中使用简历文本分析职位。", privateMode: "隐私模式", readyToScore: "可评分", cvFile: "简历文件", cvText: "简历文本", autoDeleteCv: "本次搜索后自动删除简历", analyzeMatches: "分析匹配", deleteCv: "删除简历", privacyActions: "隐私操作", clearSearchDrafts: "清除搜索", factoryReset: "重置应用", uploadNoticeDefault: "简历内容不会上传或保存在浏览器中。", noCvLoaded: "未加载简历。请先上传或粘贴简历。", jobFeed: "职位列表", jobFeedSub: "获取最新职位，用简历评分并保存机会。", freshFeed: "实时列表", role: "职位", location: "地点", minimumSuccess: "最低成功率", postedWithin: "发布时间", remoteOnly: "仅远程", searchLiveJobs: "搜索实时职位", applicationTracker: "申请跟踪", addApplication: "添加申请", company: "公司", status: "状态", contact: "联系方式", save: "保存", noApplications: "没有申请", aiCoach: "AI 简历教练", coverLetter: "求职信", both: "两者", generate: "生成", dashboard: "仪表盘", ready: "就绪", apply: "申请", cvTips: "简历建议"
  },
  sw: {
    languageName: "Kiswahili", navUpload: "Pakia CV", navJobs: "Ajira", navTracker: "Ufuatiliaji", navResume: "CV ya AI", navDashboard: "Dashibodi", workspaceEyebrow: "Eneo binafsi la kazi", languageLabel: "Lugha", themeLabel: "Mwonekano", themeLight: "Mwangaza", themeDark: "Giza", installApp: "Sakinisha App", clearPrivate: "Futa CV + Utafutaji", noCvStored: "Hakuna CV iliyohifadhiwa", cvInMemory: "CV iko kwenye kumbukumbu", cvWorkspace: "Eneo la CV", privateMode: "Hali binafsi", cvFile: "Faili la CV", cvText: "Maandishi ya CV", autoDeleteCv: "Futa CV baada ya utafutaji huu", analyzeMatches: "Chambua Mechi", deleteCv: "Futa CV", privacyActions: "Faragha", noCvLoaded: "Hakuna CV iliyopakiwa. Pakia au bandika CV kwanza.", jobFeed: "Ajira", role: "Nafasi", location: "Mahali", remoteOnly: "Mbali tu", searchLiveJobs: "Tafuta Ajira Mpya", applicationTracker: "Ufuatiliaji wa Maombi", addApplication: "Ongeza Ombi", company: "Kampuni", status: "Hali", contact: "Mawasiliano", save: "Hifadhi", noApplications: "Hakuna maombi", aiCoach: "Mshauri wa CV wa AI", coverLetter: "Barua ya Maombi", both: "Vyote", generate: "Tengeneza", dashboard: "Dashibodi", ready: "Tayari", apply: "Omba", cvTips: "Ushauri wa CV"
  },
  hi: {
    languageName: "हिन्दी", navUpload: "CV अपलोड करें", navJobs: "नौकरियां", navTracker: "ट्रैकर", navResume: "AI रिज्यूमे", navDashboard: "डैशबोर्ड", workspaceEyebrow: "निजी करियर कार्यक्षेत्र", languageLabel: "भाषा", themeLabel: "थीम", themeLight: "लाइट", themeDark: "डार्क", installApp: "ऐप इंस्टॉल करें", clearPrivate: "CV + खोज हटाएं", noCvStored: "कोई CV सेव नहीं", cvInMemory: "CV मेमोरी में है", cvWorkspace: "CV कार्यक्षेत्र", privateMode: "निजी मोड", cvFile: "CV फाइल", cvText: "CV टेक्स्ट", autoDeleteCv: "इस खोज के बाद CV अपने आप हटाएं", analyzeMatches: "मैच विश्लेषण", deleteCv: "CV हटाएं", privacyActions: "गोपनीयता", noCvLoaded: "कोई CV लोड नहीं। मैचिंग से पहले CV अपलोड या पेस्ट करें।", jobFeed: "नौकरियां", role: "भूमिका", location: "स्थान", remoteOnly: "केवल रिमोट", searchLiveJobs: "लाइव नौकरियां खोजें", applicationTracker: "आवेदन ट्रैकर", addApplication: "आवेदन जोड़ें", company: "कंपनी", status: "स्थिति", contact: "संपर्क", save: "सेव", noApplications: "कोई आवेदन नहीं", aiCoach: "AI CV कोच", coverLetter: "कवर लेटर", both: "दोनों", generate: "जनरेट", dashboard: "डैशबोर्ड", ready: "तैयार", apply: "आवेदन करें", cvTips: "CV सुझाव"
  },
  pt: {
    languageName: "Português", navUpload: "Enviar CV", navJobs: "Vagas", navTracker: "Rastreador", navResume: "CV IA", navDashboard: "Painel", workspaceEyebrow: "Espaço privado de carreira", languageLabel: "Idioma", themeLabel: "Tema", themeLight: "Claro", themeDark: "Escuro", installApp: "Instalar App", clearPrivate: "Limpar CV + buscas", noCvStored: "Nenhum CV salvo", cvInMemory: "CV na memória", cvWorkspace: "Área do CV", privateMode: "Modo privado", cvFile: "Arquivo CV", cvText: "Texto do CV", autoDeleteCv: "Excluir CV após esta busca", analyzeMatches: "Analisar Matches", deleteCv: "Excluir CV", privacyActions: "Privacidade", noCvLoaded: "Nenhum CV carregado. Envie ou cole um CV antes do matching.", jobFeed: "Vagas", role: "Cargo", location: "Local", remoteOnly: "Só remoto", searchLiveJobs: "Buscar vagas ao vivo", applicationTracker: "Rastreador de candidaturas", addApplication: "Adicionar candidatura", company: "Empresa", status: "Status", contact: "Contato", save: "Salvar", noApplications: "Nenhuma candidatura", aiCoach: "Coach de CV IA", coverLetter: "Carta de apresentação", both: "Ambos", generate: "Gerar", dashboard: "Painel", ready: "Pronto", apply: "Candidatar", cvTips: "Dicas de CV"
  },
  ar: {
    languageName: "العربية", navUpload: "رفع السيرة", navJobs: "الوظائف", navTracker: "المتابعة", navResume: "سيرة بالذكاء الاصطناعي", navDashboard: "لوحة التحكم", workspaceEyebrow: "مساحة مهنية خاصة", languageLabel: "اللغة", themeLabel: "المظهر", themeLight: "فاتح", themeDark: "داكن", installApp: "تثبيت التطبيق", clearPrivate: "مسح السيرة والبحث", noCvStored: "لا توجد سيرة محفوظة", cvInMemory: "السيرة في الذاكرة", cvWorkspace: "مساحة السيرة", privateMode: "وضع خاص", cvFile: "ملف السيرة", cvText: "نص السيرة", autoDeleteCv: "حذف السيرة بعد هذا البحث", analyzeMatches: "تحليل المطابقة", deleteCv: "حذف السيرة", privacyActions: "إجراءات الخصوصية", noCvLoaded: "لا توجد سيرة محملة. ارفع أو الصق سيرة قبل المطابقة.", jobFeed: "الوظائف", role: "الدور", location: "الموقع", remoteOnly: "عن بعد فقط", searchLiveJobs: "بحث وظائف مباشرة", applicationTracker: "متابعة الطلبات", addApplication: "إضافة طلب", company: "الشركة", status: "الحالة", contact: "التواصل", save: "حفظ", noApplications: "لا توجد طلبات", aiCoach: "مدرب السيرة بالذكاء الاصطناعي", coverLetter: "خطاب التقديم", both: "كلاهما", generate: "إنشاء", dashboard: "لوحة التحكم", ready: "جاهز", apply: "تقديم", cvTips: "نصائح للسيرة", installTitle: "تثبيت JOB RADER HILLARY.21"
  }
};

for (const [lang, values] of Object.entries(PARTIAL_TRANSLATIONS)) {
  TRANSLATIONS[lang] = { ...TRANSLATIONS.en, ...values };
}

const FILTER_TRANSLATIONS = {
  de: { radiusKm: "Radius", anyDistance: "Jede Entfernung", jobType: "Jobart", partTime: "Teilzeit", studentJob: "Studentenjob", miniJob: "Minijob", fullTime: "Vollzeit", jobAlerts: "E-Mail-Jobalarme", alertEmail: "Alarm-E-Mail", alertName: "Alarmname", createAlert: "Alarm erstellen", deleteAlert: "Alarm löschen", noAlerts: "Noch keine Alarme", posted24Hours: "24 Stunden", feedStart: "CV hochladen, um sofort aktuelle Jobs zu laden, oder Rolle eingeben.", searchCleared: "Suche gelöscht. CV hochladen oder Rolle eingeben, um aktuelle Jobs zu laden.", enterRoleFirst: "Gib eine Rolle ein oder lade einen CV hoch, damit die App relevante aktuelle Jobs suchen kann.", autoPullingJobs: "CV erkannt. Aktuelle Jobs werden passend zum CV geladen...", noCurrentRoles: "Bereit für aktuelle Jobs", emptyFeedBody: "CV hochladen und die App lädt passende aktuelle Jobs aus allen Jobtypen.", languageRequired: "Sprache", languageGerman: "Deutsch", languageEnglish: "Englisch", languageGermanEnglish: "Deutsch + Englisch", languageNotMentioned: "Nicht erwähnt", distanceAway: "{distance} km entfernt", distanceUnknown: "Entfernung nicht verifiziert" },
  fr: { radiusKm: "Rayon", anyDistance: "Toute distance", jobType: "Type d'emploi", partTime: "Temps partiel", studentJob: "Job étudiant", miniJob: "Mini-job", fullTime: "Temps plein", jobAlerts: "Alertes e-mail", alertEmail: "E-mail d'alerte", alertName: "Nom de l'alerte", createAlert: "Créer alerte", deleteAlert: "Supprimer alerte", noAlerts: "Aucune alerte", posted24Hours: "24 heures", noCurrentRoles: "Prêt pour les offres actuelles", languageRequired: "Langue", languageGerman: "Allemand", languageEnglish: "Anglais", languageGermanEnglish: "Allemand + anglais", languageNotMentioned: "Non mentionné", distanceAway: "{distance} km", distanceUnknown: "Distance non vérifiée" },
  zh: { radiusKm: "半径", anyDistance: "任意距离", jobType: "工作类型", partTime: "兼职", studentJob: "学生工作", miniJob: "迷你工作", fullTime: "全职", jobAlerts: "邮件提醒", alertEmail: "提醒邮箱", alertName: "提醒名称", createAlert: "创建提醒", deleteAlert: "删除提醒", noAlerts: "暂无提醒", posted24Hours: "24 小时", noCurrentRoles: "准备加载当前职位", languageRequired: "语言", languageGerman: "德语", languageEnglish: "英语", languageGermanEnglish: "德语 + 英语", languageNotMentioned: "未提及", distanceAway: "{distance} 公里", distanceUnknown: "距离未验证" },
  sw: { radiusKm: "Umbali", anyDistance: "Umbali wowote", jobType: "Aina ya kazi", partTime: "Muda mfupi", studentJob: "Kazi ya mwanafunzi", miniJob: "Mini job", fullTime: "Muda wote", jobAlerts: "Arifa za barua pepe", alertEmail: "Barua pepe", alertName: "Jina la arifa", createAlert: "Tengeneza Arifa", deleteAlert: "Futa arifa", noAlerts: "Hakuna arifa", posted24Hours: "Saa 24", noCurrentRoles: "Tayari kwa ajira mpya", languageRequired: "Lugha", languageGerman: "Kijerumani", languageEnglish: "Kiingereza", languageGermanEnglish: "Kijerumani + Kiingereza", languageNotMentioned: "Haijatajwa", distanceAway: "{distance} km mbali", distanceUnknown: "Umbali haujathibitishwa" },
  hi: { radiusKm: "दायरा", anyDistance: "कोई भी दूरी", jobType: "नौकरी का प्रकार", partTime: "पार्ट टाइम", studentJob: "स्टूडेंट जॉब", miniJob: "मिनी जॉब", fullTime: "फुल टाइम", jobAlerts: "ईमेल जॉब अलर्ट", alertEmail: "अलर्ट ईमेल", alertName: "अलर्ट नाम", createAlert: "अलर्ट बनाएं", deleteAlert: "अलर्ट हटाएं", noAlerts: "कोई अलर्ट नहीं", posted24Hours: "24 घंटे", noCurrentRoles: "लाइव नौकरियों के लिए तैयार", languageRequired: "भाषा", languageGerman: "जर्मन", languageEnglish: "अंग्रेज़ी", languageGermanEnglish: "जर्मन + अंग्रेज़ी", languageNotMentioned: "नहीं बताया गया", distanceAway: "{distance} किमी दूर", distanceUnknown: "दूरी सत्यापित नहीं" },
  pt: { radiusKm: "Raio", anyDistance: "Qualquer distância", jobType: "Tipo de vaga", partTime: "Meio período", studentJob: "Vaga de estudante", miniJob: "Mini job", fullTime: "Tempo integral", jobAlerts: "Alertas por e-mail", alertEmail: "E-mail do alerta", alertName: "Nome do alerta", createAlert: "Criar alerta", deleteAlert: "Excluir alerta", noAlerts: "Sem alertas", posted24Hours: "24 horas", noCurrentRoles: "Pronto para vagas atuais", languageRequired: "Idioma", languageGerman: "Alemão", languageEnglish: "Inglês", languageGermanEnglish: "Alemão + inglês", languageNotMentioned: "Não mencionado", distanceAway: "{distance} km de distância", distanceUnknown: "Distância não verificada" },
  ar: { radiusKm: "النطاق", anyDistance: "أي مسافة", jobType: "نوع الوظيفة", partTime: "دوام جزئي", studentJob: "وظيفة طالب", miniJob: "عمل صغير", fullTime: "دوام كامل", jobAlerts: "تنبيهات البريد", alertEmail: "بريد التنبيه", alertName: "اسم التنبيه", createAlert: "إنشاء تنبيه", deleteAlert: "حذف التنبيه", noAlerts: "لا توجد تنبيهات", posted24Hours: "24 ساعة", noCurrentRoles: "جاهز للوظائف الحالية", languageRequired: "اللغة", languageGerman: "الألمانية", languageEnglish: "الإنجليزية", languageGermanEnglish: "الألمانية + الإنجليزية", languageNotMentioned: "غير مذكور", distanceAway: "{distance} كم", distanceUnknown: "المسافة غير مؤكدة" }
};

for (const [lang, values] of Object.entries(FILTER_TRANSLATIONS)) {
  TRANSLATIONS[lang] = { ...TRANSLATIONS[lang], ...values };
}

const LIVE_FEED_OVERRIDES = {
  en: { zeroRoles: "Finding live jobs" },
  de: { zeroRoles: "Live-Jobs werden gesucht" },
  fr: { zeroRoles: "Recherche d'offres actuelles" },
  zh: { zeroRoles: "正在查找实时职位" },
  sw: { zeroRoles: "Inatafuta ajira mpya" },
  hi: { zeroRoles: "लाइव नौकरियां खोजी जा रही हैं" },
  pt: { zeroRoles: "Buscando vagas atuais" },
  ar: { zeroRoles: "جار البحث عن وظائف حالية" }
};

for (const [lang, values] of Object.entries(LIVE_FEED_OVERRIDES)) {
  TRANSLATIONS[lang] = { ...TRANSLATIONS[lang], ...values };
}

let cvMemory = null;
let deferredInstallPrompt = null;
let lastResults = [];
let selectedJob = null;
let autoSearchTimer = null;
let lastAutoCvSignature = "";
let activeSearchToken = 0;
let resolvedOriginMemory = null;
let lastExternalSearchConfig = null;
let pdfjsPromise = null;
let applications = loadApplications();
let jobAlerts = loadJobAlerts();
let currentLanguage = loadPreference(LANGUAGE_KEY, "en");
let currentTheme = loadPreference(THEME_KEY, "light");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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

function bindPreferences() {
  const languageSelect = $("#languageSelect");
  const themeSelect = $("#themeSelect");
  languageSelect.value = currentLanguage;
  themeSelect.value = currentTheme;
  languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
  themeSelect.addEventListener("change", () => setTheme(themeSelect.value));
}

function setLanguage(language) {
  currentLanguage = TRANSLATIONS[language] ? language : "en";
  savePreference(LANGUAGE_KEY, currentLanguage);
  applyPreferences();
  applyTranslations();
  renderJobs(lastResults);
  renderJobAlerts();
  renderTracker();
  renderDashboard();
  updatePrivacyStatus();
}

function setTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  savePreference(THEME_KEY, currentTheme);
  applyPreferences();
}

function applyPreferences() {
  const meta = LANGUAGE_META[currentLanguage] || LANGUAGE_META.en;
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dir = meta.dir;
  document.documentElement.dataset.theme = currentTheme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = currentTheme === "dark" ? "#0e1718" : "#173f3a";
  }
}

function applyTranslations() {
  $$("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });
  $$("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  $$("[data-i18n-title]").forEach((node) => {
    const label = t(node.dataset.i18nTitle);
    node.setAttribute("title", label);
    node.setAttribute("aria-label", label);
  });
  $("#languageSelect").value = currentLanguage;
  $("#themeSelect").value = currentTheme;
  const active = $(".nav-item.active");
  if (active) {
    $("#pageTitle").textContent = t(routeTitleKey(active.dataset.route));
  }
  document.title = APP_NAME;
}

function t(key, vars = {}) {
  const template = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function routeTitleKey(route) {
  return {
    upload: "navUpload",
    jobs: "navJobs",
    tracker: "navTracker",
    resume: "navResume",
    dashboard: "navDashboard"
  }[route] || "navUpload";
}

document.addEventListener("DOMContentLoaded", () => {
  document.title = APP_NAME;
  applyPreferences();
  purgePrivateKeys();
  bindPreferences();
  bindNavigation();
  bindCvControls();
  bindJobSearch();
  bindJobAlerts();
  bindTracker();
  bindResume();
  bindDashboardControls();
  bindInstall();
  registerServiceWorker();
  renderJobs([]);
  renderJobAlerts();
  renderTracker();
  renderDashboard();
  updatePrivacyStatus();
  applyTranslations();
});

function bindNavigation() {
  $$(".nav-item, .brand").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      showRoute(item.dataset.route);
    });
  });
}

function showRoute(route) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === route));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${route}`));
  $("#pageTitle").textContent = t(routeTitleKey(route));
}

function bindCvControls() {
  $("#cvFile").addEventListener("change", handleFileSelection);
  $("#cvText").addEventListener("input", () => {
    const text = $("#cvText").value.trim();
    if (text) {
      cvMemory = {
        name: cvMemory?.name || "Pasted CV text",
        text,
        updatedAt: new Date().toISOString()
      };
    } else if (cvMemory?.name === "Pasted CV text") {
      cvMemory = null;
    }
    refreshScoredJobs();
    updatePrivacyStatus();
    scheduleAutoSearchFromCv();
  });

  $("#cvForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = $("#cvText").value.trim();
    if (text) {
      cvMemory = {
        name: cvMemory?.name || "Pasted CV text",
        text,
        updatedAt: new Date().toISOString()
      };
    }
    if (!cvMemory?.text?.trim()) {
      setNotice(t("noCvLoaded"));
      return;
    }
    ensureLocationAndRadiusFromCv();
    setNotice(t("cvReady"));
    await runAutoSearchFromCv({ force: true, strict: true });
  });

  $("#deleteCvButton").addEventListener("click", () => deleteCv());
  $("#clearPrivateButton").addEventListener("click", clearPrivateWorkspace);
  $("#clearSearchButton").addEventListener("click", clearSearchDrafts);
  $("#factoryResetButton").addEventListener("click", factoryReset);
}

async function handleFileSelection(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const textArea = $("#cvText");
  const pdfFriendly = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  const docxFriendly = /\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const textFriendly = /\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith("text/");
  textArea.value = "";
  cvMemory = null;
  updatePrivacyStatus();

  if (pdfFriendly) {
    try {
      setNotice(t("readingPdf", { name: file.name }));
      const text = await extractPdfText(file);
      if (!text || text.length < 40) {
        throw new Error("No useful text extracted from PDF.");
      }
      textArea.value = text;
      cvMemory = {
        name: file.name,
        text,
        updatedAt: new Date().toISOString()
      };
      refreshScoredJobs();
      setNotice(t("pdfTextLoaded", { name: file.name }));
      updatePrivacyStatus();
      scheduleAutoSearchFromCv({ immediate: true });
    } catch (error) {
      textArea.value = "";
      cvMemory = null;
      setNotice(t("pdfTextMissing", { name: file.name }));
      updatePrivacyStatus();
    }
    return;
  }

  if (docxFriendly) {
    try {
      setNotice(t("readingDocx", { name: file.name }));
      if (!window.mammoth?.extractRawText) throw new Error("Local DOCX parser is unavailable.");
      const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      const text = String(result?.value || "").trim();
      if (text.length < 40) throw new Error("No useful text extracted from DOCX.");
      textArea.value = text;
      cvMemory = { name: file.name, text, updatedAt: new Date().toISOString() };
      refreshScoredJobs();
      setNotice(t("docxTextLoaded", { name: file.name }));
      updatePrivacyStatus();
      scheduleAutoSearchFromCv({ immediate: true });
    } catch {
      textArea.value = "";
      cvMemory = null;
      setNotice(t("docxTextMissing", { name: file.name }));
      updatePrivacyStatus();
    }
    return;
  }

  if (!textFriendly) {
    setNotice(t("selectedFileNeedsText", { name: file.name }));
    updatePrivacyStatus();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "").trim();
    textArea.value = text;
    cvMemory = {
      name: file.name,
      text,
      updatedAt: new Date().toISOString()
    };
    refreshScoredJobs();
    setNotice(t("fileLoaded", { name: file.name }));
    updatePrivacyStatus();
    scheduleAutoSearchFromCv({ immediate: true });
  };
  reader.onerror = () => {
    cvMemory = null;
    updatePrivacyStatus();
    setNotice(t("fileReadError"));
  };
  reader.readAsText(file);
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_LIB_URL).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(JobLogic.extractPdfPageLines(content.items).join("\n"));
  }
  return pages.join("\n\n").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function deleteCv(options = {}) {
  window.clearTimeout(autoSearchTimer);
  activeSearchToken += 1;
  lastAutoCvSignature = "";
  cvMemory = null;
  $("#cvFile").value = "";
  $("#cvText").value = "";
  $("#targetRequirements").value = "";
  purgePrivateKeys();
  refreshScoredJobs();
  updatePrivacyStatus();
  if (!options.quiet) {
    setNotice(t("cvDeleted"));
  }
}

function clearSearchDrafts() {
  $("#roleSearch").value = "";
  $("#locationSearch").value = "";
  resolvedOriginMemory = null;
  lastExternalSearchConfig = null;
  $("#radiusKm").value = String(DEFAULT_RADIUS_KM);
  $("#minMatch").value = "0";
  $("#freshnessDays").value = "14";
  $("#remoteOnly").checked = false;
  $$("input[name='jobType']").forEach((input) => {
    input.checked = false;
  });
  lastResults = [];
  selectedJob = null;
  purgePrivateKeys();
  renderJobs([]);
  $("#feedStatus").textContent = t("searchCleared");
  $("#resultCount").textContent = t("freshFeed");
}

function clearPrivateWorkspace() {
  deleteCv({ quiet: true });
  clearSearchDrafts();
  setNotice(t("cvAndSearchCleared"));
}

function factoryReset() {
  const confirmed = window.confirm(t("confirmFactoryReset"));
  if (!confirmed) {
    return;
  }
  applications = [];
  saveApplications();
  clearPrivateWorkspace();
  renderTracker();
  renderDashboard();
}

function bindJobSearch() {
  $("#jobSearchForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await searchLiveJobs();
  });
  $("#useLocationButton").addEventListener("click", useBrowserLocation);
}

async function useBrowserLocation() {
  const button = $("#useLocationButton");
  if (!navigator.geolocation) {
    $("#feedStatus").textContent = t("locationUnavailable");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "...";
  $("#feedStatus").textContent = t("locationDetecting");

  try {
    const position = await getCurrentPosition();
    const location = await reverseBrowserLocation(position.coords.latitude, position.coords.longitude);
    if (!location) {
      throw new Error("No usable address returned.");
    }
    $("#locationSearch").value = location;
    $("#feedStatus").textContent = t("locationReady", { location });
    if (cvMemory?.text?.trim()) {
      await runAutoSearchFromCv({ force: true });
    } else if ($("#roleSearch").value.trim()) {
      await searchLiveJobs();
    }
  } catch (error) {
    $("#feedStatus").textContent = error?.code === 1
      ? t("locationPermissionDenied")
      : t("locationUnavailable");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 10 * 60 * 1000
    });
  });
}

async function reverseBrowserLocation(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude)
  });
  const response = await fetch(`${LOCATION_ENDPOINT}?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    return "";
  }
  const payload = await response.json();
  return typeof payload.location === "string" ? payload.location : payload.location?.location || "";
}

function scheduleAutoSearchFromCv(options = {}) {
  const text = cvMemory?.text?.trim() || "";
  if (text.length < AUTO_SEARCH_MIN_CV_CHARS) {
    return;
  }
  const signature = `${cvMemory?.name || ""}:${text.slice(0, 220)}:${text.length}`;
  if (signature === lastAutoCvSignature && !options.force) {
    return;
  }
  window.clearTimeout(autoSearchTimer);
  autoSearchTimer = window.setTimeout(() => {
    lastAutoCvSignature = signature;
    runAutoSearchFromCv();
  }, options.immediate ? 0 : 800);
}

function ensureLocationAndRadiusFromCv() {
  if ($("#locationSearch").value.trim()) {
    return;
  }
  const inferred = inferLocationFromCv(cvMemory?.text || "");
  if (inferred) {
    $("#locationSearch").value = inferred;
  }
}

function inferLocationFromCv(text) {
  const address = JobLogic.extractCvProfile(text).address;
  return address?.query || "";
}

function getSelectedJobTypes() {
  return $$("input[name='jobType']:checked").map((input) => input.value);
}

function getCurrentSearchCriteria() {
  return {
    role: $("#roleSearch").value.trim(),
    location: $("#locationSearch").value.trim(),
    radiusKm: Number($("#radiusKm").value || DEFAULT_RADIUS_KM),
    minimum: Number($("#minMatch").value || 0),
    days: Math.min(14, Number($("#freshnessDays").value || 14)),
    remoteOnly: $("#remoteOnly").checked,
    types: getSelectedJobTypes()
  };
}

async function searchLiveJobs() {
  if (cvMemory?.text?.trim()) ensureLocationAndRadiusFromCv();
  const criteria = getCurrentSearchCriteria();
  if (!criteria.role) {
    if (cvMemory?.text?.trim()) {
      await runAutoSearchFromCv({ force: true });
      return;
    }
    $("#feedStatus").textContent = t("enterRoleFirst");
    $("#resultCount").textContent = t("freshFeed");
    renderJobs([]);
    return;
  }
  if (criteria.radiusKm > 0 && !criteria.location && !criteria.remoteOnly) {
    $("#feedStatus").textContent = t("locationRequiredForRadius");
    renderJobs([]);
    return;
  }

  const cvText = cvMemory?.text?.trim() || "";
  const queries = buildManualSearchQueries(criteria.role);
  lastExternalSearchConfig = prepareExternalSearchConfig(criteria, queries, cvText);
  $("#feedStatus").textContent = t("pullingJobs");
  $("#resultCount").textContent = t("searching");
  renderJobs([], { loading: true });
  const token = ++activeSearchToken;
  try {
    const result = await loadLiveJobsStrict({ ...criteria, queries, cvText });
    if (token !== activeSearchToken) return;
    lastResults = result.jobs;
    renderJobs(result.jobs);
    checkLocalAlerts(result.jobs);
    $("#feedStatus").textContent = formatSearchStatus(result, criteria, cvText);
    if ($("#autoDeleteCv").checked && cvText) {
      deleteCv({ quiet: true });
      setNotice(t("cvDeletedAfterSearch"));
    }
  } catch (error) {
    if (token !== activeSearchToken) return;
    lastResults = [];
    renderJobs([]);
    $("#feedStatus").textContent = error?.message || t("liveJobsFailed");
  }
}

async function runAutoSearchFromCv(options = {}) {
  const cvText = cvMemory?.text?.trim() || "";
  if (!cvText) return;
  ensureLocationAndRadiusFromCv();
  const criteria = getCurrentSearchCriteria();
  const queries = criteria.role ? buildManualSearchQueries(criteria.role) : deriveAutoSearchQueries(cvText);
  if (!queries.length) {
    $("#feedStatus").textContent = t("noCvJobCategories");
    renderJobs([]);
    return;
  }
  if (criteria.radiusKm > 0 && !criteria.location && !criteria.remoteOnly) {
    $("#feedStatus").textContent = t("locationRequiredForRadius");
    renderJobs([]);
    showRoute("jobs");
    return;
  }

  lastExternalSearchConfig = prepareExternalSearchConfig(criteria, queries, cvText);
  const token = ++activeSearchToken;
  $("#feedStatus").textContent = t("autoPullingJobs");
  $("#resultCount").textContent = t("searching");
  renderJobs([], { loading: true });
  showRoute("jobs");
  try {
    const result = await loadLiveJobsStrict({ ...criteria, queries, cvText });
    if (token !== activeSearchToken) return;
    lastResults = result.jobs;
    renderJobs(result.jobs);
    checkLocalAlerts(result.jobs);
    $("#feedStatus").textContent = formatSearchStatus(result, criteria, cvText);
    if ($("#autoDeleteCv").checked) {
      deleteCv({ quiet: true });
      setNotice(t("cvDeletedAfterSearch"));
    }
  } catch (error) {
    if (token !== activeSearchToken) return;
    lastResults = [];
    renderJobs([]);
    $("#feedStatus").textContent = error?.message || t("liveJobsFailed");
  }
}

async function loadLiveJobsStrict({ queries, location, radiusKm, days, remoteOnly, types, minimum, cvText }) {
  const boundedDays = Math.min(14, Math.max(1, Number(days) || 14));
  const boundedRadius = Math.max(0, Number(radiusKm) || 0);
  const searchQueries = unique((queries || []).map((query) => String(query || "").trim()).filter(Boolean)).slice(0, 12);
  if (!searchQueries.length) throw new Error(t("noCvJobCategories"));
  if (boundedRadius > 0 && !location && !remoteOnly) throw new Error(t("locationRequiredForRadius"));

  let origin = null;
  if (boundedRadius > 0 && location && !remoteOnly) {
    origin = await resolveOriginForSearch(location);
    if (!origin) throw new Error(t("locationResolutionFailed"));
  }
  const sourceLocation = coarseSearchLocation(location);
  const settled = await runWithConcurrency(searchQueries, 3, (query) => fetchJobsForQuery({
    query,
    location: sourceLocation,
    radiusKm: boundedRadius,
    days: boundedDays,
    remoteOnly,
    types,
    origin
  }));
  const payloads = [];
  const requestFailures = [];
  const providerFailuresFromErrors = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      payloads.push(result.value);
    } else {
      requestFailures.push(result.reason);
      providerFailuresFromErrors.push(...Object.keys(result.reason?.sourceFailures || {}));
    }
  }
  if (!payloads.length) {
    const sourceNames = unique(providerFailuresFromErrors).join(", ");
    throw new Error(`${t("searchAllSourcesFailed")}${sourceNames ? ` (${sourceNames})` : ""}`);
  }

  const sourcesQueried = unique(payloads.flatMap((payload) => payload.sources || []));
  const sourcesWithMatches = unique(payloads.flatMap((payload) =>
    (payload.jobs || []).map((job) => job.source).filter(Boolean)
  ));
  const profile = cvText ? JobLogic.extractCvProfile(cvText) : null;
  const scored = scoreJobs(mergeJobs(payloads.flatMap((payload) => payload.jobs || [])));
  const filtered = scored.filter((job) => {
    if (!JobLogic.isDateEligible(job, boundedDays, Date.now())) return false;
    if (remoteOnly && !job.remote) return false;
    if (boundedRadius > 0 && !remoteOnly && (job.remote || job.locationVerified !== true || !JobLogic.isDistanceEligible(job.distanceKm, boundedRadius))) return false;
    if (types.length && !(job.jobTypes || []).some((type) => types.includes(type))) return false;
    if (profile?.categories?.length && !job.roleAligned) return false;
    if (profile && minimum > 0 && Number(job.match || 0) < minimum) return false;
    return Boolean(job.title && job.company && /^https:\/\//i.test(job.applyUrl || ""));
  }).sort((a, b) => JobLogic.compareRank(a, b));

  const sourceFailures = unique([
    ...providerFailuresFromErrors,
    ...payloads.flatMap((payload) => Object.keys(payload.sourceFailures || {}))
  ]);
  const maxUnverifiedWorkplaces = Math.max(0, ...payloads.map((payload) => Number(payload.counts?.unverifiedWorkplaces || 0)));
  const locationResolution = origin ? {
    ...origin,
    remoteOnly: false
  } : remoteOnly ? { precision: "remote", fallback: false } : null;
  return {
    jobs: filtered.slice(0, 60),
    payloads,
    sourcesQueried,
    sourcesWithMatches,
    sourceFailures,
    requestFailures,
    locationResolution,
    unverifiedWorkplaces: maxUnverifiedWorkplaces
  };
}

async function resolveOriginForSearch(location) {
  const query = String(location || "").trim().replace(/\s+/g, " ");
  if (resolvedOriginMemory?.query === query) return resolvedOriginMemory.result;
  const params = new URLSearchParams({ query });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${LOCATION_ENDPOINT}?${params.toString()}`, { cache: "no-store", signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !Number.isFinite(Number(payload.location?.latitude)) || !Number.isFinite(Number(payload.location?.longitude))) {
      throw new Error(payload.notice || payload.error || t("locationResolutionFailed"));
    }
    const result = {
      latitude: Number(payload.location.latitude),
      longitude: Number(payload.location.longitude),
      precision: payload.location.precision || "place",
      fallback: Boolean(payload.location.fallback),
      notice: String(payload.location.notice || "")
    };
    resolvedOriginMemory = { query, result };
    return result;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(t("locationResolutionFailed"));
    throw new Error(error?.message || t("locationResolutionFailed"));
  } finally {
    clearTimeout(timer);
  }
}

function coarseSearchLocation(location) {
  const value = String(location || "").trim();
  if (!value) return "";
  const address = JobLogic.parseAddress(value);
  if (address.postcode || address.city) return [address.postcode, address.city].filter(Boolean).join(" ");
  const streetMarker = /(?:straße|strasse|str\.?|weg|platz|allee|ring|gasse|damm|chaussee|ufer)/iu.test(value);
  const hasHouseNumber = /\b\d{1,4}[a-z]?\b/i.test(value.replace(/\b\d{5}\b/g, ""));
  if (streetMarker || hasHouseNumber) {
    const postcodeCity = value.match(/\b\d{5}\s+[\p{L}][\p{L}\s.-]*$/u);
    return postcodeCity ? postcodeCity[0].trim() : "";
  }
  return value
    .replace(/\s+/g, " ")
    .trim();
}

async function runWithConcurrency(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        output[index] = { status: "fulfilled", value: await mapper(items[index], index) };
      } catch (reason) {
        output[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return output;
}

async function fetchJobsForQuery({ query, location, radiusKm, days, remoteOnly, types, origin }) {
  const params = new URLSearchParams({
    q: query,
    location,
    radiusKm: String(radiusKm),
    days: String(Math.min(14, days)),
    remote: String(remoteOnly),
    types: types.join(",")
  });
  if (origin) {
    params.set("originLat", String(origin.latitude));
    params.set("originLon", String(origin.longitude));
    params.set("originPrecision", String(origin.precision || "place"));
    params.set("originFallback", String(Boolean(origin.fallback)));
    params.set("originNotice", String(origin.notice || ""));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${JOBS_ENDPOINT}?${params.toString()}`, { cache: "no-store", signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `Live job search failed with ${response.status}.`);
      error.sourceFailures = payload.sourceFailures || {};
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("A live search request timed out. No wider search was run.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function formatSearchStatus(result, criteria, cvText) {
  const sources = result.sourcesWithMatches.join(" + ") || "none";
  const audit = t("sourceAudit", {
    responded: result.sourcesQueried.join(", ") || "none",
    matching: result.sourcesWithMatches.join(", ") || "none",
    failed: result.sourceFailures.join(", ") || "none"
  });
  const latestGeneratedAt = result.payloads.map((payload) => payload.generatedAt).filter(Boolean).sort().at(-1) || new Date().toISOString();
  const count = result.jobs.length;
  let status;
  if (count) {
    status = t(cvText ? "autoJobsLoaded" : "liveJobsLoaded", {
      count,
      roleWord: count === 1 ? t("roleWordOne") : t("roleWordMany"),
      sources,
      time: new Date(latestGeneratedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  } else if (result.sourceFailures.length || result.requestFailures.length) {
    status = t("noResultsWithSourceFailures");
  } else {
    status = t("noStrictMatches", { days: Math.min(14, criteria.days) });
  }
  status += ` ${audit}`;
  if (result.sourceFailures.length) status += ` ${t("partialSourceFailure", { sources: result.sourceFailures.join(", ") })}`;
  if (result.requestFailures.length) status += ` ${t("partialQueryFailure", { count: result.requestFailures.length })}`;
  if (result.unverifiedWorkplaces) status += ` ${t("strictUnverifiedPlaces", { count: result.unverifiedWorkplaces })}`;
  if (result.locationResolution?.fallback) status += ` ${t("originFallbackNotice", { precision: result.locationResolution.precision })}`;
  if (criteria.remoteOnly) status += ` ${t("remoteDistanceNotice")}`;
  if (cvText && !result.jobs.some((job) => Number(job.match) >= 85)) status += ` ${t("noHighMatches", { days: Math.min(14, criteria.days) })}`;
  return status;
}

function mergeJobs(jobs) {
  const byKey = new Map();
  jobs.forEach((job) => {
    const key = `${job.source || ""}:${job.id || ""}:${job.applyUrl || ""}:${job.title || ""}:${job.company || ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, job);
      return;
    }
    const combinedTags = unique([...(existing.tags || []), ...(job.tags || [])]);
    const combinedTypes = unique([...(existing.jobTypes || []), ...(job.jobTypes || [])]);
    byKey.set(key, { ...existing, ...job, tags: combinedTags, jobTypes: combinedTypes });
  });
  return [...byKey.values()];
}

function buildManualSearchQueries(role) {
  const base = cleanRoleQuery(role);
  const expansions = MANUAL_QUERY_EXPANSIONS.filter((entry) => entry.test.test(base)).flatMap((entry) => entry.queries);
  return unique([base, ...expansions]).filter(Boolean).slice(0, 6);
}

function cleanRoleQuery(role) {
  return String(role || "").trim().replace(/\s+/g, " ");
}

function prepareExternalSearchConfig(criteria, queries, cvText) {
  const profile = cvText ? JobLogic.extractCvProfile(cvText) : null;
  const categoryTerms = {
    service: "Servicekraft",
    kitchen: "Küchenhilfe",
    housekeeping: "Housekeeping",
    warehouse: "Lagerhelfer",
    retail: "Warenverräumung",
    production: "Produktionshelfer"
  };
  const parsed = JobLogic.parseAddress(criteria.location || "");
  const profileAddress = profile?.address || null;
  const city = parsed.city || profileAddress?.city || "";
  const postcode = parsed.postcode || profileAddress?.postcode || "";
  const coarseLocation = [postcode, city].filter(Boolean).join(" ") || coarseSearchLocation(criteria.location) || "";
  const cvRoles = (profile?.categories || []).map((category) => categoryTerms[category]).filter(Boolean);
  const roles = unique([...(criteria.role ? [criteria.role, ...(queries || []).slice(1)] : cvRoles.length ? cvRoles : (queries || []))])
    .map((role) => String(role || "").trim())
    .filter(Boolean)
    .slice(0, 12);
  return {
    roles,
    location: coarseLocation,
    city: city || coarseLocation,
    postcode,
    radiusKm: Math.max(0, Number(criteria.radiusKm) || 0),
    days: Math.min(14, Math.max(1, Number(criteria.days) || 14)),
    types: Array.isArray(criteria.types) ? [...criteria.types] : [],
    student: Boolean(profile?.student),
    hoursPerWeek: profile?.hoursPerWeekDuringSemester ?? null
  };
}

function deriveAutoSearchQueries(cvText) {
  return JobLogic.getCvSearchQueries(cvText);
}

function languageLabel(job) {
  const key = job.languageRequirement || detectLanguageRequirement(job);
  return {
    german: t("languageGerman"),
    english: t("languageEnglish"),
    both: t("languageGermanEnglish"),
    unspecified: t("languageNotMentioned")
  }[key] || t("languageNotMentioned");
}

function detectLanguageRequirement(job) {
  const text = `${job.title} ${job.summary} ${job.description} ${(job.tags || []).join(" ")}`.toLowerCase();
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

function bindJobAlerts() {
  $("#alertForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await createJobAlert();
  });
}

async function createJobAlert() {
  const criteria = getCurrentSearchCriteria();
  const email = $("#alertEmail").value.trim();
  const name = $("#alertName").value.trim() || criteria.role || t("jobAlerts");

  if (!criteria.role || !email) {
    $("#alertStatus").textContent = t("alertNeedsRoleEmail");
    return;
  }

  const alert = {
    id: crypto.randomUUID(),
    email,
    name,
    criteria,
    createdAt: new Date().toISOString()
  };

  jobAlerts = [alert, ...jobAlerts.filter((item) => item.email !== email || item.name !== name)].slice(0, 20);
  saveJobAlerts();
  renderJobAlerts();

  try {
    const response = await fetch(ALERTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert)
    });
    const payload = response.ok ? await response.json().catch(() => ({})) : {};
    $("#alertStatus").textContent = payload.message || (payload.emailConfigured ? t("alertSavedServer") : t("alertServerUnavailable"));
  } catch {
    $("#alertStatus").textContent = t("alertSavedLocal");
  }
}

function renderJobAlerts() {
  const list = $("#alertList");
  if (!list) {
    return;
  }

  if (!jobAlerts.length) {
    list.innerHTML = `<p class="empty-state">${escapeHtml(t("noAlerts"))}</p>`;
    return;
  }

  list.innerHTML = jobAlerts
    .map((alert) => `
      <article class="alert-card">
        <div>
          <strong>${escapeHtml(alert.name)}</strong>
          <span>${escapeHtml(alert.email)}</span>
          <p>${escapeHtml(alertSummary(alert.criteria))}</p>
        </div>
        <button class="delete-card" type="button" data-delete-alert="${escapeAttribute(alert.id)}">${escapeHtml(t("deleteAlert"))}</button>
      </article>
    `)
    .join("");

  $$("[data-delete-alert]").forEach((button) => {
    button.addEventListener("click", () => {
      jobAlerts = jobAlerts.filter((alert) => alert.id !== button.dataset.deleteAlert);
      saveJobAlerts();
      renderJobAlerts();
    });
  });
}

function alertSummary(criteria = {}) {
  const location = criteria.location || t("anyLocation");
  const radius = Number(criteria.radiusKm || 0) ? `${criteria.radiusKm} km` : t("anyDistance");
  const types = (criteria.types || []).map(jobTypeLabel).join(", ") || t("jobType");
  const remote = criteria.remoteOnly ? t("remoteOnly") : "";
  return [criteria.role, location, radius, types, remote].filter(Boolean).join(" | ");
}

function jobTypeLabel(type) {
  return {
    "part-time": t("partTime"),
    "student-job": t("studentJob"),
    "mini-job": t("miniJob"),
    "full-time": t("fullTime")
  }[type] || type;
}

function checkLocalAlerts(jobs) {
  if (!jobAlerts.length || !jobs.length) {
    return;
  }
  const matchedAlerts = jobAlerts.filter((alert) => jobs.some((job) => jobMatchesAlert(job, alert.criteria)));
  if (matchedAlerts.length) {
    $("#alertStatus").textContent = t("localAlertsMatched", { count: matchedAlerts.length });
  }
}

function jobMatchesAlert(job, criteria = {}) {
  const haystack = `${job.title} ${job.company} ${job.location} ${job.summary} ${job.description} ${(job.tags || []).join(" ")}`.toLowerCase();
  const roleMatch = !criteria.role || haystack.includes(criteria.role.toLowerCase());
  const typeMatch = !(criteria.types || []).length || (job.jobTypes || []).some((type) => criteria.types.includes(type));
  const distance = Number(job.distanceKm);
  const locationMatch = !criteria.location || job.remote || haystack.includes(criteria.location.toLowerCase()) || (Number.isFinite(distance) && distance <= Number(criteria.radiusKm || 0));
  return roleMatch && typeMatch && locationMatch;
}

function scoreJobs(jobs, criteria = getCurrentSearchCriteria()) {
  const cvText = cvMemory?.text?.trim() || "";
  if (!cvText) {
    return jobs.map((job) => ({
      ...job,
      match: null,
      successRate: null,
      strengths: [],
      missing: [],
      recommendations: [],
      roleAligned: true,
      titleAligned: true,
      evidenceCount: 0,
      mandatoryIssues: [],
      studentFitScore: 0,
      languageRequirement: job.languageRequirement || detectLanguageRequirement(job)
    })).sort((a, b) => JobLogic.compareRank(a, b));
  }
  const profile = JobLogic.extractCvProfile(cvText);
  return jobs.map((job) => ({
    ...job,
    ...JobLogic.matchJobToProfile(job, profile),
    studentFitScore: JobLogic.studentSuitabilityScore(job, profile),
    successRate: null,
    languageRequirement: job.languageRequirement || detectLanguageRequirement(job)
  })).sort((a, b) => JobLogic.compareRank(a, b));
}

function analyzeJobAgainstCv(job) {
  const cvText = cvMemory?.text?.trim() || "";
  if (!cvText) return { match: null, successRate: null, strengths: [], missing: [], recommendations: [t("noCvRecommendation")] };
  const analysis = JobLogic.matchJobToProfile(job, JobLogic.extractCvProfile(cvText));
  return { ...analysis, successRate: analysis.match };
}

function refreshScoredJobs() {
  if (!lastResults.length) {
    renderDashboard();
    return;
  }
  if (!cvMemory?.text?.trim()) {
    renderJobs(lastResults);
    renderDashboard();
    return;
  }
  lastResults = scoreJobs(lastResults, getCurrentSearchCriteria());
  renderJobs(lastResults);
  renderDashboard();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function distanceForDisplay(job) {
  const distance = Number(job.distanceKm);
  if (!Number.isFinite(distance)) return "";
  const value = Number.isInteger(distance) ? String(distance) : distance.toFixed(1);
  return `${job.distanceApproximate ? "≈ " : ""}${value}`;
}

function externalSlug(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function externalQueryForTypes(config) {
  const types = (config.types || []).map((type) => String(type).toLowerCase());
  const labels = [];
  if (types.some((type) => type.includes("part"))) labels.push("Teilzeit");
  if (types.some((type) => type.includes("student"))) labels.push("Studentenjob");
  if (types.some((type) => type.includes("mini"))) labels.push("Minijob");
  if (types.some((type) => type.includes("full"))) labels.push("Vollzeit");
  if (config.student && !types.length) labels.push("Studentenjob", "Teilzeit", "Minijob");
  return unique(labels);
}

function externalPlatformUrl(platform, role, config) {
  const term = String(role || "").trim();
  const city = config.city || config.location || "";
  const location = config.location || city;
  const radius = config.radiusKm > 0 ? String(config.radiusKm) : "";
  const roleAndTypes = [term, ...externalQueryForTypes(config)].filter(Boolean).join(" ");
  const params = new URLSearchParams();
  if (platform === "kleinanzeigen") {
    const placeIds = { leipzig: "4233", berlin: "3331", hamburg: "9409" };
    const placeId = placeIds[externalSlug(city)];
    if (placeId) {
      const radiusPart = radius ? `r${radius}` : "";
      return `https://www.kleinanzeigen.de/s-jobs/${externalSlug(city)}/${externalSlug(roleAndTypes)}/k0c102l${placeId}${radiusPart}`;
    }
    params.set("keywords", [roleAndTypes, location].filter(Boolean).join(" "));
    return `https://www.kleinanzeigen.de/s-jobs/${externalSlug(roleAndTypes)}/c102?${params.toString()}`;
  }
  if (platform === "indeed") {
    params.set("q", roleAndTypes || term);
    if (location) params.set("l", location);
    if (radius) params.set("radius", radius);
    params.set("fromage", String(config.days || 14));
    const selectedTypes = (config.types || []).map((type) => String(type).toLowerCase());
    if (!selectedTypes.some((type) => type.includes("full")) && (config.student || selectedTypes.some((type) => /part|student|mini/.test(type)))) params.set("jt", "parttime");
    return `https://de.indeed.com/jobs?${params.toString()}`;
  }
  if (platform === "studentjob") {
    params.set("search[keywords_scope]", term);
    if (config.postcode) params.set("search[zipcode_eq]", config.postcode);
    if (city) params.set("region_name", city);
    const types = (config.types || []).map((type) => String(type).toLowerCase());
    const jobTypeIds = [];
    if (config.student && !types.length) jobTypeIds.push("9", "2", "12", "4");
    else {
      if (types.some((type) => type.includes("student"))) jobTypeIds.push("9");
      if (types.some((type) => type.includes("part"))) jobTypeIds.push("2");
      if (types.some((type) => type.includes("mini"))) jobTypeIds.push("12", "4");
    }
    unique(jobTypeIds).forEach((id) => params.append("search[job_types][id][]", id));
    return `https://www.studentjob.de/stellenangebote?${params.toString()}`;
  }
  if (platform === "stepstone") {
    const path = city ? `/jobs/${externalSlug(roleAndTypes || term)}/in-${externalSlug(city)}` : `/jobs/${externalSlug(roleAndTypes || term)}`;
    if (radius) params.set("radius", radius);
    return `https://www.stepstone.de${path}${params.size ? `?${params.toString()}` : ""}`;
  }
  if (platform === "zenjob") {
    params.set("search", roleAndTypes || term);
    if (city) params.set("city", city);
    return `https://www.zenjob.com/de/jobboerse?${params.toString()}`;
  }
  if (platform === "jobvalley") {
    params.set("search", roleAndTypes || term);
    if (city) params.set("location", city);
    return `https://jobvalley.com/de-de/jobs?${params.toString()}`;
  }
  return "https://www.google.com/";
}

function appendExternalSearchPanel(list) {
  const config = lastExternalSearchConfig;
  if (!config?.roles?.length) return;
  const primaryPlatforms = [
    ["kleinanzeigen", "Kleinanzeigen"],
    ["indeed", "Indeed Germany"],
    ["studentjob", "StudentJob"],
    ["stepstone", "StepStone"],
    ["zenjob", "Zenjob"],
    ["jobvalley", "jobvalley"]
  ];
  const additionalSites = [
    ["Jobmensa", "jobmensa.de"],
    ["Stellenwerk", "stellenwerk.de"],
    ["YoungCapital", "youngcapital.de"],
    ["JOBRUF", "jobruf.de"],
    ["meinestadt.de", "jobs.meinestadt.de"],
    ["NebenJob.de", "nebenjob.de"],
    ["aushilfsjobs.info", "aushilfsjobs.info"],
    ["Workwise", "workwise.io"],
    ["Universität Leipzig", "uni-leipzig.de"],
    ["HTWK Leipzig", "htwk-leipzig.de"],
    ["Studentenwerk Leipzig", "studentenwerk-leipzig.de"]
  ];
  const roleOptions = config.roles.length > 1
    ? `<label class="external-role-filter"><span>${escapeHtml(t("externalSearchRole"))}</span><select data-external-role>${config.roles.map((role, index) => `<option value="${escapeAttribute(role)}"${index === 0 ? " selected" : ""}>${escapeHtml(role)}</option>`).join("")}</select></label>`
    : "";
  const panel = document.createElement("section");
  panel.className = "panel external-platform-searches";
  panel.innerHTML = `
    <div class="external-search-head">
      <div><h3>${escapeHtml(t("externalSearchTitle"))}</h3><p>${escapeHtml(t("externalSearchNote"))}</p></div>
      ${roleOptions}
    </div>
    <div class="external-platform-links" data-primary-platforms></div>
    <details class="external-more"><summary>${escapeHtml(t("externalMore"))}</summary><div class="external-platform-links" data-additional-platforms></div></details>
  `;
  const roleSelect = panel.querySelector("[data-external-role]");
  const selectedRole = roleSelect?.value || config.roles[0];
  const primaryContainer = panel.querySelector("[data-primary-platforms]");
  primaryContainer.innerHTML = primaryPlatforms.map(([id, label]) => `<a class="quiet-button" target="_blank" rel="noopener noreferrer" data-platform-search="${id}">${escapeHtml(t("externalSearchButton", { platform: label }))}</a>`).join("");
  const additionalContainer = panel.querySelector("[data-additional-platforms]");
  const googleLinks = additionalSites.map(([label, domain]) => {
    const search = `site:${domain} ${selectedRole} ${config.location} ${externalQueryForTypes(config).join(" ")}`.trim();
    const href = `https://www.google.com/search?${new URLSearchParams({ q: search, tbs: "qdr:d14" })}`;
    return `<a class="quiet-button" target="_blank" rel="noopener noreferrer" href="${escapeAttribute(href)}">${escapeHtml(t("externalSearchButton", { platform: `Google · ${label}` }))}</a>`;
  });
  const employerQuery = `${selectedRole} ${config.location} Jobs Karriere Arbeitgeber`;
  const generalQuery = `${selectedRole} ${config.location} Stellenangebot ${externalQueryForTypes(config).join(" ")}`.trim();
  googleLinks.push(`<a class="quiet-button" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?${new URLSearchParams({ q: employerQuery, tbs: "qdr:d14" })}">${escapeHtml(t("externalSearchButton", { platform: "Google · local employer careers" }))}</a>`);
  googleLinks.push(`<a class="quiet-button" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?${new URLSearchParams({ q: generalQuery, tbs: "qdr:d14" })}">${escapeHtml(t("externalSearchButton", { platform: "Google · indexed vacancies (14 days)" }))}</a>`);
  additionalContainer.innerHTML = googleLinks.join("");
  list.appendChild(panel);

  const updatePlatformLinks = (role) => {
    panel.querySelectorAll("[data-platform-search]").forEach((anchor) => {
      anchor.href = externalPlatformUrl(anchor.dataset.platformSearch, role, config);
    });
  };
  updatePlatformLinks(selectedRole);
  roleSelect?.addEventListener("change", () => {
    const role = roleSelect.value;
    updatePlatformLinks(role);
    additionalContainer.innerHTML = additionalSites.map(([label, domain]) => {
      const search = `site:${domain} ${role} ${config.location} ${externalQueryForTypes(config).join(" ")}`.trim();
      const href = `https://www.google.com/search?${new URLSearchParams({ q: search, tbs: "qdr:d14" })}`;
      return `<a class="quiet-button" target="_blank" rel="noopener noreferrer" href="${escapeAttribute(href)}">${escapeHtml(t("externalSearchButton", { platform: `Google · ${label}` }))}</a>`;
    }).concat([
      `<a class="quiet-button" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?${new URLSearchParams({ q: `${role} ${config.location} Jobs Karriere Arbeitgeber`, tbs: "qdr:d14" })}">${escapeHtml(t("externalSearchButton", { platform: "Google · local employer careers" }))}</a>`,
      `<a class="quiet-button" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?${new URLSearchParams({ q: `${role} ${config.location} Stellenangebot ${externalQueryForTypes(config).join(" ")}`.trim(), tbs: "qdr:d14" })}">${escapeHtml(t("externalSearchButton", { platform: "Google · indexed vacancies (14 days)" }))}</a>`
    ]).join("");
  });
}

function renderJobs(jobs, options = {}) {
  const list = $("#jobResults");
  list.innerHTML = "";

  if (options.loading) {
    $("#resultCount").textContent = t("searching");
    list.innerHTML = `<div class="panel empty-feed">${escapeHtml(t("searchingBoards"))}</div>`;
    appendExternalSearchPanel(list);
    return;
  }

  $("#resultCount").textContent = jobs.length
    ? t("freshRoles", { count: jobs.length, roleWord: jobs.length === 1 ? t("roleWordOne") : t("roleWordMany") })
    : t("zeroRoles");

  if (!jobs.length) {
    list.innerHTML = `
      <div class="panel empty-feed">
        <h3>${escapeHtml(t("noCurrentRoles"))}</h3>
        <p>${escapeHtml(t("emptyFeedBody"))}</p>
      </div>
    `;
    appendExternalSearchPanel(list);
    return;
  }

  jobs.forEach((job) => {
    const card = document.createElement("article");
    card.className = "job-card premium-card";
    card.innerHTML = `
      <div class="job-card-head">
        <div>
          <span class="source-line">${escapeHtml(job.source)} | ${escapeHtml(t("originallyPublished"))}: ${formatDate(job.publishedAtOriginal || job.postedAt)}${job.remote ? ` | ${t("remote")}` : ""}</span>
          <h3>${escapeHtml(job.title)}</h3>
          <p>${escapeHtml(job.company)} | ${escapeHtml(job.location || t("locationNotListed"))}</p>
        </div>
        <div class="score-ring ${job.match == null ? "muted-score" : ""}" style="--score:${Number(job.match || 0)}">
          <strong>${job.match == null ? "--" : job.match}</strong>
          <span>${job.match == null ? t("uploadCvShort") : t("percentSuccess")}</span>
        </div>
      </div>
      <div class="job-meta">
        <span class="tag match">${job.match == null ? t("cvNeeded") : t("percentMatch", { score: job.match })}</span>
        <span class="tag source">${escapeHtml(job.interestLabel || t("interestNotPublished"))}</span>
        <span class="tag language">${escapeHtml(t("languageRequired"))}: ${escapeHtml(languageLabel(job))}</span>
        ${Number.isFinite(job.distanceKm) ? `<span class="tag">${escapeHtml(t("distanceAway", { distance: distanceForDisplay(job) }))}</span>` : ""}
        ${job.salary ? `<span class="tag">${escapeHtml(job.salary)}</span>` : ""}
        ${(job.jobTypes || []).slice(0, 3).map((type) => `<span class="tag">${escapeHtml(jobTypeLabel(type))}</span>`).join("")}
        ${(job.tags || []).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <p>${escapeHtml(job.summary || t("noSummary"))}</p>
      <div class="job-insights">
        <div><strong>${escapeHtml(t("strengths"))}</strong><span>${job.strengths?.length ? escapeHtml(job.strengths.join(", ")) : escapeHtml(t("uploadCvStrengths"))}</span></div>
        <div><strong>${escapeHtml(t("missing"))}</strong><span>${job.missing?.length ? escapeHtml(job.missing.slice(0, 5).join(", ")) : escapeHtml(t("noMajorGaps"))}</span></div>
        <div><strong>${escapeHtml(t("applyContact"))}</strong><span>${formatContacts(job)}</span></div>
      </div>
      <div class="job-actions">
        <a class="primary-button" href="${escapeAttribute(job.applyUrl)}" target="_blank" rel="noopener">${escapeHtml(t("apply"))}</a>
        <button class="quiet-button" type="button" data-recommend-job="${escapeAttribute(job.id)}">${escapeHtml(t("cvTips"))}</button>
        <button class="quiet-button" type="button" data-cover-job="${escapeAttribute(job.id)}">${escapeHtml(t("coverLetterAction"))}</button>
        <button class="quiet-button" type="button" data-save-job="${escapeAttribute(job.id)}">${escapeHtml(t("save"))}</button>
      </div>
    `;
    list.appendChild(card);
  });

  $$("[data-save-job]").forEach((button) => {
    button.addEventListener("click", () => saveJobToTracker(button.dataset.saveJob));
  });
  $$("[data-recommend-job]").forEach((button) => {
    button.addEventListener("click", () => openCoachForJob(button.dataset.recommendJob, "recommendations"));
  });
  $$("[data-cover-job]").forEach((button) => {
    button.addEventListener("click", () => openCoachForJob(button.dataset.coverJob, "cover"));
  });
  appendExternalSearchPanel(list);
}

function openCoachForJob(jobId, mode) {
  const job = lastResults.find((item) => item.id === jobId);
  if (!job) {
    return;
  }
  selectedJob = job;
  $("#targetRole").value = job.title;
  $("#targetCompany").value = job.company;
  $("#targetRequirements").value = `${job.summary}\n\n${job.description || ""}`.trim();
  $("#resumeTone").value = mode;
  generateCoachOutput(mode, job);
  showRoute("resume");
}

function saveJobToTracker(jobId) {
  const job = lastResults.find((item) => item.id === jobId);
  if (!job) {
    return;
  }
  const exists = applications.some((app) => app.title === job.title && app.company === job.company);
  if (!exists) {
    applications.unshift({
      id: crypto.randomUUID(),
      title: job.title,
      company: job.company,
      status: "Wishlist",
      link: job.applyUrl || job.sourceUrl || "",
      contact: firstContact(job),
      match: job.match,
      createdAt: new Date().toISOString()
    });
    saveApplications();
  }
  renderTracker();
  renderDashboard();
  showRoute("tracker");
}

function bindTracker() {
  $("#toggleAddForm").addEventListener("click", () => {
    $("#applicationForm").classList.toggle("hidden");
  });

  $("#applicationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    applications.unshift({
      id: crypto.randomUUID(),
      title: $("#appTitle").value.trim(),
      company: $("#appCompany").value.trim(),
      status: $("#appStatus").value,
      link: $("#appLink").value.trim(),
      contact: $("#appContact").value.trim(),
      match: null,
      createdAt: new Date().toISOString()
    });
    event.currentTarget.reset();
    saveApplications();
    renderTracker();
    renderDashboard();
  });
}

function renderTracker() {
  const board = $("#trackerBoard");
  board.innerHTML = "";
  STATUSES.forEach((status) => {
    const column = document.createElement("section");
    column.className = "kanban-column";
    const items = applications.filter((app) => app.status === status);
    column.innerHTML = `<h3>${escapeHtml(statusLabel(status))}<span class="column-count">${items.length}</span></h3>`;
    if (!items.length) {
      const empty = document.createElement("p");
      empty.textContent = t("noApplications");
      empty.className = "empty-state";
      column.appendChild(empty);
    }
    items.forEach((app) => column.appendChild(renderApplicationCard(app)));
    board.appendChild(column);
  });
}

function renderApplicationCard(app) {
  const card = document.createElement("article");
  card.className = "app-card";
  card.innerHTML = `
    <h4>${escapeHtml(app.title)}</h4>
    <p>${escapeHtml(app.company)}${app.match ? ` | ${app.match}% match` : ""}</p>
    ${app.contact ? `<p>${escapeHtml(app.contact)}</p>` : ""}
    <div class="card-actions">
      <select aria-label="Status for ${escapeAttribute(app.title)}" data-status-id="${escapeAttribute(app.id)}">
        ${STATUSES.map((status) => `<option value="${escapeAttribute(status)}" ${status === app.status ? "selected" : ""}>${escapeHtml(statusLabel(status))}</option>`).join("")}
      </select>
      <button class="delete-card" type="button" aria-label="${escapeAttribute(t("deleteCv"))} ${escapeAttribute(app.title)}" data-delete-id="${escapeAttribute(app.id)}">${escapeHtml(t("deleteCv"))}</button>
    </div>
    ${app.link ? `<a class="text-link" href="${escapeAttribute(app.link)}" target="_blank" rel="noopener">${escapeHtml(t("openApplyPage"))}</a>` : ""}
  `;

  card.querySelector("[data-status-id]").addEventListener("change", (event) => {
    updateApplicationStatus(app.id, event.target.value);
  });
  card.querySelector("[data-delete-id]").addEventListener("click", () => {
    deleteApplication(app.id);
  });
  return card;
}

function updateApplicationStatus(id, status) {
  applications = applications.map((app) => (app.id === id ? { ...app, status } : app));
  saveApplications();
  renderTracker();
  renderDashboard();
}

function deleteApplication(id) {
  applications = applications.filter((app) => app.id !== id);
  saveApplications();
  renderTracker();
  renderDashboard();
}

function bindResume() {
  $("#resumeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    generateCoachOutput($("#resumeTone").value, selectedJob);
  });

  $("#copyResumeButton").addEventListener("click", async () => {
    const text = $("#resumeOutput").value;
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text).catch(() => {});
  });
}

function generateCoachOutput(mode, job = selectedJob) {
  const role = $("#targetRole").value.trim() || job?.title || "target role";
  const company = $("#targetCompany").value.trim() || job?.company || "the company";
  const requirements = $("#targetRequirements").value.trim() || job?.description || "";
  const profile = cvMemory?.text?.trim() ? JobLogic.extractCvProfile(cvMemory.text) : null;
  const analysis = job ? analyzeJobAgainstCv({ ...job, description: requirements, title: role, company }, { role }) : analyzeJobAgainstCv({
    title: role,
    company,
    location: "",
    summary: requirements,
    description: requirements,
    tags: []
  }, { role });
  const recommendations = buildRecommendationText(role, company, analysis);
  const cover = JobLogic.buildGermanCoverLetter({ role, company, analysis, profile });

  if (mode === "cover") {
    $("#resumeOutput").value = cover;
  } else if (mode === "both") {
    $("#resumeOutput").value = `${recommendations}\n\n${cover}`;
  } else {
    $("#resumeOutput").value = recommendations;
  }
}

function buildRecommendationText(role, company, analysis) {
  return [
    t("recommendationsTitle", { role, company }),
    "",
    t("estimatedSuccess", { value: analysis.successRate == null ? t("uploadCvFirst") : `${analysis.successRate}%` }),
    "",
    t("immediateImprovements"),
    ...analysis.recommendations.map((line) => `- ${line}`),
    "",
    t("keywordsToAdd"),
    analysis.missing?.length ? analysis.missing.slice(0, 8).map((word) => `- ${word}`).join("\n") : `- ${t("noMajorGaps")}`,
    "",
    t("matchingEvidence"),
    analysis.strengths?.length ? analysis.strengths.slice(0, 8).map((word) => `- ${word}`).join("\n") : `- ${t("addCvToDetect")}`
  ].join("\n");
}

function bindDashboardControls() {
  $("#dashboardClearPrivate").addEventListener("click", clearPrivateWorkspace);
  $("#dashboardReset").addEventListener("click", () => {
    if (!window.confirm(t("confirmDeleteApps"))) {
      return;
    }
    applications = [];
    saveApplications();
    renderTracker();
    renderDashboard();
  });
}

function renderDashboard() {
  const grid = $("#metricsGrid");
  const counts = STATUSES.map((status) => ({
    label: status,
    value: applications.filter((app) => app.status === status).length
  }));
  const total = applications.length;
  const bestMatch = [...applications, ...lastResults].reduce((best, app) => Math.max(best, Number(app.match || 0)), 0);
  const averageLiveScore = lastResults.filter((job) => job.match != null);
  const avg = averageLiveScore.length
    ? Math.round(averageLiveScore.reduce((sum, job) => sum + Number(job.match || 0), 0) / averageLiveScore.length)
    : 0;
  const metrics = [
    { label: t("savedMetric"), value: total },
    { label: t("bestSuccessMetric"), value: `${bestMatch || 0}%` },
    { label: t("liveAvgMetric"), value: `${avg || 0}%` },
    ...counts.map((item) => ({ label: statusLabel(item.label), value: item.value }))
  ];

  grid.innerHTML = metrics
    .map((metric) => `
      <article class="metric-card">
        <strong>${metric.value}</strong>
        <span>${metric.label}</span>
      </article>
    `)
    .join("");
  $("#lastUpdated").textContent = t("updated", {
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
}

function loadApplications() {
  try {
    const current = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
    if (current.length) {
      return current;
    }
    for (const key of LEGACY_KEYS) {
      const legacy = JSON.parse(localStorage.getItem(key) || "[]");
      if (legacy.length) {
        return legacy;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function loadJobAlerts() {
  try {
    return JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveApplications() {
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  } catch {
    setNotice(t("storageUnavailable"));
  }
}

function saveJobAlerts() {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(jobAlerts));
  } catch {
    $("#alertStatus").textContent = t("storageUnavailable");
  }
}

function purgePrivateKeys() {
  [localStorage, sessionStorage].forEach((store) => {
    try {
      Object.keys(store).forEach((key) => {
        if (key !== APPLICATIONS_KEY && !LEGACY_KEYS.includes(key) && PRIVATE_KEY_MATCHERS.some((matcher) => matcher.test(key))) {
          store.removeItem(key);
        }
      });
    } catch {
      return;
    }
  });
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
}

function updatePrivacyStatus() {
  const hasCv = Boolean(cvMemory?.text?.trim());
  $("#privacyStatus").textContent = hasCv ? t("cvInMemory") : t("noCvStored");
  $("#cvModePill").textContent = hasCv ? t("readyToScore") : t("privateMode");
  $("#cvReadout").textContent = hasCv
    ? t("cvLoaded", { name: cvMemory.name })
    : t("noCvLoaded");
}

function setNotice(message) {
  $("#uploadNotice").textContent = message;
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
    openInstallInstructions();
  });

  $("#closeInstallDialog").addEventListener("click", () => $("#installDialog").close());
  $("#installDialog").addEventListener("click", (event) => {
    if (event.target.id === "installDialog") {
      $("#installDialog").close();
    }
  });
}

function openInstallInstructions() {
  const dialog = $("#installDialog");
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    window.alert(t("installFallback"));
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function firstContact(job) {
  const emails = job.contacts?.emails || [];
  const websites = job.contacts?.websites || [];
  return emails[0] || websites[0] || job.applyUrl || "";
}

function formatContacts(job) {
  const emails = job.contacts?.emails || [];
  const websites = job.contacts?.websites || [];
  if (emails.length) {
    return escapeHtml(emails[0]);
  }
  if (websites.length) {
    return escapeHtml(websites[0]);
  }
  return escapeHtml(t("useApplyLink"));
}

function formatDate(value) {
  if (!value) {
    return t("dateNotListed");
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return t("dateNotListed");
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function statusLabel(status) {
  const key = `status${status}`;
  return t(key);
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

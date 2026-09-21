(function attachWorkTrackerReports(root, factory) {
  const reports = factory();
  if (typeof module === "object" && module.exports) module.exports = reports;
  else root.WorkTrackerReports = reports;
}(typeof globalThis !== "undefined" ? globalThis : this, function createWorkTrackerReports() {
  const server = typeof module === "object" && module.exports;
  const PDF = server ? require("./vendor/pdf-lib.min.js") : globalThis.PDFLib;
  const Zip = server ? require("./vendor/jszip.min.js") : globalThis.JSZip;
  const amount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const status = (shift) => ({ completed: "Completed", confirmed: "Scheduled", needs_review: "Needs review", cancelled: "Cancelled" }[shift.workStatus] || "Needs review");

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function periodBounds(scope, referenceDate, customFrom, customTo) {
    const reference = new Date(`${referenceDate}T12:00:00`);
    if (!Number.isFinite(reference.getTime())) return { from: "", to: "" };
    if (scope === "custom") return { from: customFrom || referenceDate, to: customTo || customFrom || referenceDate };
    if (scope === "day") return { from: referenceDate, to: referenceDate };
    if (scope === "week") {
      const monday = new Date(reference);
      monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: dateKey(monday), to: dateKey(sunday) };
    }
    if (scope === "month") return { from: dateKey(new Date(reference.getFullYear(), reference.getMonth(), 1)), to: dateKey(new Date(reference.getFullYear(), reference.getMonth() + 1, 0)) };
    return { from: `${reference.getFullYear()}-01-01`, to: `${reference.getFullYear()}-12-31` };
  }

  function filterData(data, filters) {
    const bounds = periodBounds(filters.scope, filters.referenceDate, filters.customFrom, filters.customTo);
    const inRange = (item) => item.date >= bounds.from && item.date <= bounds.to && (filters.jobId === "all" || item.jobId === filters.jobId);
    return {
      bounds,
      shifts: data.shifts.filter(inRange).sort((a, b) => a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || "")),
      bonuses: data.bonuses.filter(inRange).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  function summary(report) {
    const worked = report.shifts.filter((shift) => shift.workStatus === "completed");
    const scheduled = report.shifts.filter((shift) => shift.workStatus === "confirmed");
    const hours = worked.reduce((total, shift) => total + amount(shift.workedMinutes) / 60, 0);
    const shiftGross = worked.reduce((total, shift) => total + amount(shift.grossPayExpected), 0);
    const bonusGross = report.bonuses.reduce((total, bonus) => total + amount(bonus.amount), 0);
    return {
      shiftCount: report.shifts.length, bonusCount: report.bonuses.length, hours, shiftGross, bonusGross, totalGross: shiftGross + bonusGross,
      completedCount: worked.length, scheduledCount: scheduled.length,
      scheduledHours: scheduled.reduce((total, shift) => total + amount(shift.workedMinutes) / 60, 0),
      scheduledGross: scheduled.reduce((total, shift) => total + amount(shift.grossPayExpected), 0),
      reviewCount: report.shifts.filter((shift) => !["completed", "confirmed", "cancelled"].includes(shift.workStatus)).length,
      cancelledCount: report.shifts.filter((shift) => shift.workStatus === "cancelled").length
    };
  }

  function xml(value) {
    return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  }

  function csv(value) {
    let text = String(value ?? "");
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function jobLabel(jobs, jobId) {
    const job = jobs.find((entry) => entry.id === jobId) || {};
    return job.employerName ? `${job.name || "Job"} - ${job.employerName}` : job.name || "Job";
  }

  const shiftHeaders = ["Date", "Job", "Employer", "Start", "End", "Break minutes", "Hours", "Hourly wage", "Gross for listed hours", "Shift status", "Paid status", "Location", "Notes"];
  function reportRows(report, jobs) {
    return report.shifts.map((shift) => {
      const job = jobs.find((entry) => entry.id === shift.jobId) || {};
      return [shift.date, job.name || "Job", job.employerName || "", shift.start, shift.end, amount(shift.breakMinutes), amount(shift.workedMinutes) / 60, amount(shift.wage ?? job.hourlyWageGross), amount(shift.grossPayExpected), status(shift), shift.paidStatus || "", shift.location || "", shift.notes || ""];
    });
  }

  function bonusRows(report, jobs) {
    return report.bonuses.map((bonus) => [bonus.date, jobLabel(jobs, bonus.jobId), bonus.task, bonus.quantity || "", amount(bonus.amount), bonus.paidStatus || "", bonus.notes || ""]);
  }

  function summaryRows(report, currency) {
    const t = summary(report);
    return [["WORK TRACKER", "Value"], ["Period", `${report.bounds.from} to ${report.bounds.to}`], ["Currency", currency], ["Completed shifts", t.completedCount], ["Worked hours", t.hours], ["Worked shift gross", t.shiftGross], ["Bonus payments", t.bonusGross], ["Worked gross including bonuses", t.totalGross], ["Scheduled shifts", t.scheduledCount], ["Scheduled hours", t.scheduledHours], ["Scheduled expected gross", t.scheduledGross], ["Shifts needing review (excluded from totals)", t.reviewCount], ["Cancelled shifts (excluded from totals)", t.cancelledCount]];
  }

  async function buildExcel(report, jobs, currency) {
    const zip = new Zip();
    const sheets = [
      { name: "Summary", rows: summaryRows(report, currency), widths: [48, 30] },
      { name: "Shifts", rows: [shiftHeaders, ...reportRows(report, jobs)], widths: [13, 20, 44, 9, 9, 14, 12, 14, 22, 18, 18, 22, 55] },
      { name: "Bonus Payments", rows: [["Date", "Job", "Work completed", "Quantity", "Amount", "Paid status", "Details"], ...bonusRows(report, jobs)], widths: [13, 40, 40, 20, 14, 18, 55] }
    ];
    const prefix = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    zip.file("[Content_Types].xml", prefix + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
    zip.file("_rels/.rels", prefix + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file("xl/workbook.xml", prefix + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", prefix + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((sheet, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file("xl/styles.xml", prefix + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EEF9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    sheets.forEach((sheet, i) => {
      const cols = sheet.widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
      const rows = sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => {
        const reference = String.fromCharCode(65 + c) + (r + 1);
        return typeof cell === "number" ? `<c r="${reference}" s="2"><v>${amount(cell)}</v></c>` : `<c r="${reference}" s="${r === 0 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`;
      }).join("")}</row>`).join("");
      zip.file(`xl/worksheets/sheet${i + 1}.xml`, prefix + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`);
    });
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }

  function buildCsv(report, jobs) {
    const shifts = [["Record type", ...shiftHeaders], ...reportRows(report, jobs).map((row) => ["Shift", ...row])];
    const bonuses = bonusRows(report, jobs).map((row) => ["Bonus", row[0], row[1], "", "", "", "", "", "", row[4], "", row[5], "", `${row[2]}${row[3] ? ` (${row[3]})` : ""}${row[6] ? ` - ${row[6]}` : ""}`]);
    return [...shifts, ...bonuses].map((row) => row.map(csv).join(",")).join("\r\n");
  }

  async function buildPdf(report, jobs, currency) {
    const doc = await PDF.PDFDocument.create();
    const font = await doc.embedFont(PDF.StandardFonts.Helvetica);
    const bold = await doc.embedFont(PDF.StandardFonts.HelveticaBold);
    const ink = PDF.rgb(0.09, 0.14, 0.2);
    const blue = PDF.rgb(0.89, 0.95, 0.99);
    const muted = PDF.rgb(0.32, 0.39, 0.45);
    const margin = 32, width = 841.89, height = 595.28, lineHeight = 12;
    let page, y;
    const safe = (value) => Array.from(String(value ?? "").replace(/[\r\n\t]+/g, " ")).map((char) => { try { font.encodeText(char); return char; } catch { return "?"; } }).join("");
    function text(value, x, baseline, size = 9, face = font, color = ink) {
      page.drawText(safe(value), { x, y: baseline, size, font: face, color });
    }
    function newPage() {
      page = doc.addPage([width, height]);
      y = height - margin;
      text("WORK TRACKER", margin, y, 17, bold);
      y -= 20;
      text(`${report.bounds.from} to ${report.bounds.to} | ${currency}`, margin, y, 10, font, muted);
      y -= 25;
    }
    function wrap(value, maxWidth) {
      const lines = [], words = safe(value).split(/\s+/);
      let line = "";
      for (const word of words) {
        if (font.widthOfTextAtSize((line ? line + " " : "") + word, 9) <= maxWidth) { line += (line ? " " : "") + word; continue; }
        if (line) lines.push(line);
        line = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, 9) > maxWidth && line) { lines.push(line); line = ""; }
          line += char;
        }
      }
      if (line || !lines.length) lines.push(line);
      return lines;
    }
    function table(title, headers, rows, widths) {
      function heading() {
        text(title, margin, y, 12, bold); y -= 20;
        page.drawRectangle({ x: margin, y: y - 19, width: widths.reduce((a,b) => a+b, 0), height: 25, color: blue });
        let x = margin;
        headers.forEach((label, i) => { text(label, x + 4, y - 9, 8, bold); x += widths[i]; });
        y -= 27;
      }
      if (y < margin + 75) newPage();
      heading();
      if (!rows.length) { text("No records for this period.", margin + 4, y - 12); y -= 35; return; }
      for (const row of rows) {
        const cells = row.map((value, i) => wrap(value, widths[i] - 8));
        let offset = 0, count = Math.max(...cells.map((cell) => cell.length));
        if (count * lineHeight + 8 > y - margin && count * lineHeight + 8 < height - 125) { newPage(); heading(); }
        while (offset < count) {
          const available = Math.floor((y - margin - 8) / lineHeight);
          if (available < 1) { newPage(); heading(); continue; }
          const lines = Math.min(available, count - offset);
          let x = margin;
          cells.forEach((cell, i) => {
            cell.slice(offset, offset + lines).forEach((value, index) => text(value, x + 4, y - 12 - index * lineHeight));
            x += widths[i];
          });
          y -= lines * lineHeight + 8;
          page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.4, color: PDF.rgb(.78, .85, .9) });
          offset += lines;
          if (offset < count) { newPage(); heading(); }
        }
      }
      y -= 23;
    }
    newPage();
    const t = summary(report);
    text(`${t.completedCount} completed shifts | ${t.hours.toFixed(2)} h worked | ${t.totalGross.toFixed(2)} ${currency} worked gross incl. bonuses`, margin, y, 11, bold); y -= 18;
    text(`${t.scheduledCount} scheduled shifts | ${t.scheduledHours.toFixed(2)} h scheduled | ${t.scheduledGross.toFixed(2)} ${currency} scheduled expected gross`, margin, y, 10); y -= 18;
    text(`${t.reviewCount} need review | ${t.cancelledCount} cancelled | These entries are excluded from worked totals.`, margin, y, 10, font, muted); y -= 26;
    table("Shifts", ["Date", "Job", "Time", "Break", "Hours", "Gross", "Status", "Paid", "Location / notes"], report.shifts.map((shift) => [shift.date, jobLabel(jobs, shift.jobId), `${shift.start}–${shift.end}`, `${amount(shift.breakMinutes)} min`, (amount(shift.workedMinutes) / 60).toFixed(2), amount(shift.grossPayExpected).toFixed(2), status(shift), shift.paidStatus || "", [shift.location, shift.notes].filter(Boolean).join(" — ")]), [65, 143, 65, 37, 40, 58, 66, 66, 237.89]);
    table("Bonus payments", ["Date", "Job", "Work completed", "Quantity", "Amount", "Paid", "Details"], bonusRows(report, jobs), [65, 143, 178, 74, 58, 66, 193.89]);
    doc.getPages().forEach((p, i) => p.drawText(`Page ${i + 1} of ${doc.getPageCount()}`, { x: width - 100, y: 15, size: 8, font, color: muted }));
    doc.setTitle("WORK TRACKER — Shift report");
    return doc.save();
  }

  return { periodBounds, filterData, summary, buildExcel, buildCsv, buildPdf };
}));

(function attachWorkTrackerCore(root, factory) {
  const core = factory();
  if (typeof module === "object" && module.exports) module.exports = core;
  else root.WorkTrackerCore = core;
}(typeof globalThis !== "undefined" ? globalThis : this, function createWorkTrackerCore() {
  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function localTimeKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function createCompletedShift(active, endedAtValue, job) {
    const endedAt = endedAtValue instanceof Date ? endedAtValue : new Date(endedAtValue);
    const startedAt = new Date(active.startedAt);
    const workedMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
    const wage = Number(job?.hourlyWageGross || 0);
    return {
      id: active.id,
      jobId: active.jobId,
      date: localDateKey(startedAt),
      start: localTimeKey(startedAt),
      end: localTimeKey(endedAt),
      breakMinutes: 0,
      workedMinutes,
      wage,
      grossPayExpected: (workedMinutes / 60) * wage,
      workStatus: "completed",
      paidStatus: "unpaid",
      location: active.location || "",
      notes: active.notes || "",
      startedAt: active.startedAt,
      endedAt: endedAt.toISOString(),
      source: { type: "clock", verified: true }
    };
  }

  function buildPlannedShifts(values, existingShifts, idFactory) {
    const first = new Date(`${values.dateFrom}T12:00:00`);
    const last = new Date(`${values.dateTo}T12:00:00`);
    if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || last < first) return [];
    const created = [];
    for (let date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
      const day = date.getDay();
      const include = values.dayPattern === "everyday" || (values.dayPattern === "weekdays" && day >= 1 && day <= 5) || (values.dayPattern === "weekends" && (day === 0 || day === 6));
      if (!include) continue;
      const dateValue = localDateKey(date);
      const duplicate = [...existingShifts, ...created].some((shift) => shift.jobId === values.jobId && shift.date === dateValue && shift.start === values.start && shift.end === values.end);
      if (duplicate) continue;
      created.push({
        id: idFactory(), jobId: values.jobId, date: dateValue, start: values.start, end: values.end,
        breakMinutes: 0, workStatus: "confirmed", paidStatus: "unpaid",
        location: values.location || "", notes: values.notes || "", source: { type: "period-plan", verified: true }
      });
    }
    return created;
  }

  return { createCompletedShift, buildPlannedShifts };
}));

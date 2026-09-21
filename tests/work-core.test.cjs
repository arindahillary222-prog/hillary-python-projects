const assert = require("node:assert/strict");
const core = require("../web/work-core.js");

const active = { id: "live-1", jobId: "painting", startedAt: "2026-09-07T06:30:00.000Z", location: "Lichtenreuth", notes: "Doors" };
const stopped = core.createCompletedShift(active, "2026-09-07T15:00:00.000Z", { hourlyWageGross: 14 });
assert.equal(stopped.workedMinutes, 510);
assert.equal(stopped.breakMinutes, 0);
assert.equal(stopped.grossPayExpected, 119);
assert.equal(stopped.workStatus, "completed");
assert.equal(stopped.paidStatus, "unpaid");
assert.equal(stopped.source.type, "clock");

let id = 0;
const plan = core.buildPlannedShifts({ jobId: "lehrieder", dateFrom: "2026-09-14", dateTo: "2026-09-18", dayPattern: "weekdays", start: "12:00", end: "18:00", location: "Bistro 6/7", notes: "Confirmed" }, [], () => `plan-${++id}`);
assert.equal(plan.length, 5);
assert.ok(plan.every((shift) => shift.breakMinutes === 0 && shift.workStatus === "confirmed"));

const withoutDuplicate = core.buildPlannedShifts({ jobId: "lehrieder", dateFrom: "2026-09-14", dateTo: "2026-09-18", dayPattern: "weekdays", start: "12:00", end: "18:00", location: "Bistro 6/7", notes: "Confirmed" }, [plan[0]], () => `plan-${++id}`);
assert.equal(withoutDuplicate.length, 4);

console.log("Work-core tests passed: clock start/stop calculation, zero breaks, pay, period planning, and duplicate prevention.");

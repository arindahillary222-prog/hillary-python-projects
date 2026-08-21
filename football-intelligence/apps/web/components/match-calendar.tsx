"use client";

import { useState } from "react";
import { type Fixture } from "./upcoming-fixtures";

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function createCalendar(fixtures: Fixture[]) {
  const createdAt = icsDate(new Date());
  const events = fixtures.flatMap((fixture) => {
    const startsAt = new Date(fixture.kickoff_at);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    const title = `${fixture.home_team} vs ${fixture.away_team}`;
    return [
      "BEGIN:VEVENT",
      `UID:${fixture.id}@arawee-mayeku-sportz`,
      `DTSTAMP:${createdAt}`,
      `DTSTART:${icsDate(startsAt)}`,
      `DTEND:${icsDate(endsAt)}`,
      `SUMMARY:${icsText(title)}`,
      `LOCATION:${icsText(fixture.venue)}`,
      `DESCRIPTION:${icsText("Football match reminder from Arawee/Mayeku-Sportz. Verify kick-off time with the competition before travelling or acting.")}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`${title} starts in 30 minutes`)}`,
      "END:VALARM",
      "END:VEVENT",
    ];
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Arawee/Mayeku-Sportz//Match reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR", ""].join("\r\n");
}

function downloadCalendar(fixtures: Fixture[]) {
  const blob = new Blob([createCalendar(fixtures)], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fixtures.length === 1 ? `${fixtures[0].id}-reminder.ics` : "arawee-match-reminders.ics";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}

function kickoff(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin", timeZoneName: "short" }).format(new Date(value));
}

export function MatchCalendar({ fixtures }: { fixtures: Fixture[] }) {
  const [message, setMessage] = useState("");

  function add(fixturesToAdd: Fixture[]) {
    downloadCalendar(fixturesToAdd);
    setMessage(fixturesToAdd.length === 1 ? "Reminder file downloaded. Open it to add the match and its 30-minute alert to your calendar." : `${fixturesToAdd.length} match reminders downloaded. Open the file to add them to your calendar.`);
  }

  return <section className="match-calendar" aria-labelledby="calendar-title">
    <div className="calendar-heading"><div><p className="eyebrow">YOUR MATCH CALENDAR</p><h2 id="calendar-title">Schedule reminders.</h2><p>Add one fixture or the complete board to Apple Calendar, Google Calendar, Outlook, or another calendar app. Each event includes a 30-minute alert.</p></div><button className="calendar-all" type="button" onClick={() => add(fixtures)}>Add all {fixtures.length}</button></div>
    {message ? <p className="calendar-message" aria-live="polite">{message}</p> : null}
    <ul className="calendar-list">{fixtures.map((fixture) => <li key={fixture.id}><div><strong>{fixture.home_team} vs {fixture.away_team}</strong><span>{kickoff(fixture.kickoff_at)} · {fixture.venue}</span></div><button type="button" onClick={() => add([fixture])}>Add reminder</button></li>)}</ul>
  </section>;
}

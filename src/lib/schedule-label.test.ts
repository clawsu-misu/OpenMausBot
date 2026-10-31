import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLocale, t } from "@/lib/i18n";
import { atLocalTime } from "./routine-calendar";

import { dayNames, intervalLabel, niceDate, niceTime, scheduleLabel, scheduleSentence, whenLabel } from "./schedule-label";
import { describeCronSchedule } from "../../shared/cron-label";

describe("schedule labels", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => setLocale("en"));
  it.each([
    ["0 9 1 * *", "Monthly on day 1 at 9:00"],
    ["30 8 L * *", "Monthly on the last day at 8:30"],
    ["0 9 1 1 *", "Yearly on January 1 at 9:00"],
    ["0 9 * * 1#2", "Monthly on the second Monday at 9:00"],
    ["0 9 * * 1-5", "Every weekday at 9:00"],
    ["30 17 * * 5", "Weekly on Friday at 17:30"],
    ["0 9 1 * 1", "Cron 0 9 1 * 1"],
    ["*/15 9-17 * * 1-5", "Cron */15 9-17 * * 1-5"],
  ])("labels %s without inventing a meaning for arbitrary expressions", (expression, description) => {
    const schedule = { type: "cron" as const, expression, timeZone: "Asia/Kolkata" };
    expect(scheduleLabel(schedule)).toBe(`${description} India time`);
    expect(scheduleSentence(schedule)).toBe(`${description} India time`);
  });
  it("keeps interval restrictions in both compact labels and prose", () => {
    const schedule = { type: "interval" as const, everyMinutes: 5, anchorAt: 0,
      weekdays: [1, 2, 3, 4, 5], window: { start: "09:00", end: "17:00" },
      endsAt: new Date(2026, 8, 30, 23, 59).getTime() };
    for (const label of [scheduleLabel(schedule), scheduleSentence(schedule)]) {
      expect(label).toContain("weekdays");
      expect(label).toContain("until");
      expect(label).toContain("2026");
    }
  });
  it("names intervals", () => {
    expect(intervalLabel(5)).toBe("Every 5 min");
    expect(intervalLabel(60)).toBe("Every hour");
    expect(intervalLabel(120)).toBe("Every 2 hr");
    expect(intervalLabel(90)).toBe("Every 1 hr 30 min");
  });

  it("writes schedules as prose", () => {
    expect(scheduleSentence({ type: "interval", everyMinutes: 5, anchorAt: 0 })).toBe("every 5 minutes");
    expect(scheduleSentence({ type: "interval", everyMinutes: 60, anchorAt: 0 })).toBe("every hour");
    expect(scheduleSentence({ type: "interval", everyMinutes: 120, anchorAt: 0 })).toBe("every 2 hours");
    expect(scheduleSentence({ type: "interval", everyMinutes: 90, anchorAt: 0 })).toBe("every 1 hour 30 minutes");
    expect(scheduleSentence({ type: "daily", time: "09:00", weekdays: [1, 2, 3, 4, 5] })).toMatch(/^every weekday at /);
    expect(scheduleSentence({ type: "daily", time: "09:00", weekdays: [0, 1, 2, 3, 4, 5, 6] })).toMatch(/^every day at /);
    expect(scheduleSentence({ type: "daily", time: "09:00", weekdays: [3] })).toMatch(/^weekly on Wed at /);
    expect(scheduleSentence({ type: "once", at: Date.UTC(2026, 8, 5, 12) })).toMatch(/^once on /);
  });

  it("labels a change by time today and by date otherwise", () => {
    const now = Date.now();
    expect(whenLabel(now)).toBe(new Date(now).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }));
    const lastYear = new Date(now);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    expect(whenLabel(lastYear.getTime())).toBe(
      lastYear.toLocaleDateString("en", { month: "short", day: "numeric" }),
    );
  });

  it("formats dates using the application language instead of the system language", () => {
    setLocale("zh");
    const date = new Date(2026, 8, 8, 12, 30);
    expect(niceDate(date.getTime())).toBe(date.toLocaleDateString("zh", { weekday: "long", month: "long", day: "numeric" }));
    expect(niceTime(date.getTime())).toBe(date.toLocaleTimeString("zh", { hour: "numeric", minute: "2-digit" }));
  });

  it("localizes human schedule wording with the selected app language", () => {
    setLocale("zh");
    const schedule = { type: "daily" as const, time: "09:00", weekdays: [1, 2, 3, 4, 5] };
    const expected = t("format.schedule.at", {
      label: t("format.schedule.everyWeekday"),
      time: niceTime(atLocalTime(Date.now(), schedule.time)),
    });
    expect(scheduleLabel(schedule)).toBe(expected);
    expect(expected).toContain("工作日");
  });

  it("returns weekday names from the currently selected app language", () => {
    setLocale("de");
    expect(dayNames("long")).toEqual(Array.from({ length: 7 }, (_, day) =>
      new Intl.DateTimeFormat("de", { weekday: "long" }).format(new Date(2024, 0, 7 + day))));
  });

  it("exposes structured descriptions for familiar cron presets and keeps arbitrary expressions intact", () => {
    expect(describeCronSchedule({ type: "cron", expression: "0 9 1 * *", timeZone: "UTC" }))
      .toEqual({ kind: "monthlyDay", day: 1, time: "9:00" });
    expect(describeCronSchedule({ type: "cron", expression: "*/15 9-17 * * 1-5", timeZone: "UTC" }))
      .toEqual({ kind: "expression", expression: "*/15 9-17 * * 1-5" });
  });
});

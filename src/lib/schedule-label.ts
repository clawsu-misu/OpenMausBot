import { atLocalTime } from "@/lib/routine-calendar";
import type { RoutineSchedule } from "@/lib/routines";
import { describeCronSchedule } from "../../shared/cron-label";
import { limitResetWhen } from "@/lib/limit-resets";
import { activeLocale, documentLanguage, t } from "@/lib/i18n";
import { plainTimeZone } from "../../shared/plain-time-zone";

const locale = () => documentLanguage(activeLocale());
const number = (value: number) => new Intl.NumberFormat(locale()).format(value);
const weekdayName = (day: number, weekday: "short" | "long") =>
  new Intl.DateTimeFormat(locale(), { weekday }).format(new Date(2024, 0, 7 + day));

export function dayNames(weekday: "short" | "long" = "short"): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => weekdayName(day, weekday));
}
const ORDINAL_KEYS = {
  first: "format.schedule.ordinal1",
  second: "format.schedule.ordinal2",
  third: "format.schedule.ordinal3",
  fourth: "format.schedule.ordinal4",
  fifth: "format.schedule.ordinal5",
  last: "format.schedule.last",
} as const;

export function niceTime(at: number): string {
  return new Date(at).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
}

export function niceDate(at: number): string {
  return new Date(at).toLocaleDateString(locale(), { weekday: "long", month: "long", day: "numeric" });
}

export function whenLabel(at: number): string {
  const date = new Date(at);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay ? niceTime(at) : date.toLocaleDateString(locale(), { month: "short", day: "numeric" });
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return t("format.duration.minutes", { count: number(minutes) });
  if (minutes % 60 === 0) return t("format.duration.hours", { count: number(minutes / 60) });
  return t("format.duration.mixed", { hours: number(Math.floor(minutes / 60)), minutes: number(minutes % 60) });
}

export function intervalLabel(minutes: number): string {
  if (minutes < 60) return t("format.schedule.everyMinutes", { count: number(minutes) });
  if (minutes === 60) return t("format.schedule.everyHour");
  if (minutes % 60 === 0) return t("format.schedule.everyHours", { count: number(minutes / 60) });
  return t("format.schedule.everyMixed", { hours: number(Math.floor(minutes / 60)), minutes: number(minutes % 60) });
}

function cronLabel(schedule: Extract<RoutineSchedule, { type: "cron" }>): string {
  const description = describeCronSchedule(schedule);
  let label: string;
  switch (description.kind) {
    case "everyDay": label = t("format.schedule.everyDayAt", { time: description.time }); break;
    case "everyWeekday": label = t("format.schedule.weekdaysAt", { time: description.time }); break;
    case "weekly": label = t("format.schedule.weeklyAt", { weekday: weekdayName(description.weekday, "long"), time: description.time }); break;
    case "monthlyDay": label = t("format.schedule.monthlyDayAt", { day: number(description.day), time: description.time }); break;
    case "monthlyLast": label = t("format.schedule.monthlyLastAt", { time: description.time }); break;
    case "yearly": {
      const month = new Intl.DateTimeFormat(locale(), { month: "long" }).format(new Date(2024, description.month - 1, 1));
      label = t("format.schedule.yearlyAt", { month, day: number(description.day), time: description.time });
      break;
    }
    case "monthlyWeekday":
      label = t("format.schedule.monthlyWeekdayAt", { order: t(ORDINAL_KEYS[description.order]), weekday: weekdayName(description.weekday, "long"), time: description.time });
      break;
    case "expression": label = t("format.schedule.cron", { expression: description.expression }); break;
  }
  return `${label} ${plainTimeZone(schedule.timeZone, locale())}`;
}

function intervalRestrictions(schedule: Extract<RoutineSchedule, { type: "interval" }>): string[] {
  const details: string[] = [];
  if (schedule.weekdays && schedule.weekdays.length < 7) {
    details.push(schedule.weekdays.join(",") === "1,2,3,4,5"
      ? t("format.schedule.weekdays")
      : schedule.weekdays.map((day) => weekdayName(day, "short")).join(", "));
  }
  if (schedule.window) {
    const wallTime = (time: string) => {
      const [hour, minute] = time.split(":").map(Number);
      return niceTime(new Date(2000, 0, 1, hour, minute).getTime());
    };
    details.push(t("format.schedule.window", { start: wallTime(schedule.window.start), end: wallTime(schedule.window.end) }));
  }
  if (schedule.endsAt != null) {
    details.push(t("format.schedule.until", { date: new Date(schedule.endsAt).toLocaleDateString(locale(), { month: "short", day: "numeric", year: "numeric" }) }));
  }
  return details;
}

export function scheduleLabel(schedule: RoutineSchedule | { type: "once"; at: number } | { type: "daily"; time: string; weekdays: number[] }): string {
  if (schedule.type === "cron") return cronLabel(schedule);
  if (schedule.type === "limit_reset") return limitResetWhen(schedule);
  if (schedule.type === "once") return `${niceDate(schedule.at)}, ${niceTime(schedule.at)}`;
  if (schedule.type === "interval") {
    return [intervalLabel(schedule.everyMinutes), ...intervalRestrictions(schedule)].join(" · ");
  }
  const days = schedule.weekdays;
  const label = days.length === 7
    ? t("format.schedule.everyDay")
    : days.join(",") === "1,2,3,4,5"
      ? t("format.schedule.everyWeekday")
      : days.length === 1
        ? t("format.schedule.weeklyOn", { weekday: weekdayName(days[0]!, "short") })
        : days.map((day) => weekdayName(day, "short")).join(", ");
  return t("format.schedule.at", { label, time: niceTime(atLocalTime(Date.now(), schedule.time)) });
}

export function scheduleSentence(schedule: RoutineSchedule): string {
  if (schedule.type === "cron") return cronLabel(schedule);
  if (schedule.type === "limit_reset") return limitResetWhen(schedule);
  if (schedule.type === "interval") {
    const cadence = schedule.everyMinutes < 60
      ? t("format.schedule.sentenceEveryMinutes", { count: number(schedule.everyMinutes) })
      : schedule.everyMinutes === 60
        ? t("format.schedule.sentenceEveryHour")
        : schedule.everyMinutes % 60 === 0
          ? t("format.schedule.sentenceEveryHours", { count: number(schedule.everyMinutes / 60) })
          : t(Math.floor(schedule.everyMinutes / 60) === 1 ? "format.schedule.sentenceEveryMixedOne" : "format.schedule.sentenceEveryMixedMany", { hours: number(Math.floor(schedule.everyMinutes / 60)), minutes: number(schedule.everyMinutes % 60) });
    return [cadence, ...intervalRestrictions(schedule)].join(" · ");
  }
  if (schedule.type === "once") {
    return t("format.schedule.onceAt", { date: niceDate(schedule.at), time: niceTime(schedule.at) });
  }
  const days = schedule.weekdays;
  const timeStr = niceTime(atLocalTime(Date.now(), schedule.time));

  if (days.length === 7) {
    return t("format.schedule.sentenceEveryDayAt", { time: timeStr });
  }
  if (days.join(",") === "1,2,3,4,5") {
    return t("format.schedule.sentenceWeekdaysAt", { time: timeStr });
  }
  if (days.length === 1) {
    return t("format.schedule.sentenceWeeklyAt", { weekday: weekdayName(days[0]!, "short"), time: timeStr });
  }

  return t("format.schedule.at", { label: days.map((day) => weekdayName(day, "short")).join(", "), time: timeStr });
}

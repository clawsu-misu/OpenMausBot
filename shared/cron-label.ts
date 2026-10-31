import { plainTimeZone } from "./plain-time-zone.ts";
import type { RoutineCronSchedule } from "./routine-schedule.ts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type CronScheduleDescription =
  | { kind: "everyDay" | "everyWeekday" | "monthlyLast"; time: string }
  | { kind: "monthlyDay"; day: number; time: string }
  | { kind: "yearly"; month: number; day: number; time: string }
  | { kind: "weekly"; weekday: number; time: string }
  | { kind: "monthlyWeekday"; weekday: number; order: "first" | "second" | "third" | "fourth" | "fifth" | "last"; time: string }
  | { kind: "expression"; expression: string };

/** Describe familiar presets; retain the exact expression for everything else.
 * This is presentation only, never a second parser or source of scheduling truth. */
export function describeCronSchedule(schedule: RoutineCronSchedule): CronScheduleDescription {
  const [minute, hour, day, month, weekday] = schedule.expression.trim().split(/\s+/);
  if (/^\d+$/.test(minute ?? "") && /^\d+$/.test(hour ?? "")) {
    const time = `${Number(hour)}:${minute!.padStart(2, "0")}`;
    const monthDay = /^\d+$/.test(day ?? "") ? Number(day) : null;
    if (weekday === "*" && month === "*") {
      if (day === "*") return { kind: "everyDay", time };
      if (day === "L") return { kind: "monthlyLast", time };
      if (monthDay !== null) return { kind: "monthlyDay", day: monthDay, time };
    } else if (weekday === "*" && /^\d+$/.test(month ?? "") && monthDay !== null) {
      const monthNumber = Number(month);
      if (MONTHS[monthNumber - 1]) return { kind: "yearly", month: monthNumber, day: monthDay, time };
    } else if (day === "*" && month === "*") {
      if (weekday === "1-5" || weekday?.toUpperCase() === "MON-FRI") return { kind: "everyWeekday", time };
      if (/^[0-7]$/.test(weekday ?? "")) return { kind: "weekly", weekday: Number(weekday) % 7, time };
      const nth = /^([0-7])#([1-5]|L)$/i.exec(weekday ?? "");
      if (nth) {
        const order = nth[2]!.toUpperCase() === "L" ? "last" : ["", "first", "second", "third", "fourth", "fifth"][Number(nth[2])];
        if (order) return { kind: "monthlyWeekday", weekday: Number(nth[1]) % 7, order: order as "first" | "second" | "third" | "fourth" | "fifth" | "last", time };
      }
    }
  }
  return { kind: "expression", expression: schedule.expression };
}

export function cronScheduleLabel(schedule: RoutineCronSchedule): string {
  const description = describeCronSchedule(schedule);
  let label: string;
  switch (description.kind) {
    case "everyDay": label = `Every day at ${description.time}`; break;
    case "everyWeekday": label = `Every weekday at ${description.time}`; break;
    case "monthlyLast": label = `Monthly on the last day at ${description.time}`; break;
    case "monthlyDay": label = `Monthly on day ${description.day} at ${description.time}`; break;
    case "yearly": label = `Yearly on ${MONTHS[description.month - 1]} ${description.day} at ${description.time}`; break;
    case "weekly": label = `Weekly on ${WEEKDAYS[description.weekday]} at ${description.time}`; break;
    case "monthlyWeekday": label = `Monthly on the ${description.order} ${WEEKDAYS[description.weekday]} at ${description.time}`; break;
    case "expression": label = `Cron ${description.expression}`; break;
  }
  return `${label} ${plainTimeZone(schedule.timeZone)}`;
}

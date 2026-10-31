/** Zones whose generic name reads oddly in a sentence ("United Kingdom Time"), said the way people say them. */
const SAID: Record<string, string> = {
  "Europe/London": "UK time", "Europe/Belfast": "UK time", "America/Phoenix": "Arizona time", "Asia/Dubai": "UAE time",
};
const UNIVERSAL = /^(?:Etc\/)?(?:UTC|UCT|GMT|Universal|Zulu|Greenwich)(?:[+-]0)?$/i;
const ABBREVIATION = /^(?:[A-Z]{1,5}|GMT.*|UTC.*)$/;

function safeLocale(locale: string): string {
  try { return Intl.getCanonicalLocales(locale.trim() || "en")[0] ?? "en"; } catch { return "en"; }
}

function zoneName(zone: string, locale: string, style: "shortGeneric" | "longGeneric"): string | null {
  try {
    const name = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style })
      .formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;
    return name && !ABBREVIATION.test(name) ? name : null;
  } catch {
    return null;
  }
}

/** A time zone as a person says it: "India time", "Pacific time", "Germany time", "UTC". Never the IANA id
 * ("Asia/Calcutta"), an abbreviation ("PT") or an offset ("GMT+5:30"). */
export function plainTimeZone(zone: string, locale = "en"): string {
  const safe = safeLocale(locale);
  const english = safe.toLowerCase().startsWith("en");
  if (UNIVERSAL.test(zone.trim())) return "UTC";
  if (english && SAID[zone]) return SAID[zone]!;
  const name = zoneName(zone, safe, "shortGeneric") ?? zoneName(zone, safe, "longGeneric");
  if (name) return english ? name.replace(/ Time$/, " time") : name;
  const city = zone.split("/").at(-1)?.replaceAll("_", " ").trim();
  return city ? `${city} time` : zone;
}

/** "09:00" as people write it: "9:00". */
export const plainClock = (time: string) => time.replace(/^0(\d):/, "$1:");

/** Local weekdays (Sunday = 0) as people say them: "every day", "weekdays", "Monday, Wednesday". */
export function plainWeekdays(weekdays: readonly number[], locale = "en", labels?: { everyDay?: string; weekdays?: string }): string {
  const days = [...weekdays].sort((a, b) => a - b).join(",");
  if (days === "0,1,2,3,4,5,6") return labels?.everyDay ?? "every day";
  if (days === "1,2,3,4,5") return labels?.weekdays ?? "weekdays";
  const safe = safeLocale(locale);
  const sunday = Date.UTC(2023, 0, 1);
  return weekdays.map((day) => new Intl.DateTimeFormat(safe, { weekday: "long", timeZone: "UTC" }).format(sunday + day * 86_400_000))
    .join(safe.toLowerCase().startsWith("zh") ? "、" : ", ");
}

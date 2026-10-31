import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n";
import { resetTime } from "./limit-resets";

describe("limit reset time labels", () => {
  afterEach(() => setLocale("en"));

  it("uses the selected app language for today's time and a future weekday", () => {
    setLocale("zh");
    const now = new Date(2026, 8, 10, 12).getTime();
    const today = new Date(2026, 8, 10, 15, 30);
    const later = new Date(2026, 8, 11, 9, 5);
    expect(resetTime(today.getTime(), now)).toBe(today.toLocaleString("zh", { hour: "numeric", minute: "2-digit" }));
    expect(resetTime(later.getTime(), now)).toBe(later.toLocaleString("zh", { weekday: "short", hour: "numeric", minute: "2-digit" }));
  });
});

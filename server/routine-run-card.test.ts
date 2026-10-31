import { describe, expect, it } from "vitest";

import { routineRunFallbackText } from "./routine-run-card.ts";
import "./server-line-packs.ts";

const card = {
  runId: "run-1",
  routineId: "routine-1",
  routineName: "Morning brief",
  status: "waiting" as const,
  summary: "Should I send it?",
};

describe("routine run fallback copy", () => {
  it("keeps English as the default and localizes the status", () => {
    expect(routineRunFallbackText(card)).toBe("Routine “Morning brief” needs your attention\n\nShould I send it?");
    expect(routineRunFallbackText(card, "zh-CN")).toBe("定时任务“Morning brief”需要你留意\n\nShould I send it?");
  });
});

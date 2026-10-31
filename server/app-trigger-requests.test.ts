import { describe, expect, it } from "vitest";

import { appTriggerSentence, appWhenText } from "./app-trigger-requests.ts";
import "./server-line-packs.ts";

const trigger = {
  app: "gmail",
  event: "GMAIL_NEW_GMAIL_MESSAGE",
  eventName: "New Gmail message",
  accountLabel: "sales",
  filter: { from: "acme.com", subject: "invoice" },
  delivery: "poll" as const,
  prompt: "Draft a short follow-up.",
};

describe("app-trigger request copy", () => {
  it("keeps English as the default", () => {
    expect(appWhenText(trigger)).toBe("When an email arrives in Gmail (sales) from acme.com about “invoice” (it checks every 15 minutes)");
    expect(appTriggerSentence(trigger, "Support")).toContain("Support follows: Draft a short follow-up.");
  });

  it("writes receipt text in the person's app language", () => {
    expect(appWhenText(trigger, "zh-CN")).toBe("收到 Gmail 邮件时 (sales) 发件人：acme.com 主题包含“invoice”（每 15 分钟检查一次）");
    expect(appTriggerSentence(trigger, "Support", "zh-CN")).toContain("由Support执行：Draft a short follow-up.");
  });
});

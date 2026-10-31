import { describe, expect, it } from "vitest";

import { connectorCardText } from "./connector-card-text.ts";
import "./server-line-packs.ts";

describe("connectorCardText", () => {
  it("names the app the bot is waiting on", () => {
    expect(connectorCardText("GitHub")).toBe("Connect GitHub to continue.");
  });

  it("names the account for a second-account card", () => {
    expect(connectorCardText("Gmail", "work")).toBe("Connect Gmail as “work” to continue.");
  });

  it("collapses stray whitespace and never prints an empty name", () => {
    expect(connectorCardText("  Google \n Calendar ", "  ")).toBe("Connect Google Calendar to continue.");
    expect(connectorCardText("   ")).toBe("Connect this app to continue.");
  });

  it("uses the requested language without changing the default", () => {
    expect(connectorCardText("GitHub", undefined, "zh-CN")).toBe("连接 GitHub 以继续。");
    expect(connectorCardText("Gmail", "work", "zh-CN")).toBe("连接 Gmail（名称为“work”）以继续。");
  });
});

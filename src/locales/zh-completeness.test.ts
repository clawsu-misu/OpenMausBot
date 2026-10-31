import { describe, expect, it } from "vitest";
import en from "./en.json";
import zh from "./zh.json";

describe("Simplified Chinese catalog", () => {
  it("covers every English key without unknown entries", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });
});

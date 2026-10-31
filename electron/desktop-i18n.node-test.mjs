import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { desktopText } from "./desktop-i18n.mjs";

test("native menus use the chosen Simplified Chinese language and preserve server names", () => {
  for (const language of ["zh", "zh-CN", "zh-SG", "zh-Hans-CN"]) {
    assert.equal(desktopText(language, "desktop.server"), "服务器");
    assert.equal(desktopText(language, "desktop.forgetNamedServer", { name: "Research {name}" }), "移除“Research {name}”");
  }
  assert.equal(desktopText("en", "desktop.server"), "Server");
  assert.equal(desktopText("de", "desktop.server"), "Server");
  assert.equal(desktopText("zh-TW", "desktop.server"), "Server");
  assert.equal(desktopText("zh-Hant", "desktop.server"), "Server");
});

test("desktop language catalogs are included in the packaged app", () => {
  const configuration = readFileSync(new URL("../electron-builder.yml", import.meta.url), "utf8");
  assert.match(configuration, /^  - src\/locales\/en\.json$/m);
  assert.match(configuration, /^  - src\/locales\/zh\.json$/m);
});

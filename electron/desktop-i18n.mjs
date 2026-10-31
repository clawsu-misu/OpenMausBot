import en from "../src/locales/en.json" with { type: "json" };
import zh from "../src/locales/zh.json" with { type: "json" };

export function desktopText(language, key, params) {
  const chinese = /^zh(?:$|-(?:cn|sg|hans)(?:-|$))/i.test(language ?? "");
  const template = (chinese ? zh[key] : undefined) ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => params && Object.hasOwn(params, name) ? String(params[name]) : match);
}

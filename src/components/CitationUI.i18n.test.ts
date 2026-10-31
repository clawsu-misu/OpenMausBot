// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { citationAttachment, createCitationTextSelector } from "@/lib/citations";
import { setLocale } from "@/lib/i18n";
import { CitationBadge } from "./CitationUI";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => { setLocale("en"); });

it("translates citation actions and accessibility labels while preserving the quote", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const quote = "An original English quote";
  const citation = citationAttachment({ ownerType: "bot", ownerId: "b", threadId: "t", messageId: "m" }, createCitationTextSelector(quote, 0, quote.length)!);
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const render = () => root.render(createElement(CitationBadge, { citation, onChange, onRemove }));
  try {
    setLocale("zh-CN");
    await act(async () => render());
    expect(host.querySelector("button")?.getAttribute("aria-label")).toBe(`打开引用：${quote}`);
    expect(host.textContent).toBe(quote);
    await act(async () => host.querySelector("button")!.click());
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe("引用详情");
    const edit = Array.from(document.querySelectorAll("button")).find(button => button.textContent === "编辑评论")!;
    await act(async () => edit.click());
    expect(document.querySelector("textarea")?.placeholder).toBe("添加评论（可选）…");
    setLocale("en");
    await act(async () => render());
    expect(document.querySelector("textarea")?.placeholder).toBe("Add an optional comment…");
    expect(onChange).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

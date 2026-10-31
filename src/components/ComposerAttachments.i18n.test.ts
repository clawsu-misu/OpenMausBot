// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import { pasteAttachment, type Attachment } from "@/lib/composer-attachments";
import { ComposerAttachments } from "./ComposerAttachments";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { setLocale("en"); });

it("translates attachment labels while preserving types, contents, and callback identities", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const paste = pasteAttachment("Original English text\n第二行");
  const items: Attachment[] = [paste, { kind: "file", id: "file-1", path: "/private/report.csv", name: "report.csv", size: 100 }];
  const onRemove = vi.fn();
  const onDisplayInChatBox = vi.fn();
  const render = () => root.render(createElement(ComposerAttachments, {
    items, onRemove, onDisplayInChatBox, onAdd: vi.fn(), onChangeCitation: vi.fn(),
    notice: null, onNotice: vi.fn(), uploadImage: async () => null,
  }));
  try {
    setLocale("zh");
    await act(async () => render());
    expect(host.textContent).toContain("粘贴的文字");
    expect(host.textContent).toContain("文件");
    expect(host.textContent).toContain("2 行");
    expect(host.textContent).toContain("Original English text");
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="在输入框中显示粘贴的文字"]')!.click());
    expect(onDisplayInChatBox).toHaveBeenCalledWith(paste);
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="移除文件"]')!.click());
    expect(onRemove).toHaveBeenCalledWith("file-1");
    expect(items.map(item => item.kind)).toEqual(["paste", "file"]);
    setLocale("en");
    await act(async () => render());
    expect(host.textContent).toContain("PASTED");
    expect(host.textContent).toContain("FILE");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

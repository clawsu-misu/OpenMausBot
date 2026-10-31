import { ApiError, api } from "@/state/store";
import { activeLocale, documentLanguage, t } from "@/lib/i18n";

export const MEMORY_INDEX = "MEMORY.md";

export interface MemoryCapacity {
  lines: number;
  bytes: number;
  maxLines: number;
  maxBytes: number;
  loadedLines: number;
  loadedBytes: number;
  truncated: boolean;
  hash: string;
}

export interface MemoryFileInfo {
  path: string;
  name: string;
  bytes: number;
  modifiedAt: number;
}

export interface MemoryOverview {
  lendingReview?: LendingReview;
  botId: string;
  workspacePath: string;
  index: MemoryCapacity;
  topics: MemoryFileInfo[];
  logs: MemoryFileInfo[];
}

export interface MemoryDoc {
  path: string;
  text: string;
  hash: string;
  exists: boolean;
}

export type MemoryActor = "bot" | "person" | "import" | "upkeep";

export interface MemoryJournalRow {
  id: string;
  at: number;
  botId: string;
  path: string;
  actor: MemoryActor;
  via: string;
  threadId?: string;
  threadTitle?: string;
  kind: "created" | "edited" | "deleted";
  beforeHash: string | null;
  afterHash: string | null;
  diff: string;
  added: number;
  removed: number;
  canRevert: boolean;
  revertUnavailableReason?: string;
}

export type SaveResult =
  | { ok: true; doc: MemoryDoc; overview: MemoryOverview }
  | { ok: false; conflict: true; current: string; currentHash: string };

/** `mine`: on a Team Cloud, the signed-in person's own layer of the bot's memory rather than the team's. */
const memoryRoute = (botId: string, mine: boolean) => `/api/bots/${botId}/memory${mine ? "/mine" : ""}`;

export function fetchMemoryOverview(botId: string, mine = false): Promise<MemoryOverview> {
  return api(memoryRoute(botId, mine));
}

export function fetchMemoryDoc(botId: string, path: string, mine = false): Promise<MemoryDoc> {
  return api(`${memoryRoute(botId, mine)}/file?path=${encodeURIComponent(path)}`);
}

export async function saveMemoryDoc(botId: string, path: string, text: string, expectedHash: string | undefined, mine = false): Promise<SaveResult> {
  const response = await fetch(`${memoryRoute(botId, mine)}/file`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, text, expectedHash }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 409 && typeof body.current === "string" && typeof body.currentHash === "string") {
    return { ok: false, conflict: true, current: body.current, currentHash: body.currentHash };
  }
  if (!response.ok) throw new ApiError(typeof body.error === "string" ? body.error : `${response.status} ${response.statusText}`, response.status);
  const saved = body as unknown as MemoryDoc & { overview: MemoryOverview };
  return { ok: true, doc: { path: saved.path, text: saved.text, hash: saved.hash, exists: saved.exists }, overview: saved.overview };
}

export function deleteMemoryDoc(botId: string, path: string, mine = false): Promise<{ overview: MemoryOverview }> {
  return api(`${memoryRoute(botId, mine)}/file?path=${encodeURIComponent(path)}`, { method: "DELETE" });
}

export async function fetchMemoryJournal(botId: string, limit = 50): Promise<MemoryJournalRow[]> {
  const result: { entries: MemoryJournalRow[] } = await api(`/api/bots/${botId}/memory/journal?limit=${limit}`);
  return result.entries;
}

export function revertMemoryChange(botId: string, entryId: string): Promise<MemoryDoc & { overview: MemoryOverview }> {
  return api(`/api/bots/${botId}/memory/journal/${encodeURIComponent(entryId)}/revert`, { method: "POST" });
}

export interface TidyReport {
  at: number;
  expired: number;
  duplicates: number;
  superseded: number;
  deferred: number;
  organized?: number;
  contradictionsChecked: boolean;
  note?: string;
}

export interface CaptureReport {
  at: number;
  added: number;
  topics?: number;
  aboutMe?: number;
  note?: string;
}

export interface UpkeepStatus {
  enabled: boolean;
  modelSteps: boolean;
  lastTidy?: TidyReport;
  lastCapture?: CaptureReport;
}

export function noticedCount(report: CaptureReport | undefined): number {
  return report ? report.added + (report.topics ?? 0) : 0;
}

export function fetchUpkeepStatus(botId: string): Promise<UpkeepStatus> {
  return api(`/api/bots/${botId}/memory/upkeep`);
}

export interface LendingReview {
  token: string;
  changed: string[];
}

export function markMemoryReviewed(botId: string, token: string): Promise<{ ok: true; lendingReview: false }> {
  return api(`/api/bots/${botId}/memory/reviewed`, { method: "POST", body: JSON.stringify({ token }) });
}

export function tidyMemoryNow(botId: string): Promise<{ report: TidyReport; overview: MemoryOverview }> {
  return api(`/api/bots/${botId}/memory/tidy`, { method: "POST" });
}

export function tidySummary(report: TidyReport): string {
  const parts: string[] = [];
  const add = (count: number | undefined, one: "memory.upkeep.summary.archived.one" | "memory.upkeep.summary.merged.one" | "memory.upkeep.summary.crossed.one" | "memory.upkeep.summary.filed.one", many: "memory.upkeep.summary.archived.many" | "memory.upkeep.summary.merged.many" | "memory.upkeep.summary.crossed.many" | "memory.upkeep.summary.filed.many") => {
    if (count) parts.push(t(count === 1 ? one : many, { count }));
  };
  add(report.expired, "memory.upkeep.summary.archived.one", "memory.upkeep.summary.archived.many");
  add(report.duplicates, "memory.upkeep.summary.merged.one", "memory.upkeep.summary.merged.many");
  add(report.superseded, "memory.upkeep.summary.crossed.one", "memory.upkeep.summary.crossed.many");
  add(report.organized, "memory.upkeep.summary.filed.one", "memory.upkeep.summary.filed.many");
  const head = parts.length ? parts.join(", ") : t("memory.upkeep.summary.none");
  return head.charAt(0).toUpperCase() + head.slice(1);
}

export type MemoryOpenTarget = "obsidian" | "folder";

export function openMemoryLocation(botId: string, target: MemoryOpenTarget): Promise<{ ok: boolean; workspacePath: string }> {
  return api(`/api/bots/${botId}/memory/open`, { method: "POST", body: JSON.stringify({ target }) });
}


export function formatBytes(bytes: number): string {
  const locale = documentLanguage(activeLocale());
  return bytes < 1024
    ? `${new Intl.NumberFormat(locale).format(bytes)} B`
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.round(bytes / 102.4) / 10)} KB`;
}

export function relativeTime(at: number, now = Date.now()): string {
  return localizedRelativeTime(at, documentLanguage(activeLocale()), now);
}

export function localizedRelativeTime(at: number, locale: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  const language = documentLanguage(locale);
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  if (seconds < 45) return formatter.format(0, "second");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return formatter.format(-days, "day");
  return new Date(at).toLocaleDateString(language, { month: "short", day: "numeric" });
}

export type CapacityLevel = "ok" | "near" | "over";

export interface CapacityStatus {
  level: CapacityLevel;
  lineShare: number;
  byteShare: number;
  sentence: string;
  warning: string | null;
}

export function capacityStatus(index: MemoryCapacity): CapacityStatus {
  const number = (value: number) => new Intl.NumberFormat(documentLanguage(activeLocale())).format(value);
  const lineShare = index.maxLines ? index.lines / index.maxLines : 0;
  const byteShare = index.maxBytes ? index.bytes / index.maxBytes : 0;
  const level: CapacityLevel = index.truncated ? "over" : Math.max(lineShare, byteShare) >= 0.8 ? "near" : "ok";
  const sentence = t("memory.capacity.sentence", { lines: number(index.lines), maxLines: number(index.maxLines), bytes: formatBytes(index.bytes), maxBytes: formatBytes(index.maxBytes), maxLoaded: number(index.maxLines) });
  let warning: string | null = null;
  if (index.truncated) {
    const missingLines = index.lines - index.loadedLines;
    warning = missingLines > 0
      ? t(missingLines === 1 ? "format.memory.truncatedLineOne" : "format.memory.truncatedLines", { lines: number(index.lines), loaded: number(index.loadedLines), missing: number(missingLines) })
      : t("format.memory.truncatedBytes", { saved: formatBytes(index.bytes), loaded: formatBytes(index.loadedBytes) });
  }
  return { level, lineShare, byteShare, sentence, warning };
}

export function fileLabel(path: string): string {
  if (path === MEMORY_INDEX) return "MEMORY.md";
  if (path.startsWith("memory/log/")) return path.slice("memory/log/".length).replace(/\.md$/, "");
  return path.replace(/^memory\//, "").replace(/\.md$/, "");
}

export function journalSummary(row: MemoryJournalRow, botName: string): string {
  const who = row.actor === "bot" ? botName : row.actor === "import" ? t("memory.journal.actor.import") : row.actor === "upkeep" ? t("memory.journal.actor.upkeep") : t("memory.journal.actor.you");
  const file = fileLabel(row.path);
  const topic = row.path === MEMORY_INDEX ? file : row.path.startsWith("memory/log/") ? t("memory.journal.log", { file }) : t("memory.journal.topic", { file });
  const lines = (count: number) => t(count === 1 ? "memory.journal.line.one" : "memory.journal.line.many", { count });
  if (row.kind === "created") return t("memory.journal.created", { who, topic, detail: row.added ? t("memory.journal.withLines", { lines: lines(row.added) }) : "" });
  if (row.kind === "deleted") return t("memory.journal.deleted", { who, topic });
  if (row.added && !row.removed) return t("memory.journal.added", { who, lines: lines(row.added), topic });
  if (row.removed && !row.added) return t("memory.journal.removed", { who, lines: lines(row.removed), topic });
  return t("memory.journal.rewrote", { who, lines: lines(Math.max(row.added, row.removed)), topic });
}

export function journalSource(row: MemoryJournalRow): string | null {
  const key = journalSourceKey(row);
  return key ? t(key, row.threadTitle ? { title: row.threadTitle } : undefined) : null;
}

export function journalSourceKey(row: MemoryJournalRow): "memory.source.undo" | "memory.source.disk" | "memory.source.tidy" | "memory.source.organize" | "memory.source.capture" | "memory.source.captureWithTitle" | "memory.source.chat" | "memory.source.task" | "memory.source.settings" | "memory.source.api" | null {
  if (row.via === "revert") return "memory.source.undo";
  if (row.via === "disk") return "memory.source.disk";
  if (row.via === "tidy") return "memory.source.tidy";
  if (row.via === "organize") return "memory.source.organize";
  if (row.via === "capture") return row.threadTitle ? "memory.source.captureWithTitle" : "memory.source.capture";
  if (row.threadTitle) return "memory.source.chat";
  if (row.actor === "bot") return "memory.source.task";
  if (row.via === "ui") return "memory.source.settings";
  if (row.via === "api") return "memory.source.api";
  return null;
}

export function fileManagerLabel(platform: string | undefined): string {
  if (platform === "darwin") return t("format.memory.showInFinder");
  if (platform === "win32") return t("format.memory.showInExplorer");
  return t("format.memory.showInFileManager");
}

export function topicFileName(input: string): string | null {
  const stem = input.trim().replace(/\.md$/i, "").replace(/[^\w .-]+/g, "-").replace(/^[^\w]+/, "").trim();
  if (!stem) return null;
  return `${stem}.md`;
}

import type { Notification, NotifyKind } from "../shared/notification.ts";
import { personMentionExcerpt } from "../shared/person-mention.ts";
import { serverLine } from "./server-lines.ts";

export type { Notification, NotifyKind } from "../shared/notification.ts";

export function summarize(text: string, max = 140): string {
  const line = text.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

export interface NotifyBot {
  id: string;
  name: string;
  threadId: string;
  notifications?: boolean;
}

export function buildSpendNotification(
  bot: Pick<NotifyBot, "id" | "name">,
  threadId: string,
  text: { title: string; body: string },
): Notification {
  return { kind: "spend", botId: bot.id, botName: bot.name, threadId, title: text.title, body: summarize(text.body, 200) };
}

/** Something OpenMausBot did on its own about `bot` that the person hears once, in one plain line. */
export function buildNoticeNotification(bot: Pick<NotifyBot, "id" | "name">, threadId: string, text: string): Notification {
  return { kind: "notice", botId: bot.id, botName: bot.name, threadId, title: bot.name, body: summarize(text, 240) };
}

export function buildNotification(
  kind: NotifyKind,
  bot: Omit<NotifyBot, "threadId"> & { threadId?: string },
  threadId: string,
  detail: string,
  extra?: { avatarUrl?: string; group?: { id: string; name: string }; site?: string },
  language?: string,
): Notification | null {
  if (bot.notifications === false) return null;

  const body = summarize(detail);
  const who = extra?.group ? serverLine(language, "server.notify.whoInGroup", { bot: bot.name, group: extra.group.name }) : bot.name;
  const titleKey = kind === "approval" ? "server.notify.approval" : kind === "question" ? "server.notify.question"
    : kind === "sign-in" ? "server.notify.signIn" : kind === "routine-failed" ? "server.notify.routineFailed"
    : kind === "routine-deferred" ? "server.notify.routineWaiting" : kind === "turn-failed" ? "server.notify.turnFailed"
    : kind === "incident" ? "server.notify.incident" : kind === "delegation-settled" ? "server.notify.resumed"
    : kind === "mention" ? "server.notify.mentioned" : kind === "wait" ? "server.notify.waitOver" : "server.notify.finished";
  const title = serverLine(language, titleKey, { who, site: extra?.site ?? serverLine(language, "server.notify.website") });

  if ((kind === "done" || kind === "mention") && !body) return null;

  const notification: Notification = { kind, botId: bot.id, botName: bot.name, threadId, title, body };
  if (extra?.avatarUrl) notification.avatarUrl = extra.avatarUrl;
  if (extra?.group) notification.groupId = extra.group.id;
  return notification;
}

type MentionSource = {
  activePath(threadId: string): readonly { role: string; kind: string; text?: string; turnId?: string; from?: { botId: string } }[];
  bot(id: string): { name: string; hidden?: boolean } | null | undefined;
};

export function buildMentionNotification(
  source: MentionSource,
  bot: Omit<NotifyBot, "threadId"> & { avatarUrl?: string },
  room: { id: string; name: string; dm?: boolean; memberIds: readonly string[] },
  turn: { threadId: string; turnId?: string; reply: string; profileName?: string },
  language?: string,
): Notification | null {
  if (room.dm) return null;
  const texts = turn.turnId
    ? source.activePath(turn.threadId).filter((m) => m.role === "bot" && m.kind === "text" && m.turnId === turn.turnId && m.from?.botId === bot.id).map((m) => m.text ?? "")
    : [turn.reply];
  const botNames = room.memberIds.flatMap((id) => {
    const member = source.bot(id);
    return member && !member.hidden ? [member.name] : [];
  });
  for (const text of texts) {
    const excerpt = personMentionExcerpt(text, { profileName: turn.profileName, botNames });
    if (excerpt) return buildNotification("mention", { ...bot, threadId: turn.threadId }, turn.threadId, excerpt, { avatarUrl: bot.avatarUrl, group: room }, language);
  }
  return null;
}

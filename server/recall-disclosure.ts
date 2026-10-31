// Each private thread a room answer recalled from is announced once per room thread; in memory, so a restart re-announces (the safe direction).

const announced = new Map<string, Set<string>>();

export interface RecallCrossing {
  threadIds: string[];
  count: number;
}

export function claimRecallCrossings(roomThreadId: string, sources: readonly string[]): RecallCrossing {
  const seen = announced.get(roomThreadId) ?? new Set<string>();
  const threadIds: string[] = [];
  let count = 0;
  for (const threadId of sources) {
    if (seen.has(threadId)) continue;
    if (!threadIds.includes(threadId)) threadIds.push(threadId);
    count += 1;
  }
  if (!threadIds.length) return { threadIds: [], count: 0 };
  for (const threadId of threadIds) seen.add(threadId);
  announced.set(roomThreadId, seen);
  return { threadIds, count };
}

export type RecallLine = (key: "server.rooms.recalledPrivateMessage" | "server.rooms.recalledPrivateMessages" | "server.rooms.briefPrivateChat" | "server.rooms.briefPrivateChats", params: { bot: string; count: number }) => string;

export function recallCrossingLabel(botName: string, count: number, line: RecallLine = (key, params) => `${params.bot} recalled ${params.count} message${key.endsWith("Messages") ? "s" : ""} from its private chat with you`): string {
  return line(count === 1 ? "server.rooms.recalledPrivateMessage" : "server.rooms.recalledPrivateMessages", { bot: botName, count });
}

export function forgetRecallCrossings(roomThreadId?: string): void {
  if (roomThreadId === undefined) announced.clear();
  else announced.delete(roomThreadId);
}

export function briefCrossingLabel(botName: string, count: number, line: RecallLine = (key, params) => `${params.bot}'s recent-work brief covers ${params.count} private chat${key.endsWith("Chats") ? "s" : ""} with you`): string {
  return line(count === 1 ? "server.rooms.briefPrivateChat" : "server.rooms.briefPrivateChats", { bot: botName, count });
}

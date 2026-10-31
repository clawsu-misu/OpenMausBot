import type { InstanceConfigMap } from "./contracts.ts";
import { serverLine, type ServerLineKey } from "./server-lines.ts";

export const REMOVED_COMPUTER_DRIVER = "boxAgent";
const REMOVED_COMPUTER_INSTANCE = "computer";

/** An id the person reused for another engine is theirs and stays. */
export function removedComputerInstanceIds(saved: InstanceConfigMap | undefined): Set<string> {
  const ids = new Set<string>();
  const reused = saved && Object.hasOwn(saved, REMOVED_COMPUTER_INSTANCE) &&
    saved[REMOVED_COMPUTER_INSTANCE]!.driver !== REMOVED_COMPUTER_DRIVER;
  if (!reused) ids.add(REMOVED_COMPUTER_INSTANCE);
  for (const [id, entry] of Object.entries(saved ?? {})) {
    if (entry.driver === REMOVED_COMPUTER_DRIVER) ids.add(id);
  }
  return ids;
}

export function withoutComputerEngine(map: InstanceConfigMap): InstanceConfigMap {
  for (const [id, entry] of Object.entries(map)) {
    if (entry.driver === REMOVED_COMPUTER_DRIVER) delete map[id];
  }
  return map;
}

export interface ComputerEngineMove {
  botId: string;
  threadId: string;
  /** "bot": the bot's engine moved; "conversation": only this conversation's did; "bot-only": the bot's did, but this conversation keeps its own. */
  scope: "bot" | "conversation" | "bot-only";
  cloud: boolean;
  /** It worked on the cloud computer and the new engine can't: "auto" now works without one; "works-on" or "pin" still say Cloud, so turns are refused. */
  noComputer: false | "auto" | "works-on" | "pin";
  /** Permissions went back to Ask, as on any engine switch. */
  askNow: boolean;
}

export function computerEngineMoveText(
  move: Pick<ComputerEngineMove, "scope" | "cloud" | "askNow"> & Partial<Pick<ComputerEngineMove, "noComputer">>,
  botName: string,
  engine: string,
  language?: string,
): string {
  const keys = {
    removed: "server.computerEngine.removed", conversation: "server.computerEngine.conversation", botOnly: "server.computerEngine.botOnly",
    bot: "server.computerEngine.bot", cloudBot: "server.computerEngine.cloudBot", cloudConversation: "server.computerEngine.cloudConversation",
    autoBot: "server.computerEngine.autoBot", autoConversation: "server.computerEngine.autoConversation", worksOn: "server.computerEngine.worksOn",
    pinned: "server.computerEngine.pinned", askBotOnly: "server.computerEngine.askBotOnly", ask: "server.computerEngine.ask",
  } as const satisfies Record<string, ServerLineKey>;
  const line = (key: keyof typeof keys, values?: Record<string, string>) => serverLine(language, keys[key], values);
  const removed = line("removed");
  const bot = move.scope !== "conversation";
  const head = move.scope === "conversation" ? line("conversation", { engine })
    : move.scope === "bot-only" ? line("botOnly", { bot: botName, engine })
    : line("bot", { bot: botName, engine });
  const separator = language?.toLowerCase().startsWith("zh") ? "" : " ";
  const place = move.cloud
    ? bot ? `${separator}${line("cloudBot", { bot: botName })}` : `${separator}${line("cloudConversation", { bot: botName })}`
    : move.noComputer === "auto"
      ? `${separator}${line(bot ? "autoBot" : "autoConversation", { bot: botName, engine })}`
    : move.noComputer === "works-on"
      ? `${separator}${line("worksOn", { bot: botName, engine })}`
    : move.noComputer === "pin"
      ? `${separator}${line("pinned", { bot: botName, engine })}`
    : "";
  const ask = !move.askNow ? ""
    : move.scope === "bot-only" ? `${separator}${line("askBotOnly", { bot: botName })}`
    : `${separator}${line("ask")}`;
  return `${head}${separator}${removed}${place}${ask}`;
}

/** The move is saved already, so a failing line is logged and every other line is still written. */
export function writeComputerEngineMoveLines(moves: readonly ComputerEngineMove[], write: (move: ComputerEngineMove) => void): void {
  for (const move of moves) {
    try {
      write(move);
    } catch (error) {
      console.warn(`[engines] the Computer engine move line for ${move.threadId} was not written: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

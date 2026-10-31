
import { serverLine } from "./server-lines.ts";

const minutes = (ms: number): string => {
  const value = Math.round(ms / 60_000);
  return `${value} minute${value === 1 ? "" : "s"}`;
};

export interface ComputerHolder {
  name: string;
  task?: string;
}

export function computerWaitDuration(ms: number, language?: string): string {
  if (ms < 1_000) return serverLine(language, "server.computerWait.underSecond");
  const value = ms >= 60_000 ? Math.round(ms / 60_000) : Math.round(ms / 1000);
  return serverLine(language, ms >= 60_000 ? value === 1 ? "server.computerWait.minute" : "server.computerWait.minutes" : value === 1 ? "server.computerWait.second" : "server.computerWait.seconds", { count: value });
}

const holderPhrase = (holder: ComputerHolder, language?: string, still = false): string =>
  serverLine(language, still ? holder.task ? "server.computerWait.holderTaskStill" : "server.computerWait.holderStill"
    : holder.task ? "server.computerWait.holderTask" : "server.computerWait.holder", { name: holder.name, task: holder.task ?? "" });

export interface WaitQueueFact {
  position?: number;
  estimateMs?: number;
}

const ordinal = (position: number): string => {
  const mod100 = position % 100;
  const mod10 = position % 10;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${position}${suffix}`;
};

export function computerWaitingText(holder?: ComputerHolder | null, queue?: WaitQueueFact, language?: string): string {
  const position = queue?.position && queue.position > 0 ? queue.position : undefined;
  const place = position ? serverLine(language, "server.computerWait.position", { position: ordinal(position) }) : "";
  const estimate = queue?.estimateMs !== undefined ? serverLine(language, "server.computerWait.estimate", { duration: computerWaitDuration(queue.estimateMs, language) }) : "";
  // Behind more than the holder: the freed seat goes to the front waiter first.
  const starts = position && position > 1
    ? serverLine(language, "server.computerWait.startsAhead")
    : holder
      ? serverLine(language, "server.computerWait.startsHolder")
      : serverLine(language, "server.computerWait.startsFree");
  return serverLine(language, holder ? "server.computerWait.waitingHolder" : "server.computerWait.waiting", { place, holder: holder ? holderPhrase(holder, language) : "", starts, estimate });
}

export function computerFreeAfterText(holder: ComputerHolder | null | undefined, waitedMs: number, language?: string): string {
  const who = holder ? serverLine(language, "server.computerWait.held", { name: holder.name, task: holder.task ? ` · ${holder.task}` : "" }) : "";
  return serverLine(language, "server.computerWait.free", { duration: computerWaitDuration(waitedMs, language), who });
}

export function computerStoppedWaitingText(holder: ComputerHolder | null | undefined, waitedMs: number, language?: string): string {
  const who = holder ? serverLine(language, "server.computerWait.withHolder", { holder: holderPhrase(holder, language) }) : "";
  return serverLine(language, "server.computerWait.stopped", { duration: computerWaitDuration(waitedMs, language), who });
}

export function computerParkedText(holder: ComputerHolder | null | undefined, ceilingMs: number, language?: string): string {
  const who = holder ? serverLine(language, "server.computerWait.stillWithHolder", { holder: holderPhrase(holder, language, true) }) : "";
  return serverLine(language, "server.computerWait.parked", { duration: computerWaitDuration(ceilingMs, language), who });
}

export function computerPersonAwayText(ceilingMs: number): string {
  return `A person has had control of this computer for over ${minutes(ceilingMs)}, so this call was NOT performed and this turn stops waiting for them. ` +
    "Pause this task: tell the person you are waiting for them to hand control back, and take a fresh screenshot before your next action once they have.";
}

import { describe, expect, it, vi } from "vitest";

import { addServerLinePacks } from "../server-lines.ts";
import { createPersonStop } from "./person-stop.ts";

describe("person stop activity", () => {
  it("writes teammate stop pills in the thread person's language", () => {
    addServerLinePacks({ zh: {
      "server.rooms.teammate": "队友",
      "server.rooms.stoppedHereStillWorking": "已在此停止——{name}仍在工作；打开其会话也可停止",
    } });
    const appendMessage = vi.fn();
    const stop = createPersonStop({
      store: {
        appendMessage,
        bot: () => undefined,
        botByThread: () => ({ id: "owner" }),
        groupByThread: () => undefined,
        taskByThread: () => ({ title: "work" }),
      } as never,
      routines: () => null,
      handoffs: () => ({ stoppedByPerson: vi.fn() }) as never,
      interruptDirectThread: vi.fn(),
      clearUnattended: vi.fn(),
      markStopped: vi.fn(),
      stopGoal: vi.fn(),
      lineLanguage: () => "zh",
    });

    stop.noteTeammatesLeftRunning("thread", [{ botId: "peer", threadId: "peer-thread" }] as never);

    expect(appendMessage).toHaveBeenCalledWith("thread", expect.objectContaining({
      tool: { name: "已在此停止——队友仍在工作；打开其会话也可停止", ok: true },
      threadRef: { botId: "peer", threadId: "peer-thread", title: "work" },
    }));
  });
});

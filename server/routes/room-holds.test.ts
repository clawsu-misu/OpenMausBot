import { describe, expect, it } from "vitest";

import type { RequestAuth } from "../request-auth.ts";
import type { WireGroup } from "../../shared/wire.ts";
import { createRoomHoldRoutes } from "./room-holds.ts";

const auth = { kind: "session", scopes: ["client"], via: "bearer", session: { id: "person-1" } } as unknown as RequestAuth;

function routeFor(options: { dm?: boolean; memberIds?: string[]; updated?: boolean; line?: (auth: RequestAuth, key: string) => string } = {}) {
  let current: { dm?: unknown; memberIds: readonly string[] } | undefined = options.dm === undefined && options.memberIds === undefined ? { memberIds: ["member-1"] } : { dm: options.dm, memberIds: options.memberIds ?? ["member-1"] };
  const route = createRoomHoldRoutes({
    group: () => current,
    setHold: () => options.updated === false ? null : ({} as WireGroup),
    line: options.line,
  });
  const call = async (body: unknown, groupPath = "room-1") => {
    let result: { status: number; body: unknown } | undefined;
    const path = `/api/groups/${groupPath}/holds`;
    await route({ req: {} as never, res: {} as never, url: new URL(`http://x${path}`), path, method: "POST", auth,
      json: (_res: unknown, status: number, value: unknown) => { result = { status, body: value }; }, readBody: async () => body } as never);
    return result;
  };
  return { call, setGroup: (group: typeof current) => { current = group; } };
}

describe("room hold route errors", () => {
  it("keeps its exact English defaults and HTTP statuses", async () => {
    const route = routeFor();
    expect(await route.call({})).toEqual({ status: 400, body: { error: 'body must be {"botId": "<room member id>", "held": true}' } });
    route.setGroup(undefined);
    expect(await route.call({ botId: "member-1", held: true })).toEqual({ status: 404, body: { error: "no such room" } });
    route.setGroup({ memberIds: ["member-1"] });
    expect(await route.call({ botId: "member-1", held: true })).toEqual({ status: 200, body: { ok: true, group: {} } });
    route.setGroup({ dm: true, memberIds: ["member-1"] });
    expect(await route.call({ botId: "member-1", held: true })).toEqual({ status: 400, body: { error: "members of a bot-to-bot channel cannot be held" } });
    route.setGroup({ memberIds: [] });
    expect(await route.call({ botId: "member-1", held: true })).toEqual({ status: 404, body: { error: "that bot is not a member of this room" } });
    const lost = routeFor({ updated: false });
    expect(await lost.call({ botId: "member-1", held: true })).toEqual({ status: 404, body: { error: "no such room" } });
  });

  it("uses the authenticated person's language for validation and room errors", async () => {
    const labels: Record<string, string> = {
      "server.rooms.holds.invalidBody": "请求内容无效",
      "server.rooms.holds.notFound": "找不到该房间",
      "server.rooms.holds.botToBot": "机器人之间的频道无法暂停成员",
      "server.rooms.holds.notMember": "该机器人不是此房间的成员",
    };
    const seen: RequestAuth[] = [];
    const line = routeFor({ dm: true, line: (caller, key) => { seen.push(caller); return labels[key]!; } });
    expect(await line.call({})).toEqual({ status: 400, body: { error: "请求内容无效" } });
    expect(await line.call({ botId: "member-1", held: true })).toEqual({ status: 400, body: { error: "机器人之间的频道无法暂停成员" } });
    line.setGroup({ memberIds: [] });
    expect(await line.call({ botId: "member-1", held: true })).toEqual({ status: 404, body: { error: "该机器人不是此房间的成员" } });
    expect(seen).toEqual([auth, auth, auth]);
  });
});

// For clients that don't know `kind: "connector"` yet (older phones draw `text`), exports and backups. It never carries a
// link: the authorization URL is only ever handed to the person's own client.

import { serverLine } from "./server-lines.ts";

/** "Connect GitHub to continue." — or, for a second account, the alias too. */
export function connectorCardText(label: string, alias?: string, language?: string): string {
  const app = label.replace(/\s+/g, " ").trim() || serverLine(language, "server.routines.connector.defaultApp");
  const account = alias?.replace(/\s+/g, " ").trim();
  return serverLine(language, account ? "server.routines.connector.alias" : "server.routines.connector.app", { app, alias: account ?? "" });
}

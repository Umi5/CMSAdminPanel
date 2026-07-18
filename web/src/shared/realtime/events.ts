import type { ServerEvent } from "@cms/shared";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

/** Which schema an event concerns, so subscribers can filter to their own. */
export function eventSchemaId(event: ServerEvent): string {
  switch (event.type) {
    case "entry.created":
    case "entry.updated":
      return event.entry.schemaId;
    case "entry.deleted":
      return event.schemaId;
    case "schema.created":
    case "schema.updated":
      return event.schema.id;
    case "schema.deleted":
      return event.schemaId;
  }
}

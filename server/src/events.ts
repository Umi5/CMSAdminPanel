import { EventEmitter } from "node:events";
import type { ServerEvent } from "@cms/shared";

/**
 * A single in-process pub/sub hub. Controllers call `broadcast()` after a
 * successful mutation; the SSE endpoint subscribes each connected client.
 */
class EventBus extends EventEmitter {
  broadcast(event: ServerEvent): void {
    this.emit("event", event);
  }
}

export const eventBus = new EventBus();

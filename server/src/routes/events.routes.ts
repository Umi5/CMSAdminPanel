import { Router } from "express";
import type { ServerEvent } from "@cms/shared";
import { eventBus } from "../events";

export const eventsRouter = Router();

/**
 * SSE stream. One long-lived connection per client; every mutation elsewhere
 * broadcasts a `ServerEvent` that is written here.
 */
eventsRouter.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("event: ready\ndata: {}\n\n");

  const onEvent = (event: ServerEvent): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  eventBus.on("event", onEvent);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.off("event", onEvent);
  });
});

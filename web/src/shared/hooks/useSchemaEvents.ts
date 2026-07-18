import { useEffect, useRef } from 'react';
import type { ServerEvent } from '@cms/shared';
import { useEvents } from '@/shared/realtime/EventsProvider';
import { eventSchemaId } from '@/shared/realtime/events';

/**
 * Run `handler` whenever a server event concerns `schemaId`. The single seam that
 * keeps entry lists/editors reconciled with real-time changes without a
 * data-fetching library. Pass `null` to disable.
 */
export function useSchemaEvents(schemaId: string | null, handler: (event: ServerEvent) => void): void {
  const { subscribe } = useEvents();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (schemaId === null) return;
    return subscribe((event) => {
      if (eventSchemaId(event) === schemaId) handlerRef.current(event);
    });
  }, [subscribe, schemaId]);
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ServerEvent } from '@cms/shared';
import type { ConnectionStatus } from './events';

type Listener = (event: ServerEvent) => void;

interface EventsContextValue {
  status: ConnectionStatus;
  /** Subscribe to every server event; returns an unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

/**
 * Owns the single SSE connection and fans events out to subscribers. One stream
 * for the whole app; features subscribe and filter to what they care about.
 */
export function EventsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const listeners = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.addEventListener('ready', () => setStatus('connected'));
    source.onopen = () => setStatus('connected');
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as ServerEvent;
        listeners.current.forEach((listener) => listener(event));
      } catch {
        // Ignore keep-alive comments and malformed frames.
      }
    };
    source.onerror = () => setStatus('reconnecting'); // EventSource retries on its own
    return () => source.close();
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return <EventsContext.Provider value={{ status, subscribe }}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within an EventsProvider');
  return ctx;
}

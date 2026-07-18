import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Schema } from "@cms/shared";
import { api, ApiError } from "@/shared/api/client";
import { useEvents } from "@/shared/realtime/EventsProvider";

interface SchemaContextValue {
  schemas: Schema[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getSchema: (id: string) => Schema | undefined;
}

const SchemaContext = createContext<SchemaContextValue | null>(null);

function upsert(list: Schema[], schema: Schema): Schema[] {
  const index = list.findIndex((s) => s.id === schema.id);
  if (index === -1) return [...list, schema];
  const next = list.slice();
  next[index] = schema;
  return next;
}

/**
 * The one genuinely-global piece of state: the list of content types. Loaded
 * once, then kept live by SSE so every screen (sidebar, pickers, editors) sees
 * schema changes without a refetch.
 */
export function SchemaProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useEvents();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSchemas(await api.get<Schema[]>("/schemas"));
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load content types",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () =>
      subscribe((event) => {
        if (
          event.type === "schema.created" ||
          event.type === "schema.updated"
        ) {
          setSchemas((prev) => upsert(prev, event.schema));
        } else if (event.type === "schema.deleted") {
          setSchemas((prev) => prev.filter((s) => s.id !== event.schemaId));
        }
      }),
    [subscribe],
  );

  const getSchema = useCallback(
    (id: string) => schemas.find((s) => s.id === id),
    [schemas],
  );

  return (
    <SchemaContext.Provider
      value={{ schemas, loading, error, reload, getSchema }}
    >
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchemas(): SchemaContextValue {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error("useSchemas must be used within a SchemaProvider");
  return ctx;
}

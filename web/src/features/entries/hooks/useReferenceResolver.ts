import { useCallback, useEffect, useMemo, useState } from "react";
import type { Schema, EntryPage } from "@cms/shared";
import { api } from "@/shared/api/client";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useEvents } from "@/shared/realtime/EventsProvider";
import { eventSchemaId } from "@/shared/realtime/events";
import { getEntryLabel } from "@/shared/util/entryLabel";

/**
 * Resolves reference values (entry ids) to human labels for the entries table.
 * Fetches each referenced target's entries once and keeps them live: if an entry
 * in a target schema changes, its label refreshes here too.
 */
export function useReferenceResolver(schema: Schema | undefined) {
  const { getSchema } = useSchemas();
  const { subscribe } = useEvents();

  const targetIds = useMemo(
    () => [
      ...new Set(
        (schema?.fields ?? [])
          .filter((f) => f.type === "reference" && f.referenceSchemaId)
          .map((f) => f.referenceSchemaId as string),
      ),
    ],
    [schema],
  );

  const [labels, setLabels] = useState<Record<string, Record<string, string>>>(
    {},
  );

  const load = useCallback(async () => {
    const result: Record<string, Record<string, string>> = {};
    for (const targetId of targetIds) {
      const { items } = await api.get<EntryPage>(
        `/schemas/${targetId}/entries`,
      );
      const target = getSchema(targetId);
      result[targetId] = Object.fromEntries(
        items.map((e) => [e.id, getEntryLabel(target, e)]),
      );
    }
    setLabels(result);
  }, [targetIds, getSchema]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      subscribe((event) => {
        if (targetIds.includes(eventSchemaId(event))) void load();
      }),
    [subscribe, targetIds, load],
  );

  const resolve = useCallback(
    (schemaId: string, entryId: string) =>
      labels[schemaId]?.[entryId] ?? `#${entryId.slice(0, 6)}`,
    [labels],
  );

  // All entries of a target, for the reference filter dropdown (every available
  // option, independent of what's on the current page).
  const optionsFor = useCallback(
    (schemaId: string) =>
      Object.entries(labels[schemaId] ?? {})
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [labels],
  );

  return { resolve, optionsFor };
}

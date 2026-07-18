import type { Entry } from '@cms/shared';
import { api } from '@/shared/api/client';

export const entriesApi = {
  list: (schemaId: string) => api.get<Entry[]>(`/schemas/${schemaId}/entries`),
  get: (schemaId: string, entryId: string) => api.get<Entry>(`/schemas/${schemaId}/entries/${entryId}`),
  create: (schemaId: string, values: Record<string, unknown>) =>
    api.post<Entry>(`/schemas/${schemaId}/entries`, { values }),
  update: (schemaId: string, entryId: string, values: Record<string, unknown>) =>
    api.put<Entry>(`/schemas/${schemaId}/entries/${entryId}`, { values }),
  remove: (schemaId: string, entryId: string) => api.delete<void>(`/schemas/${schemaId}/entries/${entryId}`),
};

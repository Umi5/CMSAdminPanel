import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/shared/api/client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (updater: (prev: T | null) => T | null) => void;
}

/**
 * Tiny GET hook for per-feature data (entries, plans). Pass `null` to skip the
 * request. Real-time invalidation is layered on top via `useSchemaEvents`.
 */
export function useFetch<T>(path: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (path === null) return;
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (path === null) {
      setData(null);
      setLoading(false);
      return;
    }
    void refetch();
  }, [path, refetch]);

  const patch = useCallback((updater: (prev: T | null) => T | null) => {
    setData((prev) => updater(prev));
  }, []);

  return { data, loading, error, refetch, setData: patch };
}

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';

interface UseApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a resource from the backend on mount and exposes a refetch()
 * for use after create/update/delete actions. Callers decide what an
 * "empty" result looks like (e.g. an empty array) — this hook only
 * tracks loading/error state so pages can render proper empty states
 * instead of placeholder data.
 */
export function useApiResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<UseApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Check your connection and try again.';
        setState({ data: null, loading: false, error: message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

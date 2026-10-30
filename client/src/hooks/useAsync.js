import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader on mount (and when deps change); exposes reload for after mutations.
// Only the latest call may set state, so a slow earlier response can't overwrite a newer one
// (e.g. clicking quickly through days on the slot picker).
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (requestId === latestRequest.current) setData(result);
    } catch (err) {
      if (requestId === latestRequest.current) setError(err);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    reload();
    // Unmount or deps change: drop whatever is still in flight
    return () => {
      latestRequest.current += 1;
    };
  }, [reload]);

  return { data, loading, error, reload };
}

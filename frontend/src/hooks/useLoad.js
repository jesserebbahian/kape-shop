import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const active = useRef(null);
  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState((previous) => ({ ...previous, error: null, loading: true }));
    try {
      const data = await loader(controller.signal);
      if (!controller.signal.aborted) setState({ data, error: null, loading: false });
    } catch (error) {
      if (!controller.signal.aborted) setState({ data: null, error, loading: false });
    }
  }, deps);
  useEffect(() => {
    reload();
    return () => active.current?.abort();
  }, [reload]);
  return { ...state, reload };
}

import { useCallback, useEffect, useState } from "react";

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
}

/** useState persisted to localStorage. Reloads when the key changes. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState(() => ({ key, value: read(key, initial) }));
  // Re-read during render when the key changes (e.g. switching PvP/PvE).
  const current = state.key === key ? state : { key, value: read(key, initial) };
  if (current !== state) setState(current);

  useEffect(() => {
    try {
      localStorage.setItem(current.key, JSON.stringify(current.value));
    } catch {
      // Storage can be unavailable (private mode); the app still works.
    }
  }, [current]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) =>
      setState((prev) => ({
        key: prev.key,
        value: typeof next === "function" ? (next as (p: T) => T)(prev.value) : next,
      })),
    [],
  );

  return [current.value, setValue] as const;
}

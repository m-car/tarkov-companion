import { useEffect, useState } from "react";

export type Loaded<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: T };

/** Runs an async loader whenever its key changes; bump `retry` to try again. */
export function useLoader<T>(load: () => Promise<T>, key: string, retry = 0): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    load()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
    // `load` is expected to change only alongside `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retry]);

  return state;
}

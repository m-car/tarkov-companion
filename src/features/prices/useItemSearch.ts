import { useEffect, useState } from "react";
import type { GameMode } from "../../api/client";
import { searchItems, type Item } from "../../api/items";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; items: Item[] };

export function useItemSearch(query: string, gameMode: GameMode): State {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    searchItems(q, gameMode, controller.signal)
      .then((items) => setState({ status: "done", items }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, [query, gameMode]);

  return state;
}

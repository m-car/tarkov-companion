import { useEffect, useMemo, useState } from "react";
import type { GameMode } from "../../api/client";
import { loadItems, searchItems, type Item } from "../../api/items";

type Db =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; items: Item[] };

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; items: Item[] };

export function useItemSearch(query: string, gameMode: GameMode, retryKey = 0): SearchState {
  const [db, setDb] = useState<Db>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setDb({ status: "loading" });
    loadItems(gameMode)
      .then((items) => !cancelled && setDb({ status: "ready", items }))
      .catch((err: unknown) => {
        if (cancelled) return;
        setDb({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [gameMode, retryKey]);

  return useMemo((): SearchState => {
    if (db.status === "error") return db;
    const q = query.trim();
    if (q.length < 2) return { status: "idle" };
    if (db.status === "loading") return { status: "loading" };
    return { status: "done", items: searchItems(db.items, q) };
  }, [db, query]);
}

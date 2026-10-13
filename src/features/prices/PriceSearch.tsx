import { useMemo, useState } from "react";
import type { GameMode } from "../../api/client";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { sortItems, type SortKey } from "../../lib/prices";
import { ItemCard } from "./ItemCard";
import { useItemSearch } from "./useItemSearch";

export function PriceSearch({ gameMode }: { gameMode: GameMode }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useLocalStorage<SortKey>("tc.sort", "perSlot");
  const debounced = useDebouncedValue(query, 350);
  const result = useItemSearch(debounced, gameMode);

  const items = useMemo(
    () => (result.status === "done" ? sortItems(result.items, sort) : []),
    [result, sort],
  );

  return (
    <section className="panel">
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search items, e.g. LEDX, Salewa, GPU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <label className="sort">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="perSlot">Value per slot</option>
            <option value="value">Total value</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {result.status === "idle" && (
        <p className="hint">Type at least 2 characters to search.</p>
      )}
      {result.status === "loading" && <p className="hint">Searching…</p>}
      {result.status === "error" && (
        <p className="error">Couldn't load prices: {result.error}</p>
      )}
      {result.status === "done" && items.length === 0 && (
        <p className="hint">No items match "{debounced}".</p>
      )}

      <div className="item-list">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

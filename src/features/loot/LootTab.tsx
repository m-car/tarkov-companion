import { useMemo, useState } from "react";
import { searchItems, type Item } from "../../api/items";
import { LoadState } from "../../components/LoadState";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { sortItems, type SortKey } from "../../lib/prices";
import { itemVerdict } from "../../lib/verdict";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { ItemCard } from "./ItemCard";

export function LootTab() {
  const { items, itemsById, retry } = useGameData();
  const { verdictContext, needsReady } = useNeeds();
  const { starred, toggleStar } = useAppState();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useLocalStorage<SortKey>("tc.sort", "perSlot");
  const debounced = useDebouncedValue(query, 120).trim();

  const searching = debounced.length >= 2;
  const results = useMemo((): Item[] => {
    if (items.status !== "ready") return [];
    if (searching) return sortItems(searchItems(items.data, debounced), sort);
    // With no search, show the watchlist so you can check it without typing.
    return sortItems(
      [...starred].map((id) => itemsById.get(id)).filter((i): i is Item => Boolean(i)),
      sort,
    );
  }, [items, itemsById, searching, debounced, sort, starred]);

  return (
    <section className="panel">
      <div className="toolbar">
        <input
          type="search"
          className="search"
          data-search
          placeholder="Search loot… (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
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

      <LoadState states={[items]} what="item prices" onRetry={retry} />

      {items.status === "ready" && (
        <>
          {!needsReady && (
            <p className="hint small">Loading quest and hideout data for the keep/sell call…</p>
          )}
          {!searching && (
            <h2 className="section-title">
              Watchlist {starred.size > 0 && <span className="muted">({starred.size})</span>}
            </h2>
          )}
          {!searching && results.length === 0 && (
            <p className="hint">
              Search for an item, then tap ☆ to pin it here for quick checks during a raid.
            </p>
          )}
          {searching && results.length === 0 && (
            <p className="hint">No items match "{debounced}".</p>
          )}
          <div className="item-list">
            {results.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                verdict={itemVerdict(item, verdictContext)}
                starred={starred.has(item.id)}
                onToggleStar={() => toggleStar(item.id)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

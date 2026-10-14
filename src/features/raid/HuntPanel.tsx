import { useMemo, useState } from "react";
import { searchItems, type Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import { ItemIcon } from "../../components/ItemIcon";
import type { AllKeysResult, ContainerLoot, HuntKey, HuntResult } from "../../lib/hunt";
import { toggleHuntAllKeys } from "../../lib/raidSession";
import { formatPrice } from "../../lib/prices";
import { useAppState } from "../../state/AppState";
import { useNeeds } from "../../state/useGameData";
import { OwnKeyButton } from "./MapSections";

const pct = (chance: number) =>
  chance >= 0.01 ? `${(chance * 100).toFixed(1)}%` : `${(chance * 100).toFixed(2)}%`;

/** Edit the hunt list: search to add, suggestions from quest/hideout needs and your watchlist. */
export function HuntEditor({
  map,
  items,
  itemsById,
}: {
  map: GameMap;
  items: Item[];
  itemsById: Map<string, Item>;
}) {
  const { raid, updateRaid, starred, toggleStar } = useAppState();
  const { verdictContext } = useNeeds();
  const [query, setQuery] = useState("");
  const hunting = new Set(raid.huntItems);

  const add = (id: string) => {
    updateRaid((s) => (s.huntItems.includes(id) ? s : { ...s, huntItems: [...s.huntItems, id] }));
    // Hunting an item also puts it on your watchlist.
    if (!starred.has(id)) toggleStar(id);
  };
  const remove = (id: string) =>
    updateRaid((s) => ({ ...s, huntItems: s.huntItems.filter((i) => i !== id) }));

  const results = query.trim().length >= 2 ? searchItems(items, query.trim(), 6) : [];

  // Needed items and watchlist items that spawn loose on this map.
  const suggestions = useMemo(() => {
    const loose = new Set(map.lootLoose.flatMap((l) => l.items));
    const needed = new Set([
      ...verdictContext.questNeeds.keys(),
      ...verdictContext.hideoutNeeds.keys(),
      ...starred,
    ]);
    return [...needed]
      .filter((id) => loose.has(id) && !hunting.has(id) && itemsById.has(id))
      .slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, verdictContext, starred, raid.huntItems, itemsById]);

  return (
    <div className="hunt-editor">
      <ul className="hunt-chips">
        {raid.huntItems.map((id) => {
          const item = itemsById.get(id);
          return (
            <li key={id}>
              <ItemIcon item={item} size={24} />
              {item?.shortName ?? id}
              <button onClick={() => remove(id)} aria-label={`Stop hunting ${item?.name ?? id}`}>
                ×
              </button>
            </li>
          );
        })}
        {raid.huntItems.length === 0 && !raid.huntAllKeys && (
          <li className="muted">Nothing on your hunt list yet.</li>
        )}
      </ul>
      <button
        className={`all-keys-toggle ${raid.huntAllKeys ? "on" : ""}`}
        onClick={() => updateRaid(toggleHuntAllKeys)}
        aria-pressed={Boolean(raid.huntAllKeys)}
      >
        ⚿ All keys {raid.huntAllKeys ? "· on" : ""}
        <span className="muted small"> show every key spawn on {map.name}</span>
      </button>
      <div className="hunt-search">
        <input
          type="search"
          className="search small"
          placeholder="Add an item to hunt…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
        />
        {results.length > 0 && (
          <ul className="search-results">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    add(item.id);
                    setQuery("");
                  }}
                  disabled={hunting.has(item.id)}
                >
                  <ItemIcon item={item} size={28} />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="suggestions">
          <span className="muted small">Needed or watched, and spawns on {map.name}:</span>
          <ul className="hunt-chips">
            {suggestions.map((id) => {
              const item = itemsById.get(id);
              return (
                <li key={id} className="suggestion">
                  <button onClick={() => add(id)} aria-label={`Hunt ${item?.name}`}>
                    <ItemIcon item={item} size={24} />+ {item?.shortName}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function needText(itemId: string, ctx: ReturnType<typeof useNeeds>["verdictContext"]) {
  const q = ctx.questNeeds.get(itemId);
  const h = ctx.hideoutNeeds.get(itemId);
  const parts = [];
  if (q) parts.push(`${q.count}× quests${q.foundInRaid ? " (FIR)" : ""}`);
  if (h) parts.push(`${h.count}× hideout`);
  return parts.join(" · ");
}

/** Where each hunt item can be found on the map, plus keys for the rooms they're likely in. */
function AllKeysCard({
  keySpawns,
  itemsById,
  compact,
}: {
  keySpawns: AllKeysResult;
  itemsById: Map<string, Item>;
  compact: boolean;
}) {
  const { ownedKeys } = useAppState();
  const price = (id: string) => itemsById.get(id)?.avg24hPrice ?? itemsById.get(id)?.lastLowPrice ?? 0;
  const byValue = (a: string, b: string) => price(b) - price(a);
  const distinct = new Set(keySpawns.spots.flatMap((s) => s.keyIds));

  return (
    <article className="hunt-card keys-card">
      <header>
        <span className="keys-icon">⚿</span>
        <div>
          <h3>All keys</h3>
          <span className="muted">
            {keySpawns.spots.length} loose key spot{keySpawns.spots.length === 1 ? "" : "s"} ·{" "}
            {distinct.size} different keys
          </span>
        </div>
      </header>
      {keySpawns.spots.length === 0 && (
        <p className="hint small">No known loose key spawns on this map.</p>
      )}
      <ul className="spot-groups">
        {keySpawns.groups.slice(0, compact ? 6 : 20).map((g) => {
          const keys = [...g.keyIds].sort(byValue);
          const behind = g.lock ? itemsById.get(g.lock.keyId) : undefined;
          return (
            <li key={`${g.area}|${g.floor}|${g.lock?.id}`}>
              <span className="spot-count">{g.spots.length}×</span>
              <span>
                <strong>{g.area}</strong>
                {g.floor && ` · ${g.floor}`}
                {g.lock && (
                  <span className={`likely-room ${ownedKeys.has(g.lock.keyId) ? "owned" : ""}`}>
                    {" "}
                    · behind {behind?.shortName ?? "a locked door"}
                  </span>
                )}
                <span className="muted small block">
                  {keys
                    .slice(0, 4)
                    .map((id) => {
                      const p = price(id);
                      return `${itemsById.get(id)?.shortName ?? id}${p ? ` (${Math.round(p / 1000)}k)` : ""}`;
                    })
                    .join(", ")}
                  {keys.length > 4 && ` +${keys.length - 4} more`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {keySpawns.containers.length > 0 && (
        <details className="containers" open={!compact}>
          <summary>
            Containers likeliest to hold a key <span className="muted">(SPT odds, may be outdated)</span>
          </summary>
          <ul>
            {keySpawns.containers.slice(0, 6).map((c) => (
              <li key={c.typeId}>
                <span className="chance">{pct(c.chance)}</span>
                <span>
                  {c.typeName} <span className="muted">× {c.positions.length} on map</span>
                  <span className="muted small block">
                    {c.areas
                      .slice(0, 4)
                      .map((a) => `${a.area} ${a.count}`)
                      .join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export function HuntResults({
  results,
  keys,
  keySpawns,
  loot,
  itemsById,
  compact = false,
}: {
  results: HuntResult[];
  keys: HuntKey[];
  keySpawns?: AllKeysResult | null;
  loot: ContainerLoot | null;
  itemsById: Map<string, Item>;
  compact?: boolean;
}) {
  const { ownedKeys } = useAppState();
  const { verdictContext } = useNeeds();
  if (results.length === 0 && !keySpawns) return null;

  return (
    <div className="hunt-results">
      {keySpawns && <AllKeysCard keySpawns={keySpawns} itemsById={itemsById} compact={compact} />}
      {results.map((r) => {
        const item = itemsById.get(r.itemId);
        const need = needText(r.itemId, verdictContext);
        const nothing = r.loose.length === 0 && r.containers.length === 0;
        return (
          <article key={r.itemId} className="hunt-card">
            <header>
              <ItemIcon item={item} size={40} />
              <div>
                <h3>{item?.name ?? r.itemId}</h3>
                <span className="muted">
                  {need && `${need} · `}
                  {r.loose.length} loose spot{r.loose.length === 1 ? "" : "s"}
                </span>
              </div>
              {item?.wikiLink && (
                <a className="wiki" href={item.wikiLink} target="_blank" rel="noreferrer" title="Wiki">
                  Wiki ↗
                </a>
              )}
            </header>
            {nothing && <p className="hint small">No known spawns for this item on this map.</p>}
            {r.looseGroups.length > 0 && (
              <ul className="spot-groups">
                {r.looseGroups.slice(0, compact ? 4 : 12).map((g) => {
                  const keyItem = g.lock ? itemsById.get(g.lock.keyId) : undefined;
                  const owned = g.lock ? ownedKeys.has(g.lock.keyId) : false;
                  return (
                    <li key={`${g.area}|${g.floor}|${g.lock?.id}`}>
                      <span className="spot-count">{g.spots.length}×</span>
                      <span>
                        <strong>{g.area}</strong>
                        {g.floor && ` · ${g.floor}`}
                        {g.lock && (
                          <span className={`likely-room ${owned ? "owned" : ""}`}>
                            {" "}
                            · likely behind {keyItem?.name ?? "a locked door"}
                            {owned && " ✓"}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {r.containers.length > 0 && (
              <details className="containers" open={!compact && r.loose.length === 0}>
                <summary>
                  Containers <span className="muted">(SPT odds, may be outdated)</span>
                </summary>
                <ul>
                  {r.containers.slice(0, 6).map((c) => (
                    <li key={c.typeId}>
                      <span className="chance">{pct(c.chance)}</span>
                      <span>
                        {c.typeName} <span className="muted">× {c.positions.length} on map</span>
                        <span className="muted small block">
                          {c.areas
                            .slice(0, 4)
                            .map((a) => `${a.area} ${a.count}`)
                            .join(" · ")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        );
      })}

      {keys.length > 0 && (
        <div className="hunt-keys">
          <h3 className="section-title">Keys for likely rooms</h3>
          <ul className="key-list">
            {keys.map((k) => {
              const keyItem = itemsById.get(k.keyId);
              const price = keyItem?.avg24hPrice ?? keyItem?.lastLowPrice;
              return (
                <li key={k.keyId} className={ownedKeys.has(k.keyId) ? "owned" : ""}>
                  <OwnKeyButton keyId={k.keyId} name={keyItem?.name} />
                  <ItemIcon item={keyItem} size={32} />
                  <span className="key-name">
                    {keyItem?.name ?? k.keyId}
                    <span className="muted">
                      {" "}
                      {k.spots} spot{k.spots === 1 ? "" : "s"}:{" "}
                      {k.itemIds.map((id) => itemsById.get(id)?.shortName ?? id).join(", ")}
                    </span>
                  </span>
                  <span className="key-price">{price ? formatPrice(price) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="hint small source-note">
        Loose spawns and locks from tarkov.dev. Rooms are inferred from the nearest locked door, so
        treat them as likely, not certain.
        {loot && ` Container odds from SPT game data (${loot.fetchedAt}); they can lag live patches.`}
      </p>
    </div>
  );
}

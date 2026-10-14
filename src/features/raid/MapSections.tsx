import type { Item } from "../../api/items";
import type { Extract, GameMap } from "../../api/maps";
import type { Task } from "../../api/tasks";
import { ItemIcon } from "../../components/ItemIcon";
import { Segmented } from "../../components/Segmented";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { CURRENCY_CODES } from "../../lib/hideout";
import { formatPrice } from "../../lib/prices";
import { extractsFor, keysForMap, questKeysOnMap, type BringItem, type Side } from "../../lib/raid";
import { useAppState } from "../../state/AppState";

export function useSide() {
  return useLocalStorage<Side>("tc.side", "pmc");
}

export function BringList({ bring, itemsById }: { bring: BringItem[]; itemsById: Map<string, Item> }) {
  if (bring.length === 0) return null;
  const label = { key: "Key", plant: "Plant", marker: "Marker" };
  return (
    <ul className="bring-list">
      {bring.map((b) => {
        const item = itemsById.get(b.itemId);
        return (
          <li key={`${b.kind}:${b.itemId}`} title={b.quests.join(", ")}>
            <ItemIcon item={item} size={28} />
            <span>
              {b.count > 1 && `${b.count}× `}
              {item?.shortName ?? b.itemId}
            </span>
            <span className={`badge bring-${b.kind}`}>{label[b.kind]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function extractRequirement(e: Extract, itemsById: Map<string, Item>): string {
  const parts: string[] = [];
  if (e.transferItem) {
    const code = CURRENCY_CODES[e.transferItem.itemId];
    const item = itemsById.get(e.transferItem.itemId);
    parts.push(
      code
        ? `Pay ${formatPrice(e.transferItem.count, code)}`
        : `Hand over ${e.transferItem.count > 1 ? `${e.transferItem.count}× ` : ""}${item?.name ?? "item"}`,
    );
  }
  if (e.needsSwitch) parts.push("Needs a switch or power");
  return parts.join(" · ");
}

export function ExtractsSection({
  map,
  itemsById,
  mapList,
}: {
  map: GameMap;
  itemsById: Map<string, Item>;
  mapList: GameMap[];
}) {
  const [side, setSide] = useSide();
  const extracts = extractsFor(map, side);
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Extracts</h2>
        <Segmented<Side>
          label="Side"
          value={side}
          onChange={setSide}
          options={[
            { value: "pmc", label: "PMC" },
            { value: "scav", label: "Scav" },
          ]}
        />
      </div>
      {extracts.open.length + extracts.conditional.length === 0 ? (
        <p className="hint">No extract data for this map.</p>
      ) : (
        <ul className="extract-list">
          {extracts.open.map((e) => (
            <li key={e.id} className="extract">
              <span className="extract-name">{e.name}</span>
              {e.faction === "shared" && <span className="badge">Shared</span>}
            </li>
          ))}
          {extracts.conditional.map((e) => (
            <li key={e.id} className="extract conditional">
              <span className="extract-name">{e.name}</span>
              {e.faction === "shared" && <span className="badge">Shared</span>}
              <span className="extract-req">{extractRequirement(e, itemsById)}</span>
            </li>
          ))}
        </ul>
      )}
      {map.transits.length > 0 && (
        <details className="needs">
          <summary>
            Transits <span className="muted">({map.transits.length})</span>
          </summary>
          <ul className="extract-list">
            {map.transits.map((tr) => (
              <li key={tr.id} className="extract">
                <span className="extract-name">
                  → {mapList.find((m) => m.id === tr.toMapId)?.name ?? tr.toMapId}
                </span>
                <span className="extract-req">{tr.description}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export function BossesSection({ map }: { map: GameMap }) {
  if (map.bosses.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Bosses</h2>
      <ul className="boss-list">
        {map.bosses.map((b) => (
          <li key={b.name}>
            <span className="boss-chance">{Math.round(b.chance * 100)}%</span>
            <span>
              {b.name}
              {b.locations.length > 0 && <span className="muted"> {b.locations.join(", ")}</span>}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function OwnKeyButton({ keyId, name }: { keyId: string; name?: string }) {
  const { ownedKeys, toggleOwnedKey } = useAppState();
  const owned = ownedKeys.has(keyId);
  return (
    <button
      className={`own ${owned ? "on" : ""}`}
      onClick={() => toggleOwnedKey(keyId)}
      aria-pressed={owned}
      aria-label={owned ? `I don't have ${name ?? "this key"}` : `I have ${name ?? "this key"}`}
      title={owned ? "You have this key" : "Mark as owned"}
    >
      ⚿
    </button>
  );
}

export function KeysSection({
  map,
  available,
  itemsById,
}: {
  map: GameMap;
  available: Task[];
  itemsById: Map<string, Item>;
}) {
  const { ownedKeys } = useAppState();
  const keys = keysForMap(map, itemsById, ownedKeys, questKeysOnMap(map.id, available));
  if (keys.length === 0) return null;
  return (
    <details className="needs" open={keys.some((k) => k.owned || k.quests.length > 0)}>
      <summary>
        All keys on this map <span className="muted">({keys.length}) · tap ⚿ to mark keys you own</span>
      </summary>
      <ul className="key-list">
        {keys.map((k) => {
          const price = k.item?.avg24hPrice ?? k.item?.lastLowPrice;
          const types = [...new Set(k.locks.map((l) => l.lockType))].join(", ");
          return (
            <li key={k.keyId} className={k.owned ? "owned" : ""}>
              <OwnKeyButton keyId={k.keyId} name={k.item?.name} />
              <ItemIcon item={k.item} size={32} />
              <span className="key-name">
                {k.item?.name ?? k.keyId}
                {k.quests.length > 0 && <span className="badge fir">Quest</span>}
                {k.locks.some((l) => l.needsPower) && <span className="badge">Power</span>}
                <span className="muted"> {k.quests.length > 0 ? k.quests.join(", ") : types}</span>
              </span>
              <span className="key-price">{price ? formatPrice(price) : "—"}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

import type { Station } from "../../api/hideout";
import { ItemIcon } from "../../components/ItemIcon";
import { LoadState } from "../../components/LoadState";
import { CURRENCY_CODES, maxLevel, missingStationRequirements } from "../../lib/hideout";
import { formatPrice } from "../../lib/prices";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { NeededItems } from "../quests/NeededItems";

export function HideoutTab() {
  const { stations, itemsById, items, retry } = useGameData();
  const { verdictContext } = useNeeds();
  const { hideoutLevels, setHideoutLevel } = useAppState();

  const stationList = stations.status === "ready" ? stations.data : [];
  const levelOf = (s: Station) => hideoutLevels[s.id] ?? 0;

  // Reuse the quest needs list layout for the hideout shopping list.
  const shoppingList = new Map(
    [...verdictContext.hideoutNeeds].map(([id, n]) => [
      id,
      { count: n.count, foundInRaid: false, quests: n.upgrades },
    ]),
  );

  return (
    <section className="panel">
      <LoadState states={[stations, items]} what="hideout" onRetry={retry} />
      {stations.status === "ready" && (
        <>
          <details className="needs">
            <summary>
              Items still needed for all upgrades{" "}
              <span className="muted">({shoppingList.size})</span>
            </summary>
            <NeededItems needs={shoppingList} itemsById={itemsById} />
          </details>

          <ul className="station-list">
            {stationList.map((s) => {
              const level = levelOf(s);
              const max = maxLevel(s);
              const next = s.levels.find((l) => l.level === level + 1);
              const blockers = next
                ? missingStationRequirements(s, next.level, stationList, hideoutLevels)
                : [];
              return (
                <li key={s.id} className="station">
                  <div className="station-head">
                    <span className="station-name">{s.name}</span>
                    <div className="stepper">
                      <button
                        onClick={() => setHideoutLevel(s.id, Math.max(0, level - 1))}
                        disabled={level === 0}
                        aria-label={`Lower ${s.name} level`}
                      >
                        −
                      </button>
                      <span className="stepper-value">
                        {level}/{max}
                      </span>
                      <button
                        onClick={() => setHideoutLevel(s.id, Math.min(max, level + 1))}
                        disabled={level >= max}
                        aria-label={`Raise ${s.name} level`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {next ? (
                    <div className="station-next">
                      <span className="muted">Level {next.level} needs:</span>
                      {blockers.length > 0 && (
                        <span className="badge locked">Requires {blockers.join(", ")}</span>
                      )}
                      <ul className="req-list">
                        {next.items.map((r) => {
                          const item = itemsById.get(r.itemId);
                          return (
                            <li key={r.itemId} title={item?.name}>
                              <ItemIcon item={item} size={32} />
                              <span>
                                {CURRENCY_CODES[r.itemId]
                                  ? formatPrice(r.count, CURRENCY_CODES[r.itemId])
                                  : `${r.count}× ${item?.shortName ?? r.itemId}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <span className="muted">Fully upgraded</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

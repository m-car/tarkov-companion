import type { Station } from "../../api/hideout";
import { ItemIcon } from "../../components/ItemIcon";
import { LoadState } from "../../components/LoadState";
import {
  CURRENCY_CODES,
  CURRENCY_IDS,
  maxLevel,
  missingStationRequirements,
  requirementKey,
} from "../../lib/hideout";
import { formatPrice } from "../../lib/prices";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { NeededItems } from "../quests/NeededItems";

export function HideoutTab() {
  const { stations, itemsById, items, retry } = useGameData();
  const { verdictContext } = useNeeds();
  const {
    hideoutLevels,
    setHideoutLevel,
    hideoutCollected,
    setHideoutCollected,
    hideoutFlagged,
    setHideoutFlagged,
  } = useAppState();

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
                    (() => {
                      const keys = next.items.map((r) => requirementKey(s.id, next.level, r.itemId));
                      const have = keys.filter((k) => hideoutCollected.has(k)).length;
                      const allHave = have === keys.length && keys.length > 0;
                      // Items still to find for this upgrade (money isn't hunted).
                      const missing = next.items
                        .filter((r, i) => !CURRENCY_IDS.has(r.itemId) && !hideoutCollected.has(keys[i]))
                        .map((r) => r.itemId);
                      const allFlagged = missing.length > 0 && missing.every((id) => hideoutFlagged.has(id));
                      return (
                        <div className="station-next">
                          <div className="station-next-head">
                            <span className="muted">
                              Level {next.level} needs
                              {keys.length > 0 && ` · ${have}/${keys.length} collected`}
                            </span>
                            <span className="station-actions">
                              {missing.length > 0 && (
                                <button
                                  className={`link-btn flag-btn ${allFlagged ? "on" : ""}`}
                                  onClick={() => setHideoutFlagged(missing, !allFlagged)}
                                  title="Suggest these in the raid item hunt"
                                >
                                  ⚑ {allFlagged ? "Flagged" : "Flag for hunt"}
                                </button>
                              )}
                              {keys.length > 0 && (
                                <button
                                  className="link-btn"
                                  onClick={() => setHideoutCollected(keys, !allHave)}
                                >
                                  {allHave ? "Clear" : "Mark all"}
                                </button>
                              )}
                            </span>
                          </div>
                          {blockers.length > 0 && (
                            <span className="badge locked">Requires {blockers.join(", ")}</span>
                          )}
                          {allHave && blockers.length === 0 && (
                            <span className="badge ready">Ready to build</span>
                          )}
                          <ul className="req-list">
                            {next.items.map((r, i) => {
                              const item = itemsById.get(r.itemId);
                              const key = keys[i];
                              const got = hideoutCollected.has(key);
                              const label = CURRENCY_CODES[r.itemId]
                                ? formatPrice(r.count, CURRENCY_CODES[r.itemId])
                                : `${r.count}× ${item?.shortName ?? r.itemId}`;
                              const flagged = hideoutFlagged.has(r.itemId);
                              const huntable = !CURRENCY_IDS.has(r.itemId) && !got;
                              return (
                                <li key={r.itemId} className="req-item">
                                  <button
                                    className={`req ${got ? "got" : ""}`}
                                    onClick={() => setHideoutCollected([key], !got)}
                                    aria-pressed={got}
                                    title={`${item?.name ?? r.itemId}: ${got ? "collected" : "tap when collected"}`}
                                  >
                                    <ItemIcon item={item} size={32} />
                                    <span>{label}</span>
                                    <span className="req-check">{got ? "✓" : ""}</span>
                                  </button>
                                  {huntable && (
                                    <button
                                      className={`req-flag ${flagged ? "on" : ""}`}
                                      onClick={() => setHideoutFlagged([r.itemId], !flagged)}
                                      aria-pressed={flagged}
                                      aria-label={`${flagged ? "Unflag" : "Flag"} ${item?.name ?? "item"} for the item hunt`}
                                      title={flagged ? "Flagged for the item hunt" : "Flag for the item hunt"}
                                    >
                                      ⚑
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })()
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

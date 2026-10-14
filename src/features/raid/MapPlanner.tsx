import { lazy, Suspense } from "react";
import type { Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import type { Task } from "../../api/tasks";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { setPickedQuests, startRaid, toggleQuest } from "../../lib/raidSession";
import { useAppState } from "../../state/AppState";
import { HuntEditor, HuntResults } from "./HuntPanel";
import { BossesSection, BringList, ExtractsSection, KeysSection } from "./MapSections";
import { useRaidPlan } from "./useRaidPlan";

const RaidMap = lazy(() => import("./RaidMap"));

export function MapView({ plan }: { plan: ReturnType<typeof useRaidPlan> }) {
  const config = plan.hunt.config;
  if (!config) return <p className="hint small">No interactive map for this location yet.</p>;
  return (
    <Suspense fallback={<p className="hint small">Loading map…</p>}>
      <RaidMap config={config} pins={plan.pins} />
    </Suspense>
  );
}

export function MapPlanner({
  map,
  tasks,
  items,
  itemsById,
  mapList,
}: {
  map: GameMap;
  tasks: Task[];
  items: Item[];
  itemsById: Map<string, Item>;
  mapList: GameMap[];
}) {
  const { updateRaid } = useAppState();
  const plan = useRaidPlan(map, tasks);
  const [questsOpen, setQuestsOpen] = useLocalStorage("tc.raidQuestsOpen", true);

  return (
    <>
      <div className="map-header">
        <h2 className="map-title">{map.name}</h2>
        <span className="muted">
          {map.raidDuration && `${map.raidDuration} min`}
          {map.players && ` · ${map.players} players`}
        </span>
        <button className="btn primary start" onClick={() => updateRaid((s) => startRaid(s, plan.pickedIds))}>
          Start raid
        </button>
      </div>

      <details
        className="quest-picker"
        open={questsOpen}
        onToggle={(e) => setQuestsOpen(e.currentTarget.open)}
      >
        <summary>
          <span className="section-title">Quests for this raid</span>{" "}
          <span className="muted">
            ({plan.pickedIds.length} of {plan.onMap.length} picked)
          </span>
        </summary>
        {plan.onMap.length === 0 ? (
          <p className="hint">None of your available quests have objectives on {map.name}.</p>
        ) : (
          <>
            <div className="picker-actions">
              <button className="link-btn" onClick={() => updateRaid((s) => setPickedQuests(s, plan.onMapIds))}>
                Pick all
              </button>
              <button className="link-btn" onClick={() => updateRaid((s) => setPickedQuests(s, []))}>
                Clear
              </button>
            </div>
            <ul className="pick-list">
              {plan.onMap.map(({ task, objectives }) => {
                const on = plan.pickedIds.includes(task.id);
                return (
                  <li key={task.id} className={on ? "picked" : ""}>
                    <button
                      className={`pick ${on ? "on" : ""}`}
                      onClick={() => updateRaid((s) => toggleQuest(s, task.id, plan.onMapIds))}
                      aria-pressed={on}
                      aria-label={on ? `Skip ${task.name} this raid` : `Do ${task.name} this raid`}
                    >
                      {on ? "✓" : "+"}
                    </button>
                    <div className="pick-body">
                      <span className="quest-name">{task.name}</span>
                      <span className="quest-meta">
                        {task.traderName}
                        {task.kappaRequired && <span className="badge kappa">Kappa</span>}
                      </span>
                      <ul className="objectives compact">
                        {objectives.map((o) => (
                          <li key={o.id}>{o.description}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </details>
      {!questsOpen && plan.picked.length > 0 && (
        <p className="picked-summary muted small">{plan.picked.map((q) => q.task.name).join(" · ")}</p>
      )}

      <div className="bring-box">
        <span className="bring-title">Bring</span>
        {plan.bring.length > 0 ? (
          <BringList bring={plan.bring} itemsById={itemsById} />
        ) : (
          <span className="muted small">Nothing special for the picked quests.</span>
        )}
      </div>

      <h2 className="section-title">Item hunt</h2>
      <HuntEditor map={map} items={items} itemsById={itemsById} />
      <HuntResults
        results={plan.hunt.results}
        keys={plan.hunt.keys}
        keySpawns={plan.hunt.keySpawns}
        loot={plan.hunt.loot}
        itemsById={itemsById}
      />

      <h2 className="section-title">Map</h2>
      <MapView plan={plan} />

      <ExtractsSection map={map} itemsById={itemsById} mapList={mapList} />
      <BossesSection map={map} />
      <KeysSection map={map} available={plan.available} itemsById={itemsById} />
    </>
  );
}

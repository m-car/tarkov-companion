import { lazy, Suspense } from "react";
import type { Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import type { Task } from "../../api/tasks";
import { Collapsible } from "../../components/Collapsible";
import { setPickedQuests, startRaid, toggleQuest } from "../../lib/raidSession";
import { useAppState } from "../../state/AppState";
import { HuntEditor, HuntResults } from "./HuntPanel";
import { mapConfigFor } from "./useHunt";
import { BossesSection, BringList, ExtractsSection, KeysSection } from "./MapSections";
import { useGeneralMarkers } from "./useGeneralMarkers";
import { useRaidPlan } from "./useRaidPlan";

const RaidMap = lazy(() => import("./RaidMap"));

export function MapView({ map, plan }: { map: GameMap; plan?: ReturnType<typeof useRaidPlan> }) {
  const general = useGeneralMarkers(map);
  const config = mapConfigFor(map);
  if (!config) return <p className="hint small">No interactive map for this location yet.</p>;
  return (
    <Suspense fallback={<p className="hint small">Loading map…</p>}>
      <RaidMap config={config} pins={plan?.pins ?? []} general={general} />
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

      <Collapsible
        id="raidQuests"
        title="Quests for this raid"
        meta={`(${plan.pickedIds.length} of ${plan.onMap.length} picked)`}
        collapsedHint={plan.picked.map((q) => q.task.name).join(" · ")}
      >
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
      </Collapsible>

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
      <MapView map={map} plan={plan} />

      <ExtractsSection map={map} itemsById={itemsById} mapList={mapList} />
      <BossesSection map={map} />
      <KeysSection map={map} available={plan.available} itemsById={itemsById} />
    </>
  );
}

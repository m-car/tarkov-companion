import { useEffect, useState } from "react";
import type { Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import type { Task } from "../../api/tasks";
import { endRaid } from "../../lib/raidSession";
import { useAppState } from "../../state/AppState";
import { useNeeds } from "../../state/useGameData";
import { QuestRow } from "../quests/QuestRow";
import { RecentlyFinished } from "../quests/RecentlyFinished";
import { useQuestToggle } from "../quests/useQuestToggle";
import { HuntResults } from "./HuntPanel";
import { MapView } from "./MapPlanner";
import { BringList, ExtractsSection } from "./MapSections";
import { useRaidPlan } from "./useRaidPlan";

function useMinutesSince(start: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return start ? Math.max(0, Math.floor((now - start) / 60000)) : 0;
}

/** Compact screen for use during a raid. */
export function InRaidView({
  map,
  tasks,
  itemsById,
  mapList,
}: {
  map: GameMap;
  tasks: Task[];
  itemsById: Map<string, Item>;
  mapList: GameMap[];
}) {
  const { raid, updateRaid, completeTask, completed } = useAppState();
  const { statuses } = useNeeds();
  const toggle = useQuestToggle(tasks);
  const plan = useRaidPlan(map, tasks);
  const minutes = useMinutesSince(raid.startedAt);
  const [ending, setEnding] = useState(false);

  // Quests picked at raid start stay listed even once ticked off.
  const pickedTasks = tasks.filter((t) => raid.questIds?.includes(t.id));
  const raidQuests = pickedTasks.map((task) => ({
    task,
    objectives: plan.onMap.find((q) => q.task.id === task.id)?.objectives ?? task.objectives,
  }));
  const open = raidQuests.filter((q) => !completed.has(q.task.id));
  const [finished, setFinished] = useState<Set<string>>(new Set());

  const confirmEnd = () => {
    for (const id of finished) completeTask(id, []);
    updateRaid((s) => endRaid(s));
    setEnding(false);
  };

  return (
    <>
      <div className="raid-banner">
        <div>
          <span className="raid-live">● In raid</span>
          <h2 className="map-title">{map.name}</h2>
          <span className="muted">
            {minutes} min{map.raidDuration && ` of ${map.raidDuration}`}
          </span>
        </div>
        <button className="btn danger" onClick={() => setEnding(true)}>
          End raid
        </button>
      </div>

      {ending && (
        <div className="end-raid">
          <h3>Which quests did you finish?</h3>
          {open.length === 0 ? (
            <p className="hint">No open picked quests.</p>
          ) : (
            <ul className="pick-list">
              {open.map(({ task }) => {
                const on = finished.has(task.id);
                return (
                  <li key={task.id} className={on ? "picked" : ""}>
                    <button
                      className={`pick ${on ? "on" : ""}`}
                      aria-pressed={on}
                      onClick={() =>
                        setFinished((f) => {
                          const next = new Set(f);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        })
                      }
                    >
                      {on ? "✓" : ""}
                    </button>
                    <span className="quest-name">{task.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="end-actions">
            <button className="btn primary" onClick={confirmEnd}>
              End raid{finished.size > 0 && ` and complete ${finished.size}`}
            </button>
            <button className="btn" onClick={() => setEnding(false)}>
              Keep playing
            </button>
          </div>
        </div>
      )}

      <MapView plan={plan} />

      <RecentlyFinished tasks={tasks} />
      <h2 className="section-title">
        Objectives <span className="muted">({open.length} open)</span>
      </h2>
      {raidQuests.length === 0 ? (
        <p className="hint">No quests picked for this raid.</p>
      ) : (
        <ul className="quest-list">
          {raidQuests.map(({ task, objectives }) => (
            <QuestRow
              key={task.id}
              task={task}
              status={statuses.get(task.id) ?? "locked"}
              onToggle={() => toggle(task)}
              itemsById={itemsById}
              objectives={objectives}
              expanded
            />
          ))}
        </ul>
      )}
      {plan.bring.length > 0 && (
        <details className="needs">
          <summary>Brought for quests</summary>
          <BringList bring={plan.bring} itemsById={itemsById} />
        </details>
      )}

      {(plan.hunt.results.length > 0 || plan.hunt.keySpawns) && (
        <>
          <h2 className="section-title">Hunting</h2>
          <HuntResults
            results={plan.hunt.results}
            keys={plan.hunt.keys}
            keySpawns={plan.hunt.keySpawns}
            loot={plan.hunt.loot}
            itemsById={itemsById}
            compact
          />
        </>
      )}

      <ExtractsSection map={map} itemsById={itemsById} mapList={mapList} />
    </>
  );
}

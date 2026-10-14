import { useMemo } from "react";
import type { Item } from "../../api/items";
import { LoadState } from "../../components/LoadState";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { appliesToFaction } from "../../lib/quests";
import { planMaps, type MapPlan } from "../../lib/raid";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { InRaidView } from "./InRaidView";
import { MapPlanner } from "./MapPlanner";
import { BringList } from "./MapSections";

const PLAN = "plan";

export function RaidTab() {
  const { tasks, maps, items, itemsById, retry } = useGameData();
  const { statuses } = useNeeds();
  const { settings, raid } = useAppState();
  const [selected, setSelected] = useLocalStorage("tc.raidMap", PLAN);

  const taskList = useMemo(
    () =>
      tasks.status === "ready"
        ? tasks.data.filter((t) => appliesToFaction(t, settings.faction))
        : [],
    [tasks, settings.faction],
  );
  const mapList = useMemo(() => (maps.status === "ready" ? maps.data : []), [maps]);
  // Hide maps with nothing to show (e.g. arena-style or retired locations).
  const playable = useMemo(
    () => mapList.filter((m) => m.extracts.length > 0 || m.locks.length > 0),
    [mapList],
  );
  const plans = useMemo(() => planMaps(playable, taskList, statuses), [playable, taskList, statuses]);
  const plan = plans.find((p) => p.map.id === selected);
  const ready = maps.status === "ready" && tasks.status === "ready" && items.status === "ready";
  const raidMap = raid.active ? mapList.find((m) => m.id === raid.mapId) : undefined;

  if (ready && raidMap) {
    return (
      <section className="panel">
        <InRaidView map={raidMap} tasks={taskList} itemsById={itemsById} mapList={mapList} />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="chips" role="group" aria-label="Map">
        <button className={!plan ? "active" : ""} onClick={() => setSelected(PLAN)}>
          Plan
        </button>
        {playable.map((m) => (
          <button
            key={m.id}
            className={selected === m.id ? "active" : ""}
            onClick={() => setSelected(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <LoadState states={[maps, tasks, items]} what="raid data" onRetry={retry} />

      {ready &&
        (plan ? (
          <MapPlanner
            map={plan.map}
            tasks={taskList}
            items={items.data}
            itemsById={itemsById}
            mapList={mapList}
          />
        ) : (
          <PlanView plans={plans} itemsById={itemsById} onPick={setSelected} />
        ))}
    </section>
  );
}

function PlanView({
  plans,
  itemsById,
  onPick,
}: {
  plans: MapPlan[];
  itemsById: Map<string, Item>;
  onPick: (mapId: string) => void;
}) {
  return (
    <>
      <p className="hint small">
        Maps ranked by how many of your available quests they move forward. Tap one for extracts,
        objectives, bosses and keys.
      </p>
      <ul className="plan-list">
        {plans.map((p, i) => (
          <li key={p.map.id} className={p.quests.length === 0 ? "plan empty" : "plan"}>
            <button className="plan-head" onClick={() => onPick(p.map.id)}>
              <span className="plan-rank">{p.quests.length > 0 ? i + 1 : "–"}</span>
              <span className="plan-name">{p.map.name}</span>
              <span className="plan-stats">
                {p.quests.length} quest{p.quests.length === 1 ? "" : "s"} · {p.objectiveCount}{" "}
                objective{p.objectiveCount === 1 ? "" : "s"}
                {p.kappaCount > 0 && <span className="badge kappa">{p.kappaCount} Kappa</span>}
              </span>
            </button>
            {p.quests.length > 0 && (
              <div className="plan-body">
                <span className="muted">{p.quests.map((q) => q.task.name).join(" · ")}</span>
                {p.bring.length > 0 && (
                  <>
                    <span className="bring-title">Bring:</span>
                    <BringList bring={p.bring} itemsById={itemsById} />
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

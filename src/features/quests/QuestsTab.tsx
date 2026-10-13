import { useMemo, useState, type ReactNode } from "react";
import type { Task } from "../../api/tasks";
import { LoadState } from "../../components/LoadState";
import { Segmented } from "../../components/Segmented";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  appliesToFaction,
  objectivesAnywhere,
  objectivesOnMap,
  prerequisiteChain,
  type QuestStatus,
} from "../../lib/quests";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { NeededItems } from "./NeededItems";
import { QuestRow } from "./QuestRow";

type Filter = "available" | "locked" | "done" | "all";
const ALL_MAPS = "all";

export function QuestsTab() {
  const { tasks, maps, itemsById, retry } = useGameData();
  const { statuses, verdictContext } = useNeeds();
  const { completed, toggleTask, setTasksCompleted, settings } = useAppState();
  const [mapId, setMapId] = useLocalStorage("tc.questMap", ALL_MAPS);
  const [filter, setFilter] = useLocalStorage<Filter>("tc.questFilter", "available");
  const [kappaOnly, setKappaOnly] = useLocalStorage("tc.kappaOnly", false);
  const [query, setQuery] = useState("");

  const taskList = useMemo(
    () =>
      tasks.status === "ready"
        ? tasks.data.filter((t) => appliesToFaction(t, settings.faction))
        : [],
    [tasks, settings.faction],
  );
  const mapList = maps.status === "ready" ? maps.data : [];
  const mapName = (id: string | null) => mapList.find((m) => m.id === id)?.name;

  // Only offer maps that quests actually happen on.
  const questMaps = useMemo(() => {
    const used = new Set<string>();
    for (const t of taskList) {
      if (t.mapId) used.add(t.mapId);
      for (const o of t.objectives) o.maps.forEach((m) => used.add(m));
    }
    return mapList.filter((m) => used.has(m.id));
  }, [taskList, mapList]);

  const toggle = (task: Task) => {
    if (completed.has(task.id)) toggleTask(task.id);
    else setTasksCompleted([task.id, ...prerequisiteChain(task, taskList)], true);
  };

  const status = (t: Task): QuestStatus => statuses.get(t.id) ?? "locked";
  const q = query.trim().toLowerCase();
  const matches = (t: Task) =>
    (!kappaOnly || t.kappaRequired) && (!q || t.name.toLowerCase().includes(q));

  const counts = useMemo(() => {
    const c = { available: 0, locked: 0, done: 0 };
    for (const t of taskList) c[statuses.get(t.id) ?? "locked"]++;
    return c;
  }, [taskList, statuses]);

  const loading = <LoadState states={[tasks, maps]} what="quests" onRetry={retry} />;

  return (
    <section className="panel">
      <div className="chips" role="group" aria-label="Map">
        <button className={mapId === ALL_MAPS ? "active" : ""} onClick={() => setMapId(ALL_MAPS)}>
          All maps
        </button>
        {questMaps.map((m) => (
          <button key={m.id} className={mapId === m.id ? "active" : ""} onClick={() => setMapId(m.id)}>
            {m.name}
          </button>
        ))}
      </div>

      {loading}

      {tasks.status === "ready" &&
        (mapId === ALL_MAPS ? (
          <>
            <div className="toolbar">
              <Segmented
                label="Quest filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "available", label: `Available ${counts.available}` },
                  { value: "locked", label: `Locked ${counts.locked}` },
                  { value: "done", label: `Done ${counts.done}` },
                  { value: "all", label: "All" },
                ]}
              />
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={kappaOnly}
                  onChange={(e) => setKappaOnly(e.target.checked)}
                />
                Kappa only
              </label>
              <input
                type="search"
                className="search small"
                placeholder="Find quest…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <TraderGroups
              tasks={taskList.filter((t) => matches(t) && (filter === "all" || status(t) === filter))}
              render={(t) => (
                <QuestRow
                  key={t.id}
                  task={t}
                  status={status(t)}
                  mapName={mapName(t.mapId)}
                  onToggle={() => toggle(t)}
                  itemsById={itemsById}
                />
              )}
            />
            <details className="needs">
              <summary>
                Items to keep for quests{" "}
                <span className="muted">({verdictContext.questNeeds.size})</span>
              </summary>
              <NeededItems needs={verdictContext.questNeeds} itemsById={itemsById} />
            </details>
          </>
        ) : (
          <MapView
            tasks={taskList.filter((t) => status(t) === "available" && matches(t))}
            mapId={mapId}
            render={(t, objectives) => (
              <QuestRow
                key={t.id}
                task={t}
                status={status(t)}
                onToggle={() => toggle(t)}
                itemsById={itemsById}
                objectives={objectives}
                expanded
              />
            )}
          />
        ))}
    </section>
  );
}

function TraderGroups({ tasks, render }: { tasks: Task[]; render: (t: Task) => ReactNode }) {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = groups.get(t.traderName) ?? [];
    list.push(t);
    groups.set(t.traderName, list);
  }
  if (groups.size === 0) return <p className="hint">No quests match.</p>;
  return (
    <>
      {[...groups.entries()].map(([trader, list]) => (
        <div key={trader} className="trader-group">
          <h2 className="section-title">
            {trader} <span className="muted">({list.length})</span>
          </h2>
          <ul className="quest-list">
            {list
              .sort((a, b) => a.minPlayerLevel - b.minPlayerLevel || a.name.localeCompare(b.name))
              .map(render)}
          </ul>
        </div>
      ))}
    </>
  );
}

function MapView({
  tasks,
  mapId,
  render,
}: {
  tasks: Task[];
  mapId: string;
  render: (t: Task, objectives: Task["objectives"]) => ReactNode;
}) {
  const here = tasks
    .map((t) => ({ t, objectives: objectivesOnMap(t, mapId) }))
    .filter((x) => x.objectives.length > 0);
  const anywhere = tasks
    .map((t) => ({ t, objectives: objectivesAnywhere(t) }))
    .filter((x) => x.objectives.length > 0);

  return (
    <>
      <h2 className="section-title">
        On this map <span className="muted">({here.length})</span>
      </h2>
      {here.length === 0 ? (
        <p className="hint">None of your available quests have objectives here.</p>
      ) : (
        <ul className="quest-list">{here.map((x) => render(x.t, x.objectives))}</ul>
      )}
      {anywhere.length > 0 && (
        <details className="needs">
          <summary>
            Can be done on any map <span className="muted">({anywhere.length})</span>
          </summary>
          <ul className="quest-list">{anywhere.map((x) => render(x.t, x.objectives))}</ul>
        </details>
      )}
    </>
  );
}

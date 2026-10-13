import { useState } from "react";
import type { Item } from "../../api/items";
import type { Objective, Task } from "../../api/tasks";
import type { QuestStatus } from "../../lib/quests";

export function ObjectiveList({
  objectives,
  itemsById,
}: {
  objectives: Objective[];
  itemsById: Map<string, Item>;
}) {
  return (
    <ul className="objectives">
      {objectives.map((o) => {
        const item = o.items.length ? itemsById.get(o.items[0]) : undefined;
        return (
          <li key={o.id} className={o.optional ? "optional" : ""}>
            {o.description || item?.name || o.type}
            {o.foundInRaid && <span className="badge fir">FIR</span>}
            {o.optional && <span className="muted"> (optional)</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function QuestRow({
  task,
  status,
  mapName,
  onToggle,
  itemsById,
  objectives,
  expanded: alwaysExpanded = false,
}: {
  task: Task;
  status: QuestStatus;
  mapName?: string;
  onToggle: () => void;
  itemsById: Map<string, Item>;
  /** Objectives to show; defaults to all of the quest's objectives. */
  objectives?: Objective[];
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const showObjectives = alwaysExpanded || open;
  const done = status === "done";

  return (
    <li className={`quest-row status-${status}`}>
      <div className="quest-head">
        <button
          className={`check ${done ? "on" : ""}`}
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? `Mark ${task.name} not done` : `Mark ${task.name} done`}
          title={done ? "Mark not done" : "Mark done (also marks required earlier quests)"}
        >
          {done ? "✓" : ""}
        </button>
        <button
          className="quest-title"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={showObjectives}
          disabled={alwaysExpanded}
        >
          <span className="quest-name">{task.name}</span>
          <span className="quest-meta">
            {task.traderName}
            {task.minPlayerLevel > 1 && ` · Lvl ${task.minPlayerLevel}`}
            {mapName && ` · ${mapName}`}
            {task.kappaRequired && <span className="badge kappa">Kappa</span>}
            {task.lightkeeperRequired && <span className="badge lk">LK</span>}
            {status === "locked" && <span className="badge locked">Locked</span>}
          </span>
        </button>
        {task.wikiLink && (
          <a className="wiki" href={task.wikiLink} target="_blank" rel="noreferrer" title="Wiki">
            ↗
          </a>
        )}
      </div>
      {showObjectives && (
        <ObjectiveList objectives={objectives ?? task.objectives} itemsById={itemsById} />
      )}
    </li>
  );
}

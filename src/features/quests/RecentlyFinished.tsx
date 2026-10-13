import type { Task } from "../../api/tasks";
import { useAppState } from "../../state/AppState";

const SHOWN = 5;

function ago(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Quests you just ticked off, with undo, so a misclick is easy to fix. */
export function RecentlyFinished({ tasks }: { tasks: Task[] }) {
  const { recentlyCompleted, undoCompletion, clearRecent } = useAppState();
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const rows = recentlyCompleted.filter((r) => byId.has(r.taskId)).slice(0, SHOWN);
  if (rows.length === 0) return null;

  return (
    <div className="recent">
      <div className="recent-head">
        <span className="section-title">Finished recently</span>
        <button className="link-btn" onClick={clearRecent}>
          Clear
        </button>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.taskId}>
            <span className="recent-check">✓</span>
            <span className="recent-name">
              {byId.get(r.taskId)!.name}
              <span className="muted">
                {" "}
                {ago(r.at)}
                {r.alsoCompleted.length > 0 &&
                  ` · also marked ${r.alsoCompleted.length} earlier quest${r.alsoCompleted.length === 1 ? "" : "s"}`}
              </span>
            </span>
            <button className="btn undo" onClick={() => undoCompletion(r.taskId)}>
              Undo
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

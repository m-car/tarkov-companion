import type { Task } from "../../api/tasks";
import { prerequisiteChain } from "../../lib/quests";
import { useAppState } from "../../state/AppState";

/** Checkbox behaviour: completing also completes required earlier quests; unchecking undoes just this one. */
export function useQuestToggle(tasks: Task[]) {
  const { completed, completeTask, uncompleteTask } = useAppState();
  return (task: Task) => {
    if (completed.has(task.id)) uncompleteTask(task.id);
    else completeTask(task.id, prerequisiteChain(task, tasks));
  };
}

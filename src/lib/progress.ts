export interface RecentCompletion {
  taskId: string;
  /** Earlier quests that were auto-completed along with it (and weren't done before). */
  alsoCompleted: string[];
  at: number;
}

export interface QuestLog {
  completedTasks: string[];
  recentlyCompleted: RecentCompletion[];
}

export const RECENT_LIMIT = 10;

/** Marks a quest done along with its prerequisites, remembering what changed so it can be undone. */
export function completeQuest(
  log: QuestLog,
  taskId: string,
  prerequisites: string[],
  now = Date.now(),
): QuestLog {
  const done = new Set(log.completedTasks);
  if (done.has(taskId)) return log;
  const alsoCompleted = prerequisites.filter((id) => !done.has(id));
  return {
    completedTasks: [...log.completedTasks, taskId, ...alsoCompleted],
    recentlyCompleted: [
      { taskId, alsoCompleted, at: now },
      ...log.recentlyCompleted.filter((r) => r.taskId !== taskId),
    ].slice(0, RECENT_LIMIT),
  };
}

/** Un-marks a single quest (e.g. from the Done list). */
export function uncompleteQuest(log: QuestLog, taskId: string): QuestLog {
  return {
    completedTasks: log.completedTasks.filter((id) => id !== taskId),
    recentlyCompleted: log.recentlyCompleted.filter((r) => r.taskId !== taskId),
  };
}

/** Reverts a recent completion, including the prerequisites it auto-completed. */
export function undoCompletion(log: QuestLog, taskId: string): QuestLog {
  const entry = log.recentlyCompleted.find((r) => r.taskId === taskId);
  if (!entry) return uncompleteQuest(log, taskId);
  const revert = new Set([taskId, ...entry.alsoCompleted]);
  return {
    completedTasks: log.completedTasks.filter((id) => !revert.has(id)),
    recentlyCompleted: log.recentlyCompleted.filter((r) => r.taskId !== taskId),
  };
}

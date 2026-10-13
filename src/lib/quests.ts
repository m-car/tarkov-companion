import type { Objective, Task } from "../api/tasks";

export type Faction = "Any" | "USEC" | "BEAR";

export interface QuestProgress {
  completed: ReadonlySet<string>;
  playerLevel: number;
  faction: Faction;
}

export type QuestStatus = "done" | "available" | "locked";

/** Quests for the other faction never apply to you. */
export function appliesToFaction(task: Task, faction: Faction): boolean {
  return task.factionName === "Any" || faction === "Any" || task.factionName === faction;
}

/**
 * Status of every quest. A prerequisite that must be completed has to be
 * marked done; one that only needs to be started (or failed) counts once the
 * prerequisite itself is available.
 */
export function questStatuses(tasks: Task[], progress: QuestProgress): Map<string, QuestStatus> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const statuses = new Map<string, QuestStatus>();
  const visiting = new Set<string>();

  const statusOf = (task: Task): QuestStatus => {
    const known = statuses.get(task.id);
    if (known) return known;
    if (progress.completed.has(task.id)) {
      statuses.set(task.id, "done");
      return "done";
    }
    if (visiting.has(task.id)) return "locked"; // guard against cycles in the data
    visiting.add(task.id);
    const unlocked =
      task.minPlayerLevel <= progress.playerLevel &&
      task.requirements.every((req) => {
        const prereq = byId.get(req.taskId);
        if (!prereq || !appliesToFaction(prereq, progress.faction)) return true;
        const s = statusOf(prereq);
        return req.status.includes("complete") ? s === "done" : s !== "locked";
      });
    visiting.delete(task.id);
    const status = unlocked ? "available" : "locked";
    statuses.set(task.id, status);
    return status;
  };

  for (const task of tasks) {
    if (appliesToFaction(task, progress.faction)) statusOf(task);
  }
  return statuses;
}

export interface QuestNeed {
  count: number;
  foundInRaid: boolean;
  quests: string[];
}

const ITEM_TURN_IN = new Set(["giveItem", "plantItem"]);

/** Items still to be handed in or planted for quests that aren't done. */
export function questItemNeeds(tasks: Task[], progress: QuestProgress): Map<string, QuestNeed> {
  const needs = new Map<string, QuestNeed>();
  for (const task of tasks) {
    if (progress.completed.has(task.id) || !appliesToFaction(task, progress.faction)) continue;
    for (const obj of task.objectives) {
      if (!ITEM_TURN_IN.has(obj.type) || obj.optional) continue;
      for (const itemId of obj.items) {
        const need = needs.get(itemId) ?? { count: 0, foundInRaid: false, quests: [] };
        need.count += obj.count ?? 1;
        need.foundInRaid ||= obj.foundInRaid;
        if (!need.quests.includes(task.name)) need.quests.push(task.name);
        needs.set(itemId, need);
      }
    }
  }
  return needs;
}

/** Objectives you can work on in a raid on this map (hand-ins happen in the stash). */
export function objectivesOnMap(task: Task, mapId: string): Objective[] {
  return task.objectives.filter((obj) => {
    if (ITEM_TURN_IN.has(obj.type) && obj.type !== "plantItem") return false;
    if (obj.maps.length) return obj.maps.includes(mapId);
    return task.mapId === mapId;
  });
}

/** Objectives with no map restriction, e.g. "kill 5 PMCs" or "find in raid". */
export function objectivesAnywhere(task: Task): Objective[] {
  if (task.mapId) return [];
  return task.objectives.filter(
    (obj) => obj.maps.length === 0 && !ITEM_TURN_IN.has(obj.type),
  );
}

/** Every quest that must be completed before this one (recursively). */
export function prerequisiteChain(task: Task, tasks: Task[]): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const walk = (t: Task) => {
    for (const req of t.requirements) {
      if (!req.status.includes("complete") || seen.has(req.taskId)) continue;
      const prereq = byId.get(req.taskId);
      if (!prereq) continue;
      seen.add(req.taskId);
      walk(prereq);
    }
  };
  walk(task);
  return [...seen];
}

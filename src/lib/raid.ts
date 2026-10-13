import type { Item } from "../api/items";
import type { Extract, GameMap, Lock } from "../api/maps";
import type { Objective, Task } from "../api/tasks";
import { objectivesOnMap, type QuestStatus } from "./quests";

export interface BringItem {
  itemId: string;
  count: number;
  /** Quest names that need it. */
  quests: string[];
  kind: "key" | "plant" | "marker";
}

export interface MapPlan {
  map: GameMap;
  quests: { task: Task; objectives: Objective[] }[];
  objectiveCount: number;
  kappaCount: number;
  bring: BringItem[];
}

function addBring(list: Map<string, BringItem>, entry: Omit<BringItem, "quests">, quest: string) {
  const key = `${entry.kind}:${entry.itemId}`;
  const existing = list.get(key);
  if (existing) {
    // Keys are reusable; planted items and markers are consumed per objective.
    if (entry.kind !== "key") existing.count += entry.count;
    if (!existing.quests.includes(quest)) existing.quests.push(quest);
  } else {
    list.set(key, { ...entry, quests: [quest] });
  }
}

/** What to bring for these quests on this map: quest keys, items to plant, markers. */
export function bringList(map: GameMap, quests: MapPlan["quests"]): BringItem[] {
  const list = new Map<string, BringItem>();
  for (const { task, objectives } of quests) {
    for (const nk of task.neededKeys) {
      if (nk.mapId !== map.id) continue;
      // Any one of the listed keys opens the lock; suggest the first.
      if (nk.keys[0]) addBring(list, { itemId: nk.keys[0], count: 1, kind: "key" }, task.name);
    }
    for (const obj of objectives) {
      if (obj.type === "plantItem" && obj.items[0]) {
        addBring(list, { itemId: obj.items[0], count: obj.count ?? 1, kind: "plant" }, task.name);
      }
      if (obj.markerItem) {
        addBring(list, { itemId: obj.markerItem, count: 1, kind: "marker" }, task.name);
      }
    }
  }
  return [...list.values()];
}

/** Maps ranked by how many of your available quests they move forward. */
export function planMaps(
  maps: GameMap[],
  tasks: Task[],
  statuses: Map<string, QuestStatus>,
): MapPlan[] {
  const available = tasks.filter((t) => statuses.get(t.id) === "available");
  return maps
    .map((map) => {
      const quests = available
        .map((task) => ({ task, objectives: objectivesOnMap(task, map.id) }))
        .filter((q) => q.objectives.length > 0);
      return {
        map,
        quests,
        objectiveCount: quests.reduce((n, q) => n + q.objectives.length, 0),
        kappaCount: quests.filter((q) => q.task.kappaRequired).length,
        bring: bringList(map, quests),
      };
    })
    .sort(
      (a, b) =>
        b.quests.length - a.quests.length ||
        b.objectiveCount - a.objectiveCount ||
        a.map.name.localeCompare(b.map.name),
    );
}

export type Side = "pmc" | "scav";

/** Extracts you can use as this side, split into ones that are always open and conditional ones. */
export function extractsFor(map: GameMap, side: Side): { open: Extract[]; conditional: Extract[] } {
  const usable = map.extracts.filter((e) => e.faction === side || e.faction === "shared");
  const isConditional = (e: Extract) => e.needsSwitch || e.transferItem !== null;
  return {
    open: usable.filter((e) => !isConditional(e)),
    conditional: usable.filter(isConditional),
  };
}

export interface KeyInfo {
  keyId: string;
  item: Item | undefined;
  locks: Lock[];
  owned: boolean;
  /** Available quests that need this key on this map. */
  quests: string[];
}

/** Keys that open something on this map: owned first, then quest keys, then by price. */
export function keysForMap(
  map: GameMap,
  itemsById: Map<string, Item>,
  owned: ReadonlySet<string>,
  questKeys: Map<string, string[]>,
): KeyInfo[] {
  const byKey = new Map<string, Lock[]>();
  for (const lock of map.locks) {
    byKey.set(lock.keyId, [...(byKey.get(lock.keyId) ?? []), lock]);
  }
  for (const keyId of questKeys.keys()) {
    if (!byKey.has(keyId)) byKey.set(keyId, []);
  }
  const price = (k: KeyInfo) => k.item?.avg24hPrice ?? k.item?.lastLowPrice ?? 0;
  return [...byKey.entries()]
    .map(([keyId, locks]) => ({
      keyId,
      item: itemsById.get(keyId),
      locks,
      owned: owned.has(keyId),
      quests: questKeys.get(keyId) ?? [],
    }))
    .sort(
      (a, b) =>
        Number(b.owned) - Number(a.owned) ||
        Number(b.quests.length > 0) - Number(a.quests.length > 0) ||
        price(b) - price(a),
    );
}

/** Quest keys needed on a map by the given quests, keyed by key id. */
export function questKeysOnMap(mapId: string, tasks: Task[]): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const task of tasks) {
    for (const nk of task.neededKeys) {
      if (nk.mapId !== mapId) continue;
      for (const keyId of nk.keys) {
        keys.set(keyId, [...(keys.get(keyId) ?? []), task.name]);
      }
    }
  }
  return keys;
}

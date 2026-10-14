import type { GameMap, Lock, Position } from "../api/maps";
import { areaName, floorName, nearbyLock, type MapConfig } from "./mapGeo";

/** SPT container odds for one map: container type id -> item id -> chance per container. */
export interface ContainerLoot {
  fetchedAt: string;
  containers: Record<string, { expectedItems: number; items: Record<string, number> }>;
}

export interface SpawnSpot {
  position: Position;
  area: string;
  floor: string | null;
  /** A locked door right next to the spot; the item is likely behind it. */
  lock: Lock | null;
}

export interface SpotGroup {
  area: string;
  floor: string | null;
  lock: Lock | null;
  spots: SpawnSpot[];
}

export interface ContainerMatch {
  typeId: string;
  typeName: string;
  /** Chance the item is in one such container. */
  chance: number;
  positions: Position[];
  areas: { area: string; count: number }[];
  /** Expected finds if you search every one of them. */
  expected: number;
}

export interface HuntResult {
  itemId: string;
  loose: SpawnSpot[];
  looseGroups: SpotGroup[];
  containers: ContainerMatch[];
}

const doorLocks = (map: GameMap) => map.locks.filter((l) => l.lockType === "door" && l.position);

function describe(position: Position, map: GameMap, config: MapConfig | undefined): SpawnSpot {
  const area = areaName(position, config);
  const floor = floorName(position, config);
  return {
    position,
    area,
    // On label-less maps the area already is the level name.
    floor: floor === area ? null : floor,
    lock: nearbyLock(position, doorLocks(map)),
  };
}

/** Groups spots that share an area, floor and nearby lock, biggest groups first. */
export function groupSpots(spots: SpawnSpot[]): SpotGroup[] {
  const groups = new Map<string, SpotGroup>();
  for (const spot of spots) {
    const key = `${spot.area}|${spot.floor ?? ""}|${spot.lock?.id ?? ""}`;
    const group = groups.get(key) ?? { area: spot.area, floor: spot.floor, lock: spot.lock, spots: [] };
    group.spots.push(spot);
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.spots.length - a.spots.length || a.area.localeCompare(b.area),
  );
}

const countBy = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
};

/** Where an item can be found on a map: loose spawn spots (tarkov.dev) and containers (SPT odds). */
export function huntItem(
  itemId: string,
  map: GameMap,
  config: MapConfig | undefined,
  loot: ContainerLoot | null,
): HuntResult {
  const loose = map.lootLoose
    .filter((l) => l.items.includes(itemId))
    .map((l) => describe(l.position, map, config));

  const byType = new Map<string, { typeName: string; positions: Position[] }>();
  for (const c of map.lootContainers) {
    const entry = byType.get(c.typeId) ?? { typeName: c.typeName, positions: [] };
    entry.positions.push(c.position);
    byType.set(c.typeId, entry);
  }
  const containers: ContainerMatch[] = [];
  for (const [typeId, { typeName, positions }] of byType) {
    const chance = loot?.containers[typeId]?.items[itemId];
    if (!chance) continue;
    containers.push({
      typeId,
      typeName,
      chance,
      positions,
      areas: countBy(positions.map((p) => areaName(p, config))),
      expected: chance * positions.length,
    });
  }
  containers.sort((a, b) => b.expected - a.expected);

  return { itemId, loose, looseGroups: groupSpots(loose), containers };
}

export interface HuntKey {
  keyId: string;
  /** Hunt items likely behind this key's doors. */
  itemIds: string[];
  spots: number;
}

/** Keys for locked rooms that hunt items are likely behind. */
export function huntKeys(results: HuntResult[]): HuntKey[] {
  const keys = new Map<string, HuntKey>();
  for (const r of results) {
    for (const spot of r.loose) {
      if (!spot.lock) continue;
      const k = keys.get(spot.lock.keyId) ?? { keyId: spot.lock.keyId, itemIds: [], spots: 0 };
      if (!k.itemIds.includes(r.itemId)) k.itemIds.push(r.itemId);
      k.spots++;
      keys.set(spot.lock.keyId, k);
    }
  }
  return [...keys.values()].sort((a, b) => b.spots - a.spots);
}

export interface KeySpot extends SpawnSpot {
  /** Keys that can spawn at this spot. */
  keyIds: string[];
}

export interface KeySpotGroup extends SpotGroup {
  spots: KeySpot[];
  /** Every key that can spawn somewhere in the group. */
  keyIds: string[];
}

export interface AllKeysResult {
  spots: KeySpot[];
  groups: KeySpotGroup[];
  /** Container types by chance of holding any key. */
  containers: ContainerMatch[];
}

/** Every place a key can spawn on the map: loose spots and the containers most likely to hold one. */
export function huntAllKeys(
  map: GameMap,
  config: MapConfig | undefined,
  loot: ContainerLoot | null,
  isKey: (itemId: string) => boolean,
): AllKeysResult {
  const spots: KeySpot[] = [];
  for (const l of map.lootLoose) {
    const keyIds = l.items.filter(isKey);
    if (keyIds.length) spots.push({ ...describe(l.position, map, config), keyIds });
  }
  const groups = groupSpots(spots).map((g) => ({
    ...g,
    spots: g.spots as KeySpot[],
    keyIds: [...new Set((g.spots as KeySpot[]).flatMap((s) => s.keyIds))],
  }));

  const byType = new Map<string, { typeName: string; positions: Position[] }>();
  for (const c of map.lootContainers) {
    const entry = byType.get(c.typeId) ?? { typeName: c.typeName, positions: [] };
    entry.positions.push(c.position);
    byType.set(c.typeId, entry);
  }
  const containers: ContainerMatch[] = [];
  for (const [typeId, { typeName, positions }] of byType) {
    const odds = loot?.containers[typeId]?.items ?? {};
    // Chance of at least one key: 1 - product of each key's chance of missing.
    let miss = 1;
    for (const [itemId, chance] of Object.entries(odds)) {
      if (isKey(itemId)) miss *= 1 - chance;
    }
    const chance = 1 - miss;
    if (chance <= 0) continue;
    containers.push({
      typeId,
      typeName,
      chance,
      positions,
      areas: countBy(positions.map((p) => areaName(p, config))),
      expected: chance * positions.length,
    });
  }
  containers.sort((a, b) => b.expected - a.expected);
  return { spots, groups, containers };
}

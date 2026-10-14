import type { Station } from "../api/hideout";

// Money shows up in hideout requirements but isn't something you loot for.
export const CURRENCY_CODES: Record<string, string> = {
  "5449016a4bdc2d6f028b456f": "RUB",
  "5696686a4bdc2da3298b456a": "USD",
  "569668774bdc2da2298b4568": "EUR",
};
export const CURRENCY_IDS = new Set(Object.keys(CURRENCY_CODES));

export type HideoutLevels = Record<string, number>;

export interface HideoutNeed {
  count: number;
  upgrades: string[];
}

/** Key for one item requirement of one station level, used to mark it collected. */
export const requirementKey = (stationId: string, level: number, itemId: string) =>
  `${stationId}:${level}:${itemId}`;

/** Items needed for every upgrade above each station's current level, minus ones marked collected. */
export function hideoutItemNeeds(
  stations: Station[],
  levels: HideoutLevels,
  collected: ReadonlySet<string> = new Set(),
): Map<string, HideoutNeed> {
  const needs = new Map<string, HideoutNeed>();
  for (const station of stations) {
    const current = levels[station.id] ?? 0;
    for (const level of station.levels) {
      if (level.level <= current) continue;
      for (const req of level.items) {
        if (CURRENCY_IDS.has(req.itemId)) continue;
        if (collected.has(requirementKey(station.id, level.level, req.itemId))) continue;
        const need = needs.get(req.itemId) ?? { count: 0, upgrades: [] };
        need.count += req.count;
        need.upgrades.push(`${station.name} ${level.level}`);
        needs.set(req.itemId, need);
      }
    }
  }
  return needs;
}

export function maxLevel(station: Station): number {
  return station.levels.at(-1)?.level ?? 0;
}

/** Station upgrades blocked by other stations you haven't built yet. */
export function missingStationRequirements(
  station: Station,
  targetLevel: number,
  stations: Station[],
  levels: HideoutLevels,
): string[] {
  const level = station.levels.find((l) => l.level === targetLevel);
  if (!level) return [];
  return level.stationRequirements
    .filter((r) => (levels[r.stationId] ?? 0) < r.level)
    .map((r) => {
      const name = stations.find((s) => s.id === r.stationId)?.name ?? r.stationId;
      return `${name} ${r.level}`;
    });
}

import { cached, fetchLocalized, type GameMode } from "./client";

export interface Extract {
  id: string;
  name: string;
  /** "pmc", "scav" or "shared". */
  faction: string;
  needsSwitch: boolean;
  /** Item (often roubles) you must hand over to use the extract. */
  transferItem: { itemId: string; count: number } | null;
}

export interface Transit {
  id: string;
  description: string;
  toMapId: string;
}

export interface Lock {
  id: string;
  keyId: string;
  lockType: string;
  needsPower: boolean;
}

export interface BossSpawn {
  name: string;
  chance: number;
  locations: string[];
}

export interface GameMap {
  id: string;
  name: string;
  normalizedName: string;
  raidDuration: number | null;
  players: string | null;
  extracts: Extract[];
  transits: Transit[];
  locks: Lock[];
  bosses: BossSpawn[];
}

// json.tarkov.dev payload shapes (only the fields we use).
export interface RawMap {
  id: string;
  name: string;
  normalizedName: string;
  raidDuration?: number;
  players?: string;
  extracts?: {
    id: string;
    name: string;
    faction?: string;
    switches?: string[];
    switch?: string | false;
    transferItem?: { item: string; count?: number } | null;
  }[];
  transits?: { id: string; description: string; map: string }[];
  locks?: { id: string; key: string; lockType?: string; needsPower?: boolean }[];
  bosses?: { mob: string; spawnChance: number; spawnLocations?: { name: string }[] }[];
}

export interface RawMob {
  name: string;
}

export function buildMaps(
  raw: Record<string, RawMap>,
  mobs: Record<string, RawMob>,
  t: (key: string) => string,
): GameMap[] {
  return Object.values(raw)
    .map((m) => ({
      id: m.id,
      name: t(m.name),
      normalizedName: m.normalizedName,
      raidDuration: m.raidDuration ?? null,
      players: m.players ?? null,
      extracts: (m.extracts ?? []).map((e) => ({
        id: e.id,
        name: t(e.name),
        faction: e.faction ?? "shared",
        needsSwitch: Boolean(e.switch) || (e.switches?.length ?? 0) > 0,
        transferItem: e.transferItem
          ? { itemId: e.transferItem.item, count: e.transferItem.count ?? 1 }
          : null,
      })),
      transits: (m.transits ?? []).map((tr) => ({
        id: tr.id,
        description: t(tr.description),
        toMapId: tr.map,
      })),
      locks: (m.locks ?? []).map((l) => ({
        id: l.id,
        keyId: l.key,
        lockType: l.lockType ?? "door",
        needsPower: Boolean(l.needsPower),
      })),
      bosses: (m.bosses ?? [])
        .map((b) => ({
          name: t(mobs[b.mob]?.name ?? b.mob),
          chance: b.spawnChance,
          locations: [...new Set((b.spawnLocations ?? []).map((l) => t(l.name)))],
        }))
        .sort((a, b) => b.chance - a.chance),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadMaps(gameMode: GameMode): Promise<GameMap[]> {
  return cached(`${gameMode}/maps`, async () => {
    const { data, t } = await fetchLocalized<{
      maps: Record<string, RawMap>;
      mobs?: Record<string, RawMob>;
    }>(`${gameMode}/maps`);
    return buildMaps(data.maps, data.mobs ?? {}, t);
  });
}

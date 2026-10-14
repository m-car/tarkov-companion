import { cached, fetchLocalized, type GameMode } from "./client";

/** Game-world coordinates; y is height. */
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Extract {
  id: string;
  position: Position | null;
  name: string;
  /** "pmc", "scav" or "shared". */
  faction: string;
  needsSwitch: boolean;
  /** Item (often roubles) you must hand over to use the extract. */
  transferItem: { itemId: string; count: number } | null;
}

export interface Transit {
  id: string;
  position: Position | null;
  description: string;
  toMapId: string;
}

export interface Lock {
  id: string;
  position: Position | null;
  keyId: string;
  lockType: string;
  needsPower: boolean;
}

export interface BossSpawn {
  name: string;
  chance: number;
  locations: string[];
}

export interface LooseLoot {
  position: Position;
  items: string[];
}

export interface LootContainer {
  /** Container type (template) id, e.g. a Medcase. */
  typeId: string;
  typeName: string;
  position: Position;
}

export interface GameMap {
  id: string;
  name: string;
  normalizedName: string;
  /** Game location id (e.g. "Shoreline"); also the SPT data folder name. */
  nameId: string | null;
  raidDuration: number | null;
  players: string | null;
  extracts: Extract[];
  transits: Transit[];
  locks: Lock[];
  bosses: BossSpawn[];
  lootLoose: LooseLoot[];
  lootContainers: LootContainer[];
}

// json.tarkov.dev payload shapes (only the fields we use).
export interface RawMap {
  id: string;
  name: string;
  normalizedName: string;
  nameId?: string;
  raidDuration?: number;
  players?: string;
  extracts?: {
    id: string;
    name: string;
    faction?: string;
    switches?: string[];
    switch?: string | false;
    transferItem?: { item: string; count?: number } | null;
    position?: Position;
  }[];
  transits?: { id: string; description: string; map: string; position?: Position }[];
  locks?: { id: string; key: string; lockType?: string; needsPower?: boolean; position?: Position }[];
  lootLoose?: { position: Position; items?: string[] }[];
  lootContainers?: { lootContainer: string; position: Position }[];
  bosses?: { mob: string; spawnChance: number; spawnLocations?: { name: string }[] }[];
}

export interface RawMob {
  name: string;
}

export interface RawContainerType {
  id: string;
  name: string;
}

export function buildMaps(
  raw: Record<string, RawMap>,
  mobs: Record<string, RawMob>,
  t: (key: string) => string,
  containerTypes: Record<string, RawContainerType> = {},
): GameMap[] {
  return Object.values(raw)
    .map((m) => ({
      id: m.id,
      name: t(m.name),
      normalizedName: m.normalizedName,
      nameId: m.nameId ?? null,
      raidDuration: m.raidDuration ?? null,
      players: m.players ?? null,
      extracts: (m.extracts ?? []).map((e) => ({
        id: e.id,
        position: e.position ?? null,
        name: t(e.name),
        faction: e.faction ?? "shared",
        needsSwitch: Boolean(e.switch) || (e.switches?.length ?? 0) > 0,
        transferItem: e.transferItem
          ? { itemId: e.transferItem.item, count: e.transferItem.count ?? 1 }
          : null,
      })),
      transits: (m.transits ?? []).map((tr) => ({
        id: tr.id,
        position: tr.position ?? null,
        description: t(tr.description),
        toMapId: tr.map,
      })),
      locks: (m.locks ?? []).map((l) => ({
        id: l.id,
        position: l.position ?? null,
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
      lootLoose: (m.lootLoose ?? [])
        .filter((l) => l.position && l.items?.length)
        .map((l) => ({ position: l.position, items: l.items ?? [] })),
      lootContainers: (m.lootContainers ?? [])
        .filter((c) => c.position)
        .map((c) => ({
          typeId: c.lootContainer,
          typeName: t(containerTypes[c.lootContainer]?.name ?? c.lootContainer),
          position: c.position,
        })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadMaps(gameMode: GameMode): Promise<GameMap[]> {
  return cached(`${gameMode}/maps`, async () => {
    const { data, t } = await fetchLocalized<{
      maps: Record<string, RawMap>;
      mobs?: Record<string, RawMob>;
      lootContainers?: Record<string, RawContainerType>;
    }>(`${gameMode}/maps`);
    return buildMaps(data.maps, data.mobs ?? {}, t, data.lootContainers ?? {});
  });
}

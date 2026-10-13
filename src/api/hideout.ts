import { cached, fetchLocalized, type GameMode, type Translate } from "./client";

export interface StationLevel {
  level: number;
  items: { itemId: string; count: number }[];
  stationRequirements: { stationId: string; level: number }[];
}

export interface Station {
  id: string;
  name: string;
  normalizedName: string;
  levels: StationLevel[];
}

export interface RawStation {
  id: string;
  name: string;
  normalizedName: string;
  levels?: {
    level: number;
    itemRequirements?: { item: string; count?: number }[];
    stationLevelRequirements?: { station: string; level: number }[];
  }[];
}

export function buildStations(raw: Record<string, RawStation>, t: Translate): Station[] {
  return Object.values(raw)
    .map((s) => ({
      id: s.id,
      name: t(s.name),
      normalizedName: s.normalizedName,
      levels: (s.levels ?? [])
        .map((l) => ({
          level: l.level,
          items: (l.itemRequirements ?? []).map((r) => ({ itemId: r.item, count: r.count || 1 })),
          stationRequirements: (l.stationLevelRequirements ?? []).map((r) => ({
            stationId: r.station,
            level: r.level,
          })),
        }))
        .sort((a, b) => a.level - b.level),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadHideout(gameMode: GameMode): Promise<Station[]> {
  return cached(`${gameMode}/hideout`, async () => {
    const { data, t } = await fetchLocalized<Record<string, RawStation>>(`${gameMode}/hideout`);
    return buildStations(data, t);
  });
}

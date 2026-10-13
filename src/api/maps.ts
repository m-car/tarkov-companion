import { cached, fetchLocalized, type GameMode } from "./client";

export interface GameMap {
  id: string;
  name: string;
  normalizedName: string;
}

interface RawMap {
  id: string;
  name: string;
  normalizedName: string;
}

export function loadMaps(gameMode: GameMode): Promise<GameMap[]> {
  return cached(`${gameMode}/maps`, async () => {
    const { data, t } = await fetchLocalized<{ maps: Record<string, RawMap> }>(`${gameMode}/maps`);
    return Object.values(data.maps)
      .map((m) => ({ id: m.id, name: t(m.name), normalizedName: m.normalizedName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

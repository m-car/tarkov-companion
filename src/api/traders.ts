import { cached, fetchLocalized, type GameMode } from "./client";

export interface Trader {
  id: string;
  name: string;
  normalizedName: string;
}

export interface RawTrader {
  id: string;
  name: string;
  normalizedName: string;
}

export function loadTraders(gameMode: GameMode): Promise<Record<string, Trader>> {
  return cached(`${gameMode}/traders`, async () => {
    const { data, t } = await fetchLocalized<Record<string, RawTrader>>(`${gameMode}/traders`);
    const traders: Record<string, Trader> = {};
    for (const raw of Object.values(data)) {
      traders[raw.id] = { id: raw.id, name: t(raw.name), normalizedName: raw.normalizedName };
    }
    return traders;
  });
}

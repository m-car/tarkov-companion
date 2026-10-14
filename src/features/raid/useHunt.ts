import { useMemo } from "react";
import { cached } from "../../api/client";
import type { GameMap } from "../../api/maps";
import mapConfigs from "../../data/mapConfigs.json";
import { useLoader } from "../../hooks/useLoader";
import { huntItem, huntKeys, type ContainerLoot } from "../../lib/hunt";
import type { MapConfig } from "../../lib/mapGeo";

export function mapConfigFor(map: GameMap): MapConfig | undefined {
  return (mapConfigs as unknown as Record<string, MapConfig>)[map.normalizedName];
}

/** SPT container odds for a map, shipped with the app under public/loot/. */
function loadContainerLoot(map: GameMap): Promise<ContainerLoot | null> {
  const folder = map.nameId?.toLowerCase();
  if (!folder) return Promise.resolve(null);
  return cached(`loot/${folder}`, async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}loot/${folder}.json`);
    // Missing data for a map just means no container odds.
    return res.ok ? ((await res.json()) as ContainerLoot) : null;
  });
}

export function useHunt(map: GameMap, itemIds: string[]) {
  const loot = useLoader(() => loadContainerLoot(map), map.id);
  const config = mapConfigFor(map);
  const lootData = loot.status === "ready" ? loot.data : null;
  return useMemo(() => {
    const results = itemIds.map((id) => huntItem(id, map, config, lootData));
    return { results, keys: huntKeys(results), config, loot: lootData, lootLoading: loot.status === "loading" };
  }, [map, itemIds, config, lootData, loot.status]);
}

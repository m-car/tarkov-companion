import { useMemo } from "react";
import type { GameMap } from "../../api/maps";
import { buildGeneralMarkers } from "../../lib/mapMarkers";
import { useAppState } from "../../state/AppState";
import { useGameData } from "../../state/useGameData";
import { useSide } from "./MapSections";
import { mapConfigFor, useContainerLoot } from "./useHunt";

/** General map markers (containers, locks, loose loot, bosses, extracts) for any map. */
export function useGeneralMarkers(map: GameMap) {
  const { itemsById } = useGameData();
  const { ownedKeys } = useAppState();
  const [side] = useSide();
  const loot = useContainerLoot(map);
  const lootData = loot.status === "ready" ? loot.data : null;
  const config = mapConfigFor(map);
  return useMemo(
    () => buildGeneralMarkers({ map, config, loot: lootData, itemsById, ownedKeys, side }),
    [map, config, lootData, itemsById, ownedKeys, side],
  );
}

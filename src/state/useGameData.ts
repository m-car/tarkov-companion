import { useMemo, useState } from "react";
import { loadHideout } from "../api/hideout";
import { loadItems, type Item } from "../api/items";
import { loadMaps } from "../api/maps";
import { loadTasks } from "../api/tasks";
import { useLoader } from "../hooks/useLoader";
import { hideoutItemNeeds } from "../lib/hideout";
import { questItemNeeds, questStatuses } from "../lib/quests";
import type { VerdictContext } from "../lib/verdict";
import { useAppState } from "./AppState";

/** All game data for the current mode. Each loader is cached, so this is cheap to call anywhere. */
export function useGameData() {
  const { gameMode } = useAppState();
  const [retryCount, setRetryCount] = useState(0);
  const items = useLoader(() => loadItems(gameMode), gameMode, retryCount);
  const tasks = useLoader(() => loadTasks(gameMode), gameMode, retryCount);
  const stations = useLoader(() => loadHideout(gameMode), gameMode, retryCount);
  const maps = useLoader(() => loadMaps(gameMode), gameMode, retryCount);

  const itemsById = useMemo(
    () => new Map<string, Item>(items.status === "ready" ? items.data.map((i) => [i.id, i]) : []),
    [items],
  );

  return { items, itemsById, tasks, stations, maps, retry: () => setRetryCount((n) => n + 1) };
}

/** Quest status and what your quests and hideout still need, from saved progress. */
export function useNeeds() {
  const { tasks, stations } = useGameData();
  const { completed, playerLevel, hideoutLevels, starred, settings } = useAppState();

  return useMemo(() => {
    const progress = { completed, playerLevel, faction: settings.faction };
    const taskList = tasks.status === "ready" ? tasks.data : [];
    const stationList = stations.status === "ready" ? stations.data : [];
    const verdictContext: VerdictContext = {
      questNeeds: questItemNeeds(taskList, progress),
      hideoutNeeds: hideoutItemNeeds(stationList, hideoutLevels),
      starred,
      perSlotThreshold: settings.perSlotThreshold,
    };
    return {
      progress,
      statuses: questStatuses(taskList, progress),
      verdictContext,
      // Verdicts are incomplete until quest and hideout data have loaded.
      needsReady: tasks.status === "ready" && stations.status === "ready",
    };
  }, [tasks, stations, completed, playerLevel, hideoutLevels, starred, settings]);
}

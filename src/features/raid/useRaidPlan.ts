import { useEffect, useMemo } from "react";
import type { GameMap } from "../../api/maps";
import type { Task } from "../../api/tasks";
import { objectivesOnMap } from "../../lib/quests";
import { bringList } from "../../lib/raid";
import { pickedQuests, selectMap } from "../../lib/raidSession";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { useSide } from "./MapSections";
import { buildPins } from "./pins";
import { useHunt } from "./useHunt";

/** Everything the planner and in-raid view need for one map. */
export function useRaidPlan(map: GameMap, tasks: Task[]) {
  const { raid, updateRaid, ownedKeys } = useAppState();
  const { statuses } = useNeeds();
  const { itemsById } = useGameData();
  const [side] = useSide();

  // Keep the session on the map being viewed (quest picks reset when it changes).
  useEffect(() => {
    if (raid.mapId !== map.id && !raid.active) updateRaid((s) => selectMap(s, map.id));
  }, [map.id, raid.mapId, raid.active, updateRaid]);

  const available = useMemo(() => tasks.filter((t) => statuses.get(t.id) === "available"), [tasks, statuses]);
  const onMap = useMemo(
    () =>
      available
        .map((task) => ({ task, objectives: objectivesOnMap(task, map.id) }))
        .filter((q) => q.objectives.length > 0),
    [available, map.id],
  );
  const onMapIds = useMemo(() => onMap.map((q) => q.task.id), [onMap]);
  const pickedIds = useMemo(
    () => (raid.mapId === map.id ? pickedQuests(raid, onMapIds) : onMapIds),
    [raid, map.id, onMapIds],
  );
  const picked = useMemo(() => onMap.filter((q) => pickedIds.includes(q.task.id)), [onMap, pickedIds]);
  const bring = useMemo(() => bringList(map, picked), [map, picked]);
  const hunt = useHunt(map, raid.huntItems);

  const pins = useMemo(
    () =>
      buildPins({
        map,
        hunt: hunt.results,
        objectives: picked.flatMap((q) => q.objectives.map((objective) => ({ quest: q.task.name, objective }))),
        side,
        ownedKeys,
        itemsById,
      }),
    [map, hunt.results, picked, side, ownedKeys, itemsById],
  );

  return { available, onMap, onMapIds, pickedIds, picked, bring, hunt, pins };
}

export interface RaidSession {
  /** Map being planned or played. */
  mapId: string | null;
  /** Quests picked for this raid (none until you pick them). */
  questIds: string[];
  /** Items to keep an eye out for. */
  huntItems: string[];
  /** Also show every key spawn on the map. */
  huntAllKeys?: boolean;
  active: boolean;
  startedAt: number | null;
}

export const EMPTY_SESSION: RaidSession = {
  mapId: null,
  questIds: [],
  huntItems: [],
  active: false,
  startedAt: null,
};

/** Picked quests, limited to ones still available on the map. */
export function pickedQuests(session: RaidSession, availableOnMap: string[]): string[] {
  // Older saved sessions used null for "all"; treat anything missing as none picked.
  const picked = new Set(session.questIds ?? []);
  return availableOnMap.filter((id) => picked.has(id));
}

export function toggleQuest(session: RaidSession, id: string, availableOnMap: string[]): RaidSession {
  const current = pickedQuests(session, availableOnMap);
  const questIds = current.includes(id) ? current.filter((q) => q !== id) : [...current, id];
  return { ...session, questIds };
}

export function selectMap(session: RaidSession, mapId: string): RaidSession {
  // Quest picks are per map; hunt items carry over.
  return session.mapId === mapId ? session : { ...session, mapId, questIds: [] };
}

export function toggleHuntItem(session: RaidSession, itemId: string): RaidSession {
  const huntItems = session.huntItems.includes(itemId)
    ? session.huntItems.filter((i) => i !== itemId)
    : [...session.huntItems, itemId];
  return { ...session, huntItems };
}

/** Starts the raid, freezing the picked quests so they stay listed even once completed. */
export function setPickedQuests(session: RaidSession, questIds: string[]): RaidSession {
  return { ...session, questIds };
}

export function startRaid(session: RaidSession, picked: string[], now = Date.now()): RaidSession {
  return { ...session, questIds: picked, active: true, startedAt: now };
}

/** Ends the raid; quest picks reset for next time, the hunt list stays. */
export function endRaid(session: RaidSession): RaidSession {
  return { ...session, active: false, startedAt: null, questIds: [] };
}

export function toggleHuntAllKeys(session: RaidSession): RaidSession {
  return { ...session, huntAllKeys: !session.huntAllKeys };
}

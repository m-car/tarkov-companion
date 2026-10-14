import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { GameMode } from "../api/client";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { HideoutLevels } from "../lib/hideout";
import {
  completeQuest,
  uncompleteQuest,
  undoCompletion,
  type QuestLog,
  type RecentCompletion,
} from "../lib/progress";
import type { Faction } from "../lib/quests";
import { EMPTY_SESSION, type RaidSession } from "../lib/raidSession";

interface Progress {
  completedTasks: string[];
  hideoutLevels: HideoutLevels;
  playerLevel: number;
  ownedKeys?: string[];
  recentlyCompleted?: RecentCompletion[];
  raid?: RaidSession;
}

interface Settings {
  faction: Faction;
  perSlotThreshold: number;
}

interface AppState {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;

  completed: ReadonlySet<string>;
  /** Marks a quest done, plus prerequisites; recorded in recentlyCompleted for undo. */
  completeTask: (id: string, prerequisites: string[]) => void;
  uncompleteTask: (id: string) => void;
  undoCompletion: (id: string) => void;
  recentlyCompleted: RecentCompletion[];
  clearRecent: () => void;
  playerLevel: number;
  setPlayerLevel: (level: number) => void;
  hideoutLevels: HideoutLevels;
  setHideoutLevel: (stationId: string, level: number) => void;

  starred: ReadonlySet<string>;
  toggleStar: (itemId: string) => void;

  ownedKeys: ReadonlySet<string>;
  toggleOwnedKey: (itemId: string) => void;

  raid: RaidSession;
  updateRaid: (change: (session: RaidSession) => RaidSession) => void;

  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<AppState | null>(null);

const EMPTY_PROGRESS: Progress = { completedTasks: [], hideoutLevels: {}, playerLevel: 1 };
const DEFAULT_SETTINGS: Settings = { faction: "Any", perSlotThreshold: 20000 };

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [gameMode, setGameMode] = useLocalStorage<GameMode>("tc.gameMode", "regular");
  // Quest and hideout progress is separate for PvP and PvE.
  const [progress, setProgress] = useLocalStorage<Progress>(
    `tc.progress.${gameMode}`,
    EMPTY_PROGRESS,
  );
  const [starredList, setStarred] = useLocalStorage<string[]>("tc.starred", []);
  const [storedSettings, setSettings] = useLocalStorage<Settings>("tc.settings", DEFAULT_SETTINGS);

  const value = useMemo((): AppState => {
    const completed = new Set(progress.completedTasks);
    const updateLog = (change: (log: QuestLog) => QuestLog) =>
      setProgress((p) => ({
        ...p,
        ...change({
          completedTasks: p.completedTasks,
          recentlyCompleted: p.recentlyCompleted ?? [],
        }),
      }));
    return {
      gameMode,
      setGameMode,
      completed,
      completeTask: (id, prerequisites) => updateLog((log) => completeQuest(log, id, prerequisites)),
      uncompleteTask: (id) => updateLog((log) => uncompleteQuest(log, id)),
      undoCompletion: (id) => updateLog((log) => undoCompletion(log, id)),
      recentlyCompleted: progress.recentlyCompleted ?? [],
      clearRecent: () => setProgress((p) => ({ ...p, recentlyCompleted: [] })),
      playerLevel: progress.playerLevel,
      setPlayerLevel: (level) => setProgress((p) => ({ ...p, playerLevel: level })),
      hideoutLevels: progress.hideoutLevels,
      setHideoutLevel: (stationId, level) =>
        setProgress((p) => ({ ...p, hideoutLevels: { ...p.hideoutLevels, [stationId]: level } })),
      ownedKeys: new Set(progress.ownedKeys ?? []),
      toggleOwnedKey: (itemId) =>
        setProgress((p) => {
          const keys = p.ownedKeys ?? [];
          return {
            ...p,
            ownedKeys: keys.includes(itemId) ? keys.filter((k) => k !== itemId) : [...keys, itemId],
          };
        }),
      raid: { ...EMPTY_SESSION, ...progress.raid },
      updateRaid: (change) =>
        setProgress((p) => ({ ...p, raid: change({ ...EMPTY_SESSION, ...p.raid }) })),
      starred: new Set(starredList),
      toggleStar: (itemId) =>
        setStarred((s) => (s.includes(itemId) ? s.filter((i) => i !== itemId) : [...s, itemId])),
      settings: { ...DEFAULT_SETTINGS, ...storedSettings },
      updateSettings: (patch) => setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, ...patch })),
    };
  }, [gameMode, setGameMode, progress, setProgress, starredList, setStarred, storedSettings, setSettings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(Ctx);
  if (!state) throw new Error("useAppState must be used inside AppStateProvider");
  return state;
}

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { GameMode } from "../api/client";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { HideoutLevels } from "../lib/hideout";
import type { Faction } from "../lib/quests";

interface Progress {
  completedTasks: string[];
  hideoutLevels: HideoutLevels;
  playerLevel: number;
}

interface Settings {
  faction: Faction;
  perSlotThreshold: number;
}

interface AppState {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;

  completed: ReadonlySet<string>;
  toggleTask: (id: string) => void;
  setTasksCompleted: (ids: string[], done: boolean) => void;
  playerLevel: number;
  setPlayerLevel: (level: number) => void;
  hideoutLevels: HideoutLevels;
  setHideoutLevel: (stationId: string, level: number) => void;

  starred: ReadonlySet<string>;
  toggleStar: (itemId: string) => void;

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
    return {
      gameMode,
      setGameMode,
      completed,
      toggleTask: (id) =>
        setProgress((p) => ({
          ...p,
          completedTasks: p.completedTasks.includes(id)
            ? p.completedTasks.filter((t) => t !== id)
            : [...p.completedTasks, id],
        })),
      setTasksCompleted: (ids, done) =>
        setProgress((p) => {
          const next = new Set(p.completedTasks);
          for (const id of ids) {
            if (done) next.add(id);
            else next.delete(id);
          }
          return { ...p, completedTasks: [...next] };
        }),
      playerLevel: progress.playerLevel,
      setPlayerLevel: (level) => setProgress((p) => ({ ...p, playerLevel: level })),
      hideoutLevels: progress.hideoutLevels,
      setHideoutLevel: (stationId, level) =>
        setProgress((p) => ({ ...p, hideoutLevels: { ...p.hideoutLevels, [stationId]: level } })),
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

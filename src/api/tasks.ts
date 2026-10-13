import { cached, fetchLocalized, type GameMode, type Translate } from "./client";
import { loadTraders, type Trader } from "./traders";

export interface Objective {
  id: string;
  description: string;
  type: string;
  count: number | null;
  optional: boolean;
  /** Map ids the objective is tied to; empty means any map. */
  maps: string[];
  /** Acceptable items for item objectives (any one of them). */
  items: string[];
  foundInRaid: boolean;
}

export interface TaskRequirement {
  taskId: string;
  /** e.g. ["complete"], or ["active"] when the prerequisite only needs to be started. */
  status: string[];
}

export interface Task {
  id: string;
  name: string;
  normalizedName: string;
  traderId: string;
  traderName: string;
  mapId: string | null;
  minPlayerLevel: number;
  kappaRequired: boolean;
  lightkeeperRequired: boolean;
  factionName: string;
  wikiLink: string | null;
  requirements: TaskRequirement[];
  objectives: Objective[];
}

// json.tarkov.dev payload shapes (only the fields we use).
interface RawObjective {
  id: string;
  description: string;
  type: string;
  count?: number | null;
  optional?: boolean;
  maps?: string[] | null;
  items?: string[] | null;
  foundInRaid?: boolean;
}

export interface RawTask {
  id: string;
  name: string;
  normalizedName: string;
  trader: string;
  map?: string | null;
  minPlayerLevel?: number;
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
  factionName?: string;
  wikiLink?: string | null;
  taskRequirements?: { task: string; status?: string[] }[];
  objectives?: RawObjective[];
}

export function buildTasks(
  rawTasks: Record<string, RawTask>,
  t: Translate,
  traders: Record<string, Trader>,
): Task[] {
  return Object.values(rawTasks).map((raw) => ({
    id: raw.id,
    name: t(raw.name),
    normalizedName: raw.normalizedName,
    traderId: raw.trader,
    traderName: traders[raw.trader]?.name ?? raw.trader,
    mapId: raw.map ?? null,
    minPlayerLevel: raw.minPlayerLevel ?? 0,
    kappaRequired: Boolean(raw.kappaRequired),
    lightkeeperRequired: Boolean(raw.lightkeeperRequired),
    factionName: raw.factionName ?? "Any",
    wikiLink: raw.wikiLink || null,
    requirements: (raw.taskRequirements ?? []).map((r) => ({
      taskId: r.task,
      status: r.status?.length ? r.status : ["complete"],
    })),
    objectives: (raw.objectives ?? []).map((o) => ({
      id: o.id,
      description: t(o.description),
      type: o.type,
      count: o.count ?? null,
      optional: Boolean(o.optional),
      maps: o.maps ?? [],
      items: o.items ?? [],
      foundInRaid: Boolean(o.foundInRaid),
    })),
  }));
}

export function loadTasks(gameMode: GameMode): Promise<Task[]> {
  return cached(`${gameMode}/tasks`, async () => {
    const [{ data, t }, traders] = await Promise.all([
      fetchLocalized<{ tasks: Record<string, RawTask> }>(`${gameMode}/tasks`),
      loadTraders(gameMode),
    ]);
    return buildTasks(data.tasks, t, traders);
  });
}

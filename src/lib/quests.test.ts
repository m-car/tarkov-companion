import { describe, expect, it } from "vitest";
import type { Objective, Task } from "../api/tasks";
import { prerequisiteChain, objectivesAnywhere, objectivesOnMap, questItemNeeds, questStatuses, type QuestProgress } from "./quests";

const obj = (o: Partial<Objective>): Objective => ({
  id: "o",
  description: "",
  type: "visit",
  count: null,
  optional: false,
  maps: [],
  items: [],
  foundInRaid: false,
  markerItem: null,
  zones: [],
  ...o,
});

const task = (t: Partial<Task> & { id: string }): Task => ({
  name: t.id,
  normalizedName: t.id,
  traderId: "prapor",
  traderName: "Prapor",
  mapId: null,
  minPlayerLevel: 0,
  kappaRequired: false,
  lightkeeperRequired: false,
  factionName: "Any",
  wikiLink: null,
  requirements: [],
  objectives: [],
  neededKeys: [],
  ...t,
});

const progress = (p: Partial<QuestProgress> = {}): QuestProgress => ({
  completed: new Set(),
  playerLevel: 1,
  faction: "USEC",
  ...p,
});

describe("questStatuses", () => {
  const first = task({ id: "first" });
  const second = task({ id: "second", requirements: [{ taskId: "first", status: ["complete"] }] });
  const parallel = task({ id: "parallel", requirements: [{ taskId: "first", status: ["active"] }] });
  const highLevel = task({ id: "high", minPlayerLevel: 20 });
  const bear = task({ id: "bear", factionName: "BEAR" });

  it("unlocks quests when prerequisites are done", () => {
    let s = questStatuses([first, second], progress());
    expect(s.get("first")).toBe("available");
    expect(s.get("second")).toBe("locked");
    s = questStatuses([first, second], progress({ completed: new Set(["first"]) }));
    expect(s.get("first")).toBe("done");
    expect(s.get("second")).toBe("available");
  });

  it("treats 'started' prerequisites as met once the prerequisite is available", () => {
    expect(questStatuses([first, parallel], progress()).get("parallel")).toBe("available");
  });

  it("respects player level and faction", () => {
    const s = questStatuses([highLevel, bear], progress());
    expect(s.get("high")).toBe("locked");
    expect(s.has("bear")).toBe(false);
  });
});

describe("questItemNeeds", () => {
  const tasks = [
    task({
      id: "a",
      name: "Sanitary",
      objectives: [
        obj({ type: "findItem", items: ["salewa"], count: 3 }),
        obj({ type: "giveItem", items: ["salewa"], count: 3, foundInRaid: true }),
      ],
    }),
    task({ id: "b", name: "Medic", objectives: [obj({ type: "giveItem", items: ["salewa"], count: 2 })] }),
    task({ id: "c", name: "Done", objectives: [obj({ type: "giveItem", items: ["gpu"], count: 1 })] }),
  ];

  it("sums hand-ins across unfinished quests, counting find+give once", () => {
    const needs = questItemNeeds(tasks, progress({ completed: new Set(["c"]) }));
    expect(needs.get("salewa")).toEqual({ count: 5, foundInRaid: true, quests: ["Sanitary", "Medic"] });
    expect(needs.has("gpu")).toBe(false);
  });
});

describe("objectives by map", () => {
  const t = task({
    id: "t",
    objectives: [
      obj({ id: "customs", maps: ["customs"] }),
      obj({ id: "woods", maps: ["woods"] }),
      obj({ id: "handin", type: "giveItem", items: ["x"] }),
      obj({ id: "kill", type: "shoot" }),
    ],
  });

  it("keeps only objectives for the chosen map", () => {
    expect(objectivesOnMap(t, "customs").map((o) => o.id)).toEqual(["customs"]);
  });

  it("uses the quest's map for objectives without one", () => {
    const onMap = task({ ...t, mapId: "woods" });
    expect(objectivesOnMap(onMap, "woods").map((o) => o.id)).toEqual(["woods", "kill"]);
  });

  it("lists map-free objectives for quests without a map", () => {
    expect(objectivesAnywhere(t).map((o) => o.id)).toEqual(["kill"]);
  });
});

describe("prerequisiteChain", () => {
  it("collects completed-status prerequisites recursively", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b", requirements: [{ taskId: "a", status: ["complete"] }] });
    const side = task({ id: "side" });
    const c = task({
      id: "c",
      requirements: [
        { taskId: "b", status: ["complete"] },
        { taskId: "side", status: ["active"] },
      ],
    });
    expect(prerequisiteChain(c, [a, b, c, side]).sort()).toEqual(["a", "b"]);
  });
});

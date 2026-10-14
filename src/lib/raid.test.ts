import { describe, expect, it } from "vitest";
import type { Item } from "../api/items";
import type { GameMap } from "../api/maps";
import type { Objective, Task } from "../api/tasks";
import type { QuestStatus } from "./quests";
import { extractsFor, keysForMap, planMaps, questKeysOnMap } from "./raid";

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

const map = (m: Partial<GameMap> & { id: string }): GameMap => ({
  name: m.id,
  normalizedName: m.id,
  raidDuration: null,
  players: null,
  extracts: [],
  transits: [],
  locks: [],
  bosses: [],
  nameId: null,
  lootLoose: [],
  lootContainers: [],
  ...m,
});

describe("planMaps", () => {
  const customs = map({ id: "customs", name: "Customs" });
  const woods = map({ id: "woods", name: "Woods" });
  const tasks = [
    task({
      id: "a",
      kappaRequired: true,
      neededKeys: [{ mapId: "customs", keys: ["dorm-key", "alt-key"] }],
      objectives: [
        obj({ maps: ["customs"] }),
        obj({ type: "plantItem", maps: ["customs"], items: ["flash"], count: 2 }),
        obj({ type: "mark", maps: ["customs"], markerItem: "ms2000" }),
      ],
    }),
    task({ id: "b", objectives: [obj({ maps: ["customs"] })] }),
    task({ id: "c", objectives: [obj({ maps: ["woods"] })] }),
    task({ id: "locked", objectives: [obj({ maps: ["woods"] }), obj({ maps: ["woods"] })] }),
  ];
  const statuses = new Map<string, QuestStatus>([
    ["a", "available"],
    ["b", "available"],
    ["c", "available"],
    ["locked", "locked"],
  ]);

  it("ranks maps by available quests and counts Kappa quests", () => {
    const plans = planMaps([woods, customs], tasks, statuses);
    expect(plans.map((p) => [p.map.id, p.quests.length, p.kappaCount])).toEqual([
      ["customs", 2, 1],
      ["woods", 1, 0],
    ]);
  });

  it("lists keys, items to plant and markers to bring", () => {
    const [customsPlan] = planMaps([customs], tasks, statuses);
    expect(customsPlan.bring).toEqual([
      { itemId: "dorm-key", count: 1, kind: "key", quests: ["a"] },
      { itemId: "flash", count: 2, kind: "plant", quests: ["a"] },
      { itemId: "ms2000", count: 1, kind: "marker", quests: ["a"] },
    ]);
  });
});

describe("extractsFor", () => {
  const m = map({
    id: "m",
    extracts: [
      { id: "1", position: null, name: "Crossroads", faction: "pmc", needsSwitch: false, transferItem: null },
      { id: "2", position: null, name: "Car", faction: "pmc", needsSwitch: false, transferItem: { itemId: "rub", count: 7000 } },
      { id: "3", position: null, name: "Scav only", faction: "scav", needsSwitch: false, transferItem: null },
      { id: "4", position: null, name: "Shared", faction: "shared", needsSwitch: true, transferItem: null },
    ],
  });

  it("filters by side and separates conditional extracts", () => {
    const pmc = extractsFor(m, "pmc");
    expect(pmc.open.map((e) => e.name)).toEqual(["Crossroads"]);
    expect(pmc.conditional.map((e) => e.name)).toEqual(["Car", "Shared"]);
    expect(extractsFor(m, "scav").open.map((e) => e.name)).toEqual(["Scav only"]);
  });
});

describe("keysForMap", () => {
  const key = (id: string, price: number) => ({ id, avg24hPrice: price }) as Item;
  const m = map({
    id: "m",
    locks: [
      { id: "l1", position: null, keyId: "cheap", lockType: "door", needsPower: false },
      { id: "l2", position: null, keyId: "pricey", lockType: "door", needsPower: false },
      { id: "l3", position: null, keyId: "mine", lockType: "container", needsPower: true },
      { id: "l4", position: null, keyId: "pricey", lockType: "door", needsPower: false },
    ],
  });
  const items = new Map([
    ["cheap", key("cheap", 10000)],
    ["pricey", key("pricey", 500000)],
    ["mine", key("mine", 1000)],
    ["quest", key("quest", 5000)],
  ]);

  it("sorts owned, then quest keys, then by price, grouping locks", () => {
    const questKeys = questKeysOnMap("m", [
      task({ id: "q", name: "Q", neededKeys: [{ mapId: "m", keys: ["quest"] }] }),
    ]);
    const keys = keysForMap(m, items, new Set(["mine"]), questKeys);
    expect(keys.map((k) => k.keyId)).toEqual(["mine", "quest", "pricey", "cheap"]);
    expect(keys.find((k) => k.keyId === "pricey")?.locks).toHaveLength(2);
    expect(keys.find((k) => k.keyId === "quest")?.quests).toEqual(["Q"]);
  });
});

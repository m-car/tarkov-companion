import { describe, expect, it } from "vitest";
import type { Item } from "../api/items";
import type { GameMap } from "../api/maps";
import { bestFinds, buildGeneralMarkers } from "./mapMarkers";

const p = (x: number, y: number, z: number) => ({ x, y, z });
const item = (id: string, shortName: string, avg24hPrice: number) => ({ id, shortName, name: shortName, avg24hPrice }) as Item;
const itemsById = new Map([
  ["roler", item("roler", "Roler", 500000)],
  ["btc", item("btc", "BTC", 300000)],
  ["bolts", item("bolts", "Bolts", 9000)],
  ["ledx", item("ledx", "LEDX", 900000)],
  ["key1", item("key1", "Dorm 314", 100000)],
]);
const loot = {
  fetchedAt: "x",
  containers: { safe: { expectedItems: 3, items: { roler: 0.04, btc: 0.02, bolts: 0.3, ledx: 0.001 } } },
};

describe("bestFinds", () => {
  it("ranks by value and skips items too rare to matter", () => {
    expect(bestFinds(loot, "safe", itemsById)).toEqual(["Roler 4.0%", "BTC 2.0%", "Bolts 30%"]);
  });
});

describe("buildGeneralMarkers", () => {
  const map: GameMap = {
    id: "m", name: "M", normalizedName: "m", nameId: null, raidDuration: null, players: null,
    transits: [],
    extracts: [
      { id: "e1", name: "Gate", faction: "pmc", needsSwitch: false, transferItem: null, position: p(0, 0, 0) },
      { id: "e2", name: "Scav exit", faction: "scav", needsSwitch: false, transferItem: null, position: p(1, 0, 1) },
    ],
    locks: [{ id: "l", keyId: "key1", lockType: "door", needsPower: true, position: p(2, 0, 2) }],
    lootLoose: [{ position: p(3, 0, 3), items: ["bolts", "ledx"] }],
    lootContainers: [
      { typeId: "safe", typeName: "Safe", position: p(4, 0, 4) },
      { typeId: "safe", typeName: "Safe", position: p(5, 0, 5) },
      { typeId: "medcase", typeName: "Medcase", position: p(6, 0, 6) },
    ],
    bosses: [{ name: "Reshala", chance: 0.38, locations: ["Dorms"], spots: [{ name: "Dorms", chance: 0.5, positions: [p(7, 0, 7)] }] }],
  };
  const g = buildGeneralMarkers({ map, config: undefined, loot, itemsById, ownedKeys: new Set(["key1"]), side: "pmc" });

  it("counts every layer, with extracts for your side only", () => {
    expect(g.counts).toEqual({ container: 3, lock: 1, loose: 1, boss: 1, extract: 1 });
  });

  it("groups container types by category, most common first", () => {
    expect(g.containerTypes).toEqual([
      { typeId: "safe", typeName: "Safe", category: "valuables", count: 2 },
      { typeId: "medcase", typeName: "Medcase", category: "medical", count: 1 },
    ]);
  });

  it("describes markers for their popups", () => {
    const safe = g.markers.find((m) => m.typeId === "safe")!;
    expect(safe.details).toContain("Best finds: Roler 4.0%, BTC 2.0%, Bolts 30%");
    const lock = g.markers.find((m) => m.layer === "lock")!;
    expect(lock.title).toBe("Locked door: Dorm 314");
    expect(lock.details).toEqual(expect.arrayContaining(["You have this key", "Needs power"]));
    expect(g.markers.find((m) => m.layer === "loose")!.details[1]).toBe("Can spawn: LEDX, Bolts");
    expect(g.markers.find((m) => m.layer === "boss")!.title).toBe("Reshala (38% spawn)");
  });
});

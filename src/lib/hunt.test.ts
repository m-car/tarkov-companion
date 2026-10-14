import { describe, expect, it } from "vitest";
import type { GameMap } from "../api/maps";
import { huntAllKeys, huntItem, huntKeys, type ContainerLoot } from "./hunt";
import { areaName, floorName, nearbyLock, type MapConfig } from "./mapGeo";

// Trimmed from tarkov.dev's Shoreline config.
const config: MapConfig = {
  bounds: [[504, -415], [-1056, 618]],
  heightRange: [-1000, -1],
  layers: [
    { name: "2nd Floor", extents: [{ height: [-1, 2] }] },
    { name: "3rd Floor", extents: [{ height: [2, 1000] }] },
    {
      name: "Underground",
      extents: [{ height: [-1000, -5], bounds: [[[-137, -68], [-237, -104], "west wing"]] }],
    },
  ],
  labels: [
    { position: [-258.2, -71.2], text: "Resort", top: -2, bottom: -4 },
    { position: [-215.8, 178.4], text: "Power Station", top: -2, bottom: -4 },
    { position: [-171, -83], text: "West Wing", top: 100, bottom: -100 },
    { position: [-329, -83], text: "East Wing", top: 100, bottom: -100 },
  ],
};

const p = (x: number, y: number, z: number) => ({ x, y, z });

describe("map geography", () => {
  it("names the nearest landmark", () => {
    expect(areaName(p(-330, 0, -80), config)).toBe("East Wing");
    expect(areaName(p(-210, -10, 170), config)).toBe("Power Station");
  });

  it("gives floors inside buildings only", () => {
    expect(floorName(p(-330, 3, -80), config)).toBe("3rd Floor");
    expect(floorName(p(-330, 0, -80), config)).toBe("2nd Floor");
    expect(floorName(p(-330, -3, -80), config)).toBe("Ground floor");
    expect(floorName(p(-180, -8, -85), config)).toBe("Underground");
    // Outdoors: terrain height says nothing about floors.
    expect(floorName(p(-210, 5, 170), config)).toBeNull();
  });

  it("finds a door right next to a spot on the same floor", () => {
    const locks = [
      { id: "near", position: p(-330, 3, -77) },
      { id: "below", position: p(-330, -3, -80) },
    ];
    expect(nearbyLock(p(-330, 3, -80), locks)?.id).toBe("near");
    expect(nearbyLock(p(-300, 3, -80), locks)).toBeNull();
  });
});

describe("huntItem", () => {
  const map: GameMap = {
    id: "shoreline",
    name: "Shoreline",
    normalizedName: "shoreline",
    nameId: "Shoreline",
    raidDuration: 45,
    players: null,
    extracts: [],
    transits: [],
    bosses: [],
    locks: [
      { id: "l306", position: p(-330, 3, -77), keyId: "key306", lockType: "door", needsPower: false },
      { id: "chest", position: p(-210, -10, 171), keyId: "chestkey", lockType: "container", needsPower: false },
    ],
    lootLoose: [
      { position: p(-330, 3, -80), items: ["ledx", "gpu"] },
      { position: p(-331, 3, -79), items: ["ledx"] },
      { position: p(-210, -10, 170), items: ["ledx"] },
      { position: p(-100, 0, 0), items: ["gpu"] },
    ],
    lootContainers: [
      { typeId: "medcase", typeName: "Medcase", position: p(-330, 0, -85) },
      { typeId: "medcase", typeName: "Medcase", position: p(-172, 0, -84) },
      { typeId: "crate", typeName: "Tech crate", position: p(-215, -10, 178) },
    ],
  };
  const loot: ContainerLoot = {
    fetchedAt: "2026-10-14",
    containers: {
      medcase: { expectedItems: 2, items: { ledx: 0.002 } },
      crate: { expectedItems: 4, items: { ledx: 0.0017, gpu: 0.01 } },
    },
  };

  it("groups loose spawns by area, floor and likely room", () => {
    const r = huntItem("ledx", map, config, loot);
    expect(r.loose).toHaveLength(3);
    expect(r.looseGroups.map((g) => [g.area, g.floor, g.lock?.keyId ?? null, g.spots.length])).toEqual([
      ["East Wing", "3rd Floor", "key306", 2],
      ["Power Station", null, null, 1],
    ]);
  });

  it("ignores container locks when guessing the room", () => {
    const r = huntItem("ledx", map, config, loot);
    expect(r.looseGroups[1].lock).toBeNull();
  });

  it("ranks containers by expected finds across the map", () => {
    const r = huntItem("ledx", map, config, loot);
    expect(r.containers.map((c) => [c.typeName, c.positions.length])).toEqual([
      ["Medcase", 2],
      ["Tech crate", 1],
    ]);
    expect(r.containers[0].areas).toEqual([
      { area: "East Wing", count: 1 },
      { area: "West Wing", count: 1 },
    ]);
  });

  it("works without container data", () => {
    expect(huntItem("ledx", map, config, null).containers).toEqual([]);
  });

  it("finds every key spawn and the containers likeliest to hold any key", () => {
    const keyMap: GameMap = {
      ...map,
      lootLoose: [
        ...map.lootLoose,
        { position: p(-330, 3, -81), items: ["keyA", "keyB"] },
        { position: p(-210, -10, 172), items: ["keyB", "ledx"] },
      ],
    };
    const keyLoot: ContainerLoot = {
      fetchedAt: "x",
      containers: {
        medcase: { expectedItems: 2, items: { keyA: 0.1, keyB: 0.1, ledx: 0.5 } },
        crate: { expectedItems: 4, items: { gpu: 0.01 } },
      },
    };
    const r = huntAllKeys(keyMap, config, keyLoot, (id) => id.startsWith("key"));
    expect(r.spots.map((s) => s.keyIds)).toEqual([["keyA", "keyB"], ["keyB"]]);
    expect(r.groups.map((g) => [g.area, g.floor, g.lock?.keyId ?? null, g.keyIds])).toEqual([
      ["East Wing", "3rd Floor", "key306", ["keyA", "keyB"]],
      ["Power Station", null, null, ["keyB"]],
    ]);
    expect(r.containers.map((c) => [c.typeName, Math.round(c.chance * 100) / 100])).toEqual([["Medcase", 0.19]]);
  });

  it("lists keys for rooms hunt items are likely behind", () => {
    const results = ["ledx", "gpu"].map((id) => huntItem(id, map, config, loot));
    expect(huntKeys(results)).toEqual([{ keyId: "key306", itemIds: ["ledx", "gpu"], spots: 3 }]);
  });
});

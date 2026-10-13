import { describe, expect, it } from "vitest";
import type { Item } from "../api/items";
import type { Station } from "../api/hideout";
import { hideoutItemNeeds, missingStationRequirements } from "./hideout";
import { itemVerdict, type VerdictContext } from "./verdict";

const item = (o: Partial<Item> = {}): Item => ({
  id: "x",
  name: "Thing",
  shortName: "Thing",
  iconLink: null,
  wikiLink: null,
  link: null,
  width: 1,
  height: 1,
  basePrice: 0,
  avg24hPrice: null,
  low24hPrice: null,
  lastLowPrice: null,
  changeLast48hPercent: null,
  sellFor: [],
  buyFor: [],
  ...o,
});

const fleaSell = (price: number) => [
  { price, priceRUB: price, currency: "RUB", vendor: { name: "Flea Market", normalizedName: "flea-market" } },
];

const ctx = (o: Partial<VerdictContext> = {}): VerdictContext => ({
  questNeeds: new Map(),
  hideoutNeeds: new Map(),
  starred: new Set(),
  perSlotThreshold: 20000,
  ...o,
});

describe("itemVerdict", () => {
  it("puts quest needs first and lists every reason", () => {
    const v = itemVerdict(
      item({ sellFor: fleaSell(50000) }),
      ctx({
        questNeeds: new Map([["x", { count: 2, foundInRaid: true, quests: ["Q1", "Q2"] }]]),
        hideoutNeeds: new Map([["x", { count: 1, upgrades: ["Medstation 2"] }]]),
      }),
    );
    expect(v.kind).toBe("quest");
    expect(v.reasons.map((r) => r.kind)).toEqual(["quest", "hideout", "keep"]);
    expect(v.reasons[0].text).toBe("2× for Q1 +1 more (found in raid)");
  });

  it("keeps valuable items and sells cheap ones", () => {
    expect(itemVerdict(item({ sellFor: fleaSell(30000) }), ctx()).kind).toBe("keep");
    expect(itemVerdict(item({ sellFor: fleaSell(30000), width: 2 }), ctx()).kind).toBe("sell");
  });

  it("honours the watchlist", () => {
    expect(itemVerdict(item(), ctx({ starred: new Set(["x"]) })).kind).toBe("starred");
  });
});

describe("hideout", () => {
  const stations: Station[] = [
    {
      id: "med",
      name: "Medstation",
      normalizedName: "medstation",
      levels: [
        { level: 1, items: [{ itemId: "salewa", count: 1 }], stationRequirements: [] },
        {
          level: 2,
          items: [
            { itemId: "salewa", count: 2 },
            { itemId: "5449016a4bdc2d6f028b456f", count: 50000 },
          ],
          stationRequirements: [{ stationId: "vents", level: 1 }],
        },
      ],
    },
    { id: "vents", name: "Vents", normalizedName: "vents", levels: [] },
  ];

  it("sums items for upgrades above the current level, ignoring money", () => {
    expect(hideoutItemNeeds(stations, { med: 1 }).get("salewa")).toEqual({
      count: 2,
      upgrades: ["Medstation 2"],
    });
    expect(hideoutItemNeeds(stations, {}).get("salewa")?.count).toBe(3);
    expect(hideoutItemNeeds(stations, {}).has("5449016a4bdc2d6f028b456f")).toBe(false);
  });

  it("reports missing station requirements", () => {
    expect(missingStationRequirements(stations[0], 2, stations, { med: 1 })).toEqual(["Vents 1"]);
    expect(missingStationRequirements(stations[0], 2, stations, { med: 1, vents: 1 })).toEqual([]);
  });
});

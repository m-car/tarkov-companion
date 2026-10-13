import { describe, expect, it } from "vitest";
import { buildItems, searchItems, type RawItem, type RawTrader } from "./items";

const rawItems: Record<string, RawItem> = {
  ledx: {
    id: "ledx",
    name: "ledx Name",
    shortName: "ledx ShortName",
    normalizedName: "ledx-skin-transilluminator",
    width: 1,
    height: 1,
    avg24hPrice: 950000,
    lastLowPrice: 900000,
    changeLast48hPercent: -1.5,
    sellToTrader: [{ trader: "t1", price: 600000, priceRUB: 600000, currency: "RUB" }],
    buyFromTrader: null,
  },
  tag: {
    id: "tag",
    name: "tag Name",
    shortName: "tag ShortName",
    normalizedName: "dogtag",
  },
};
const itemLocale = {
  "ledx Name": "LEDX Skin Transilluminator",
  "ledx ShortName": "LEDX",
  "tag Name": "Dogtag",
};
const traders: Record<string, RawTrader> = {
  t1: { id: "t1", name: "t1 Nickname", normalizedName: "therapist" },
};
const traderLocale = { "t1 Nickname": "Therapist" };

describe("buildItems", () => {
  const items = buildItems(rawItems, itemLocale, traders, traderLocale);
  const ledx = items.find((i) => i.id === "ledx")!;
  const tag = items.find((i) => i.id === "tag")!;

  it("translates names and trader names", () => {
    expect(ledx.name).toBe("LEDX Skin Transilluminator");
    expect(ledx.shortName).toBe("LEDX");
    expect(ledx.sellFor[1].vendor).toEqual({ name: "Therapist", normalizedName: "therapist" });
  });

  it("falls back to the key when a translation is missing", () => {
    expect(tag.shortName).toBe("tag ShortName");
  });

  it("uses lastLowPrice for flea sell and avg24hPrice for flea buy", () => {
    expect(ledx.sellFor[0]).toMatchObject({ priceRUB: 900000, vendor: { normalizedName: "flea-market" } });
    expect(ledx.buyFor).toHaveLength(1);
    expect(ledx.buyFor[0].priceRUB).toBe(950000);
  });

  it("fills defaults for items with no prices or size", () => {
    expect(tag.sellFor).toEqual([]);
    expect(tag.buyFor).toEqual([]);
    expect(tag.width).toBe(1);
    expect(tag.link).toBe("https://tarkov.dev/item/dogtag");
  });
});

describe("searchItems", () => {
  const items = buildItems(rawItems, itemLocale, traders, traderLocale);

  it("matches name or short name, case-insensitively", () => {
    expect(searchItems(items, "ledx").map((i) => i.id)).toEqual(["ledx"]);
    expect(searchItems(items, "DOG").map((i) => i.id)).toEqual(["tag"]);
  });

  it("requires every word to match", () => {
    expect(searchItems(items, "skin ledx").map((i) => i.id)).toEqual(["ledx"]);
    expect(searchItems(items, "skin dog")).toEqual([]);
  });
});

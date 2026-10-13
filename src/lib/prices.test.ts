import { describe, expect, it } from "vitest";
import type { Item, ItemPrice } from "../api/items";
import {
  bestSellValue,
  bestTraderSell,
  cheapestBuy,
  fleaSellPrice,
  formatPrice,
  sortItems,
  valuePerSlot,
} from "./prices";

const price = (vendor: string, priceRUB: number, currency = "RUB", price = priceRUB): ItemPrice => ({
  price,
  priceRUB,
  currency,
  vendor: { name: vendor, normalizedName: vendor.toLowerCase().replace(/\s+/g, "-") },
});

const item = (overrides: Partial<Item> = {}): Item => ({
  id: "1",
  name: "Test item",
  shortName: "Test",
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
  ...overrides,
});

describe("prices", () => {
  const gpu = item({
    name: "Graphics card",
    width: 2,
    height: 1,
    sellFor: [price("Flea Market", 300000), price("Therapist", 150000), price("Mechanic", 200000)],
    buyFor: [price("Flea Market", 310000), price("Peacekeeper", 2400 * 140, "USD", 2400)],
  });

  it("separates flea and trader prices", () => {
    expect(fleaSellPrice(gpu)).toBe(300000);
    expect(bestTraderSell(gpu)?.vendor.name).toBe("Mechanic");
  });

  it("finds the cheapest buy across currencies", () => {
    expect(cheapestBuy(gpu)?.vendor.name).toBe("Flea Market");
  });

  it("computes value per slot from the best sell option", () => {
    expect(bestSellValue(gpu)).toBe(300000);
    expect(valuePerSlot(gpu)).toBe(150000);
  });

  it("handles items with no prices", () => {
    const empty = item();
    expect(fleaSellPrice(empty)).toBeNull();
    expect(bestTraderSell(empty)).toBeNull();
    expect(valuePerSlot(empty)).toBe(0);
  });

  it("sorts by value per slot", () => {
    const small = item({ id: "2", name: "Small", sellFor: [price("Therapist", 200000)] });
    expect(sortItems([gpu, small], "perSlot").map((i) => i.name)).toEqual(["Small", "Graphics card"]);
    expect(sortItems([gpu, small], "value").map((i) => i.name)).toEqual(["Graphics card", "Small"]);
  });

  it("formats currencies", () => {
    expect(formatPrice(1234567)).toBe("1,234,567 ₽");
    expect(formatPrice(250, "USD")).toBe("$250");
  });
});

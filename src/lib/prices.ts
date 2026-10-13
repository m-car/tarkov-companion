import type { Item, ItemPrice } from "../api/items";

const FLEA = "flea-market";

export function fleaSellPrice(item: Item): number | null {
  return item.sellFor.find((p) => p.vendor.normalizedName === FLEA)?.priceRUB ?? null;
}

/** Highest-paying trader (excludes the flea market). */
export function bestTraderSell(item: Item): ItemPrice | null {
  let best: ItemPrice | null = null;
  for (const p of item.sellFor) {
    if (p.vendor.normalizedName === FLEA) continue;
    if (!best || p.priceRUB > best.priceRUB) best = p;
  }
  return best;
}

/** Cheapest place to buy, flea included. */
export function cheapestBuy(item: Item): ItemPrice | null {
  let best: ItemPrice | null = null;
  for (const p of item.buyFor) {
    if (!best || p.priceRUB < best.priceRUB) best = p;
  }
  return best;
}

export function slots(item: Item): number {
  return Math.max(1, item.width * item.height);
}

/** The best value you can get for the item, wherever you sell it. */
export function bestSellValue(item: Item): number {
  const flea = fleaSellPrice(item) ?? 0;
  const trader = bestTraderSell(item)?.priceRUB ?? 0;
  return Math.max(flea, trader);
}

export function valuePerSlot(item: Item): number {
  return Math.round(bestSellValue(item) / slots(item));
}

const SYMBOLS: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };

export function formatPrice(amount: number, currency = "RUB"): string {
  const n = Math.round(amount).toLocaleString("en-US");
  const symbol = SYMBOLS[currency] ?? currency;
  return currency === "RUB" ? `${n} ${symbol}` : `${symbol}${n}`;
}

export type SortKey = "perSlot" | "value" | "name";

export function sortItems(items: Item[], key: SortKey): Item[] {
  const sorted = [...items];
  switch (key) {
    case "perSlot":
      return sorted.sort((a, b) => valuePerSlot(b) - valuePerSlot(a));
    case "value":
      return sorted.sort((a, b) => bestSellValue(b) - bestSellValue(a));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

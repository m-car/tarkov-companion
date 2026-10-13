import { fetchJson, type GameMode, type Locale } from "./client";

export interface Vendor {
  name: string;
  normalizedName: string;
}

export interface ItemPrice {
  price: number;
  priceRUB: number;
  currency: string;
  vendor: Vendor;
}

export interface Item {
  id: string;
  name: string;
  shortName: string;
  iconLink: string | null;
  wikiLink: string | null;
  link: string | null;
  width: number;
  height: number;
  basePrice: number;
  avg24hPrice: number | null;
  low24hPrice: number | null;
  lastLowPrice: number | null;
  changeLast48hPercent: number | null;
  sellFor: ItemPrice[];
  buyFor: ItemPrice[];
}

// Shapes of the json.tarkov.dev payloads (only the fields we use).
interface TraderOffer {
  trader: string;
  price: number;
  priceRUB: number;
  currency: string;
}

export interface RawItem {
  id: string;
  name: string;
  shortName: string;
  normalizedName: string;
  iconLink?: string | null;
  wikiLink?: string | null;
  link?: string | null;
  width?: number;
  height?: number;
  basePrice?: number;
  avg24hPrice?: number | null;
  low24hPrice?: number | null;
  lastLowPrice?: number | null;
  changeLast48hPercent?: number | null;
  types?: string[];
  sellToTrader?: TraderOffer[] | null;
  buyFromTrader?: TraderOffer[] | null;
}

export interface RawTrader {
  id: string;
  name: string;
  normalizedName: string;
}

const FLEA: Vendor = { name: "Flea Market", normalizedName: "flea-market" };

const t = (locale: Locale, key: string) => locale[key] ?? key;

/** Turn raw JSON API data into the flat items the UI works with. */
export function buildItems(
  rawItems: Record<string, RawItem>,
  itemLocale: Locale,
  traders: Record<string, RawTrader>,
  traderLocale: Locale,
): Item[] {
  const vendor = (traderId: string): Vendor => {
    const trader = traders[traderId];
    return trader
      ? { name: t(traderLocale, trader.name), normalizedName: trader.normalizedName }
      : { name: traderId, normalizedName: traderId };
  };
  const offers = (list: TraderOffer[] | null | undefined): ItemPrice[] =>
    (list ?? []).map((o) => ({
      price: o.price,
      priceRUB: o.priceRUB,
      currency: o.currency,
      vendor: vendor(o.trader),
    }));
  const fleaOffer = (price: number | null | undefined): ItemPrice[] =>
    price ? [{ price, priceRUB: price, currency: "RUB", vendor: FLEA }] : [];

  return Object.values(rawItems).map((raw) => ({
    id: raw.id,
    name: t(itemLocale, raw.name),
    shortName: t(itemLocale, raw.shortName),
    iconLink: raw.iconLink ?? null,
    wikiLink: raw.wikiLink ?? null,
    link: raw.link ?? `https://tarkov.dev/item/${raw.normalizedName}`,
    width: raw.width || 1,
    height: raw.height || 1,
    basePrice: raw.basePrice ?? 0,
    avg24hPrice: raw.avg24hPrice ?? null,
    low24hPrice: raw.low24hPrice ?? null,
    lastLowPrice: raw.lastLowPrice ?? null,
    changeLast48hPercent: raw.changeLast48hPercent ?? null,
    // Same rules the tarkov.dev site uses for flea sell/buy prices.
    sellFor: [...fleaOffer(raw.lastLowPrice), ...offers(raw.sellToTrader)],
    buyFor: [...fleaOffer(raw.avg24hPrice ?? raw.lastLowPrice), ...offers(raw.buyFromTrader)],
  }));
}

const cache = new Map<GameMode, Promise<Item[]>>();

/** Loads every item for a game mode once, then serves it from memory. */
export function loadItems(gameMode: GameMode): Promise<Item[]> {
  let pending = cache.get(gameMode);
  if (!pending) {
    pending = Promise.all([
      fetchJson<{ items: Record<string, RawItem> }>(`${gameMode}/items`),
      fetchJson<Locale>(`${gameMode}/items_en`),
      fetchJson<Record<string, RawTrader>>(`${gameMode}/traders`),
      fetchJson<Locale>(`${gameMode}/traders_en`),
    ]).then(([itemData, itemLocale, traders, traderLocale]) =>
      buildItems(itemData.items, itemLocale, traders, traderLocale),
    );
    // Don't cache failures, so the next search retries.
    pending.catch(() => cache.delete(gameMode));
    cache.set(gameMode, pending);
  }
  return pending;
}

/** Items whose name or short name contains every word of the query. */
export function searchItems(items: Item[], query: string, limit = 50): Item[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const results: Item[] = [];
  for (const item of items) {
    const haystack = `${item.name} ${item.shortName}`.toLowerCase();
    if (words.every((w) => haystack.includes(w))) {
      results.push(item);
      if (results.length >= limit) break;
    }
  }
  return results;
}

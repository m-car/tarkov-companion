import { gql, type GameMode } from "./client";

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

const SEARCH_ITEMS = /* GraphQL */ `
  query SearchItems($name: String!, $gameMode: GameMode, $limit: Int) {
    items(name: $name, gameMode: $gameMode, limit: $limit) {
      id
      name
      shortName
      iconLink
      wikiLink
      link
      width
      height
      basePrice
      avg24hPrice
      low24hPrice
      lastLowPrice
      changeLast48hPercent
      sellFor { price priceRUB currency vendor { name normalizedName } }
      buyFor { price priceRUB currency vendor { name normalizedName } }
    }
  }
`;

export async function searchItems(
  name: string,
  gameMode: GameMode,
  signal?: AbortSignal,
): Promise<Item[]> {
  const data = await gql<{ items: Item[] }>(
    SEARCH_ITEMS,
    { name, gameMode, limit: 30 },
    signal,
  );
  return data.items;
}

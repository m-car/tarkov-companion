// tarkov.dev's GraphQL API has been down since mid-2026; the tarkov.dev site
// itself now reads from this static JSON API, which serves plain GET requests.
const API_URL = "https://json.tarkov.dev";

export type GameMode = "regular" | "pve";

/** Translation tables map keys like "<id> Name" to display text. */
export type Locale = Record<string, string>;
export type Translate = (key: string) => string;

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/${path}`, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error(
      "Couldn't reach json.tarkov.dev. Check your connection, or whether an ad blocker or privacy extension is blocking it.",
    );
  }
  if (!res.ok) {
    throw new Error(`tarkov.dev request failed (${res.status})`);
  }
  const json = (await res.json()) as { data?: T };
  if (!json.data) {
    throw new Error("tarkov.dev returned no data");
  }
  return json.data;
}

export const translator =
  (locale: Locale): Translate =>
  (key) =>
    locale[key] ?? key;

/** Fetches an endpoint together with its English translation table. */
export async function fetchLocalized<T>(path: string): Promise<{ data: T; t: Translate }> {
  const [data, locale] = await Promise.all([
    fetchJson<T>(path),
    fetchJson<Locale>(`${path}_en`),
  ]);
  return { data, t: translator(locale) };
}

const cache = new Map<string, Promise<unknown>>();

/** Runs a loader once per key and shares the result; failures are retried next time. */
export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let pending = cache.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = load();
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

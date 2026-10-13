const API_URL = "https://api.tarkov.dev/graphql";

export type GameMode = "regular" | "pve";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

// Collapse whitespace so queries fit comfortably in a GET URL.
const compact = (query: string) => query.replace(/\s+/g, " ").trim();

// A plain GET is a "simple" cross-origin request, so the browser sends it
// without a CORS preflight. Fall back to POST if GET fails outright.
async function send(query: string, variables: Record<string, unknown>, signal?: AbortSignal) {
  const params = new URLSearchParams({
    query: compact(query),
    variables: JSON.stringify(variables),
  });
  try {
    return await fetch(`${API_URL}?${params}`, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: compact(query), variables }),
      signal,
    });
  }
}

export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await send(query, variables, signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error(
      "Couldn't reach api.tarkov.dev. Check your connection, or whether an ad blocker or privacy extension is blocking it.",
    );
  }
  if (!res.ok) {
    throw new Error(`tarkov.dev request failed (${res.status})`);
  }
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length && !json.data) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("tarkov.dev returned no data");
  }
  return json.data;
}

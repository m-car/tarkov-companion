// Refreshes the static data the app ships with:
//  - public/loot/<map>.json: chance of each item per loot container type, from the
//    SPT server's staticLoot (community offline-Tarkov project; may lag live patches).
//  - src/data/mapConfigs.json: map image, coordinate and floor setup from tarkov.dev's
//    open-source site (MIT, https://github.com/the-hideout/tarkov-dev).
// Run with `npm run update-data`. Failures keep the previously committed files.
import { mkdir, writeFile } from "node:fs/promises";

const SPT_BASE =
  "https://raw.githubusercontent.com/SP-Tushonka/server-csharp/refs/heads/5.0x-dev/Libraries/SPTushonka.Server.Assets/SPT_Data/database/locations";
// SPT location folders (tarkov.dev's map `nameId`, lowercased).
const SPT_MAPS = [
  "bigmap", "factory4_day", "factory4_night", "interchange", "laboratory", "labyrinth",
  "lighthouse", "rezervbase", "sandbox", "sandbox_high", "shoreline", "tarkovstreets", "woods",
];
const MAP_CONFIGS_URL =
  "https://raw.githubusercontent.com/the-hideout/tarkov-dev/main/src/data/maps.json";

// Ignore odds below this; they're too small to plan around.
const MIN_CHANCE = 0.0002;

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** Chance an item shows up at least once in one container, from SPT's relative weights. */
export function containerOdds(container) {
  const counts = container.itemcountDistribution ?? [];
  const countWeight = counts.reduce((s, c) => s + c.relativeProbability, 0);
  const expected = countWeight
    ? counts.reduce((s, c) => s + c.count * c.relativeProbability, 0) / countWeight
    : 1;
  const items = container.itemDistribution ?? [];
  const total = items.reduce((s, i) => s + i.relativeProbability, 0);
  const odds = {};
  for (const i of items) {
    const p = total ? i.relativeProbability / total : 0;
    const chance = 1 - Math.pow(1 - p, expected);
    if (chance >= MIN_CHANCE) odds[i.tpl] = Math.round(chance * 10000) / 10000;
  }
  return { expectedItems: Math.round(expected * 10) / 10, items: odds };
}

async function updateLoot() {
  await mkdir("public/loot", { recursive: true });
  const fetchedAt = new Date().toISOString().slice(0, 10);
  let ok = 0;
  for (const map of SPT_MAPS) {
    try {
      const staticLoot = await getJson(`${SPT_BASE}/${map}/staticLoot.json`);
      const containers = {};
      for (const [id, container] of Object.entries(staticLoot)) {
        containers[id] = containerOdds(container);
      }
      await writeFile(
        `public/loot/${map}.json`,
        JSON.stringify({ source: "SPT staticLoot", fetchedAt, containers }),
      );
      ok++;
      console.log(`loot: ${map} (${Object.keys(containers).length} container types)`);
    } catch (err) {
      console.warn(`loot: skipped ${map}: ${err.message}`);
    }
  }
  return ok;
}

const KEEP = [
  "key", "svgPath", "svgLayer", "svgBounds", "bounds", "transform", "coordinateRotation",
  "minZoom", "maxZoom", "tilePath", "tileSize", "heightRange", "layers", "labels",
];

async function updateMapConfigs() {
  const maps = await getJson(MAP_CONFIGS_URL);
  const configs = {};
  for (const group of maps) {
    const interactive = group.maps?.find((m) => m.projection === "interactive");
    if (!interactive) continue;
    const config = Object.fromEntries(
      KEEP.filter((k) => interactive[k] !== undefined).map((k) => [k, interactive[k]]),
    );
    configs[group.normalizedName] = config;
    // Variants like Night Factory and Ground Zero 21+ share the base map's setup.
    for (const alt of interactive.altMaps ?? []) configs[alt] = config;
  }
  await writeFile("src/data/mapConfigs.json", JSON.stringify(configs, null, 1) + "\n");
  console.log(`map configs: ${Object.keys(configs).join(", ")}`);
}

const [loot] = await Promise.allSettled([updateLoot(), updateMapConfigs().catch((e) => {
  console.warn(`map configs: skipped: ${e.message}`);
})]);
if (loot.status === "fulfilled" && loot.value === 0) console.warn("loot: no maps updated");

import type { Item } from "../api/items";
import type { GameMap, Position } from "../api/maps";
import { categoryColor, containerCategory, type ContainerCategory } from "./containers";
import type { ContainerLoot } from "./hunt";
import { areaName, floorName, type MapConfig } from "./mapGeo";
import { extractsFor, type Side } from "./raid";

/** General, always-available marker layers (independent of the raid plan). */
export type GeneralLayer = "container" | "lock" | "loose" | "boss" | "extract";

export interface MapMarker {
  position: Position;
  layer: GeneralLayer;
  title: string;
  /** Extra popup lines. */
  details: string[];
  color: string;
  radius: number;
  /** Containers only. */
  typeId?: string;
  category?: ContainerCategory;
}

export interface ContainerType {
  typeId: string;
  typeName: string;
  category: ContainerCategory;
  count: number;
}

const price = (item: Item | undefined) => item?.avg24hPrice ?? item?.lastLowPrice ?? item?.basePrice ?? 0;

const pctText = (chance: number) =>
  chance >= 0.1 ? `${Math.round(chance * 100)}%` : `${(chance * 100).toFixed(1)}%`;

/** Most valuable items a container type can hold, ignoring ones too rare to matter. */
export function bestFinds(
  loot: ContainerLoot | null,
  typeId: string,
  itemsById: Map<string, Item>,
  count = 3,
  minChance = 0.003,
): string[] {
  const odds = loot?.containers[typeId]?.items ?? {};
  return Object.entries(odds)
    .filter(([id, chance]) => chance >= minChance && itemsById.has(id))
    .sort(([a], [b]) => price(itemsById.get(b)) - price(itemsById.get(a)))
    .slice(0, count)
    .map(([id, chance]) => `${itemsById.get(id)!.shortName} ${pctText(chance)}`);
}

export interface GeneralMarkers {
  markers: MapMarker[];
  containerTypes: ContainerType[];
  counts: Record<GeneralLayer, number>;
}

export function buildGeneralMarkers({
  map,
  config,
  loot,
  itemsById,
  ownedKeys,
  side,
}: {
  map: GameMap;
  config: MapConfig | undefined;
  loot: ContainerLoot | null;
  itemsById: Map<string, Item>;
  ownedKeys: ReadonlySet<string>;
  side: Side;
}): GeneralMarkers {
  const where = (p: Position) => [areaName(p, config), floorName(p, config)].filter(Boolean).join(" · ");
  const markers: MapMarker[] = [];

  // Containers, with each type's best finds computed once.
  const types = new Map<string, ContainerType>();
  const finds = new Map<string, string[]>();
  for (const c of map.lootContainers) {
    let type = types.get(c.typeId);
    if (!type) {
      type = { typeId: c.typeId, typeName: c.typeName, category: containerCategory(c.typeName), count: 0 };
      types.set(c.typeId, type);
      finds.set(c.typeId, bestFinds(loot, c.typeId, itemsById));
    }
    type.count++;
    const best = finds.get(c.typeId)!;
    markers.push({
      position: c.position,
      layer: "container",
      title: c.typeName,
      details: [where(c.position), ...(best.length ? [`Best finds: ${best.join(", ")}`] : [])],
      color: categoryColor(type.category),
      radius: 4,
      typeId: c.typeId,
      category: type.category,
    });
  }

  for (const lock of map.locks) {
    if (!lock.position) continue;
    const key = itemsById.get(lock.keyId);
    const owned = ownedKeys.has(lock.keyId);
    const kind = lock.lockType === "door" ? "Locked door" : lock.lockType === "trunk" ? "Locked trunk" : "Locked container";
    markers.push({
      position: lock.position,
      layer: "lock",
      title: `${kind}: ${key?.name ?? "unknown key"}`,
      details: [
        where(lock.position),
        ...(owned ? ["You have this key"] : []),
        ...(lock.needsPower ? ["Needs power"] : []),
      ],
      color: owned ? "#7fbf6a" : "#ff7043",
      radius: 5,
    });
  }

  for (const spot of map.lootLoose) {
    const top = [...spot.items].sort((a, b) => price(itemsById.get(b)) - price(itemsById.get(a)));
    const names = top.slice(0, 3).map((id) => itemsById.get(id)?.shortName ?? id);
    markers.push({
      position: spot.position,
      layer: "loose",
      title: "Loose loot",
      details: [where(spot.position), `Can spawn: ${names.join(", ")}${top.length > 3 ? ` +${top.length - 3} more` : ""}`],
      color: "#f5f5f5",
      radius: 3,
    });
  }

  for (const boss of map.bosses) {
    for (const spot of boss.spots) {
      for (const position of spot.positions) {
        markers.push({
          position,
          layer: "boss",
          title: `${boss.name} (${Math.round(boss.chance * 100)}% spawn)`,
          details: [`${spot.name}${spot.chance ? ` · ${Math.round(spot.chance * 100)}% of spawns` : ""}`],
          color: "#d81b60",
          radius: 9,
        });
      }
    }
  }

  const { open, conditional } = extractsFor(map, side);
  for (const e of [...open, ...conditional]) {
    if (!e.position) continue;
    const isConditional = conditional.includes(e);
    markers.push({
      position: e.position,
      layer: "extract",
      title: `Extract: ${e.name}`,
      details: isConditional ? ["Conditional (payment, item or switch)"] : [],
      color: isConditional ? "#ffa726" : "#66bb6a",
      radius: 8,
    });
  }

  const counts: Record<GeneralLayer, number> = { container: 0, lock: 0, loose: 0, boss: 0, extract: 0 };
  for (const m of markers) counts[m.layer]++;

  return {
    markers,
    containerTypes: [...types.values()].sort((a, b) => b.count - a.count),
    counts,
  };
}

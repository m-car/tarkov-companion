import type { Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import type { Objective } from "../../api/tasks";
import { categoryColor, containerCategory } from "../../lib/containers";
import type { AllKeysResult, HuntResult } from "../../lib/hunt";
import type { Pin } from "./RaidMap";

const pctText = (chance: number) => `${(chance * 100).toFixed(chance >= 0.01 ? 1 : 2)}%`;

/** Raid-plan pins: hunt spawns and their best containers, key spawns, likely-room doors, objectives. */
export function buildPins({
  map,
  hunt,
  keySpawns,
  objectives,
  ownedKeys,
  itemsById,
}: {
  map: GameMap;
  hunt: HuntResult[];
  keySpawns?: AllKeysResult | null;
  objectives: { quest: string; objective: Objective }[];
  ownedKeys: ReadonlySet<string>;
  itemsById: Map<string, Item>;
}): Pin[] {
  const pins: Pin[] = [];
  const name = (id: string) => itemsById.get(id)?.shortName ?? id;

  for (const r of hunt) {
    for (const spot of r.loose) {
      const where = [spot.area, spot.floor].filter(Boolean).join(", ");
      pins.push({
        position: spot.position,
        kind: "hunt",
        label: `${name(r.itemId)} · ${where}`,
        details: spot.lock ? [`Likely behind ${itemsById.get(spot.lock.keyId)?.name ?? "a locked door"}`] : [],
      });
    }
    // The top few container types, so the map doesn't drown in low-odds pins.
    for (const c of r.containers.slice(0, 3)) {
      for (const position of c.positions) {
        pins.push({
          position,
          kind: "huntContainer",
          label: `${c.typeName} (${name(r.itemId)} ${pctText(c.chance)})`,
          fill: categoryColor(containerCategory(c.typeName)),
        });
      }
    }
  }

  if (keySpawns) {
    const byValue = (a: string, b: string) =>
      (itemsById.get(b)?.avg24hPrice ?? 0) - (itemsById.get(a)?.avg24hPrice ?? 0);
    for (const spot of keySpawns.spots) {
      const keys = [...spot.keyIds].sort(byValue);
      const more = keys.length > 3 ? ` +${keys.length - 3}` : "";
      pins.push({
        position: spot.position,
        kind: "keySpawn",
        label: `Keys: ${keys.slice(0, 3).map(name).join(", ")}${more}`,
        details: [[spot.area, spot.floor].filter(Boolean).join(", ")],
      });
    }
    for (const c of keySpawns.containers.slice(0, 2)) {
      for (const position of c.positions) {
        pins.push({
          position,
          kind: "huntContainer",
          label: `${c.typeName} (any key ${pctText(c.chance)})`,
          fill: categoryColor(containerCategory(c.typeName)),
        });
      }
    }
  }

  const lockIds = new Set(hunt.flatMap((r) => r.loose.map((s) => s.lock?.id).filter(Boolean)));
  for (const lock of map.locks) {
    if (!lock.position || !lockIds.has(lock.id)) continue;
    const owned = ownedKeys.has(lock.keyId);
    pins.push({
      position: lock.position,
      kind: owned ? "lockOwned" : "lock",
      label: `${itemsById.get(lock.keyId)?.name ?? "Locked door"}${owned ? " (you have it)" : ""}`,
    });
  }

  for (const { quest, objective } of objectives) {
    for (const zone of objective.zones) {
      if (zone.mapId !== map.id) continue;
      pins.push({ position: zone.position, kind: "objective", label: `${quest}: ${objective.description}` });
    }
  }
  return pins;
}

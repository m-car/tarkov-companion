import type { Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import type { Objective } from "../../api/tasks";
import type { AllKeysResult, HuntResult } from "../../lib/hunt";
import { extractsFor, type Side } from "../../lib/raid";
import type { Pin } from "./RaidMap";

/** Map pins for a raid: hunt spawns, their best containers, likely-room locks, objectives, extracts. */
export function buildPins({
  map,
  hunt,
  keySpawns,
  objectives,
  side,
  ownedKeys,
  itemsById,
}: {
  map: GameMap;
  hunt: HuntResult[];
  keySpawns?: AllKeysResult | null;
  objectives: { quest: string; objective: Objective }[];
  side: Side;
  ownedKeys: ReadonlySet<string>;
  itemsById: Map<string, Item>;
}): Pin[] {
  const pins: Pin[] = [];
  const name = (id: string) => itemsById.get(id)?.shortName ?? id;

  for (const r of hunt) {
    for (const spot of r.loose) {
      const where = [spot.area, spot.floor].filter(Boolean).join(", ");
      pins.push({ position: spot.position, kind: "hunt", label: `${name(r.itemId)} · ${where}` });
    }
    // The top few container types, so the map doesn't drown in low-odds pins.
    for (const c of r.containers.slice(0, 3)) {
      for (const position of c.positions) {
        pins.push({ position, kind: "container", label: `${c.typeName} (${name(r.itemId)})` });
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
      });
    }
    for (const c of keySpawns.containers.slice(0, 2)) {
      for (const position of c.positions) {
        pins.push({ position, kind: "container", label: `${c.typeName} (any key)` });
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

  const { open, conditional } = extractsFor(map, side);
  for (const e of open) {
    if (e.position) pins.push({ position: e.position, kind: "extract", label: `Extract: ${e.name}` });
  }
  for (const e of conditional) {
    if (e.position) {
      pins.push({ position: e.position, kind: "extractConditional", label: `Extract: ${e.name} (conditional)` });
    }
  }
  return pins;
}

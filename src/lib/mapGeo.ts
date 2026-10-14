import type { Position } from "../api/maps";

export interface MapLabel {
  /** [x, z] in game coordinates. */
  position: number[];
  text: string;
  top?: number;
  bottom?: number;
}

export interface MapLayer {
  name: string;
  svgLayer?: string;
  extents: { height: number[]; bounds?: (number[] | string)[][] }[];
}

export interface MapConfig {
  key?: string;
  svgPath?: string;
  svgLayer?: string;
  svgBounds?: number[][];
  bounds: number[][];
  transform?: number[];
  coordinateRotation?: number;
  minZoom?: number;
  maxZoom?: number;
  tilePath?: string;
  tileSize?: number;
  heightRange?: number[];
  layers?: MapLayer[];
  labels?: MapLabel[];
}

const dist2d = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

// Labels spanning a tall height range mark multi-level buildings (e.g. "East Wing").
const isBuildingLabel = (l: MapLabel) =>
  l.top !== undefined && l.bottom !== undefined && l.top - l.bottom > 10;

/** Nearest landmark to a position, e.g. "East Wing" or "Power Station". */
export function nearestLabel(position: Position, config: MapConfig | undefined): MapLabel | null {
  let best: MapLabel | null = null;
  let bestDist = Infinity;
  for (const label of config?.labels ?? []) {
    const d = dist2d(position, { x: label.position[0], z: label.position[1] });
    if (d < bestDist) {
      best = label;
      bestDist = d;
    }
  }
  return best;
}

export function areaName(position: Position, config: MapConfig | undefined): string {
  const label = nearestLabel(position, config);
  if (label) return label.text;
  // Maps without landmark labels (e.g. Icebreaker) often name their levels instead.
  return floorLayer(position, config)?.name ?? "Unmarked area";
}

const inRect = (p: Position, rect: (number[] | string)[]) => {
  const [a, b] = rect as number[][];
  return (
    p.x >= Math.min(a[0], b[0]) &&
    p.x <= Math.max(a[0], b[0]) &&
    p.z >= Math.min(a[1], b[1]) &&
    p.z <= Math.max(a[1], b[1])
  );
};

/** Floor layer a position falls in, or null for the base layer. */
export function floorLayer(position: Position, config: MapConfig | undefined): MapLayer | null {
  for (const layer of config?.layers ?? []) {
    for (const extent of layer.extents) {
      const [lo, hi] = extent.height;
      if (position.y < lo || position.y >= hi) continue;
      if (!extent.bounds || extent.bounds.some((rect) => inRect(position, rect))) return layer;
    }
  }
  return null;
}

// Maps whose ground level spans a narrow height band (Streets, Factory, Icebreaker)
// have flat terrain, so height alone tells you the floor anywhere on them.
const FLAT_MAP_SPAN = 100;
const isFlatMap = (config: MapConfig | undefined) => {
  const range = config?.heightRange;
  return Boolean(range && range[1] - range[0] < FLAT_MAP_SPAN);
};

/**
 * Human floor name, only where it means something: inside outlined buildings or
 * multi-level landmarks, or anywhere on flat maps. On hilly maps (Shoreline,
 * Customs) terrain height outdoors would be mistaken for a floor.
 */
export function floorName(position: Position, config: MapConfig | undefined): string | null {
  const layer = floorLayer(position, config);
  const label = nearestLabel(position, config);
  const bounded = layer?.extents.some((e) => e.bounds?.some((rect) => inRect(position, rect)));
  if (bounded) return layer!.name;
  if (label && isBuildingLabel(label)) return layer?.name ?? "Ground floor";
  if (isFlatMap(config)) return layer?.name ?? null;
  return null;
}

/** Nearest lock within reach on roughly the same floor; a spawn near a door is likely behind it. */
export function nearbyLock<T extends { position: Position | null }>(
  position: Position,
  locks: T[],
  maxDistance = 8,
  maxHeight = 2.5,
): T | null {
  let best: T | null = null;
  let bestDist = maxDistance;
  for (const lock of locks) {
    if (!lock.position || Math.abs(lock.position.y - position.y) > maxHeight) continue;
    const d = dist2d(position, lock.position);
    if (d <= bestDist) {
      best = lock;
      bestDist = d;
    }
  }
  return best;
}

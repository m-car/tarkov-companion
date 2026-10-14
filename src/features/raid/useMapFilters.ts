import { useLocalStorage } from "../../hooks/useLocalStorage";
import type { ContainerCategory } from "../../lib/containers";
import type { ContainerType, GeneralLayer } from "../../lib/mapMarkers";

/** Which general map layers are shown; shared by every map, saved across visits. */
export interface MapFilters {
  /** Container categories switched on. */
  cats: ContainerCategory[];
  /** Per-type exceptions to the category setting. */
  typeOverrides: Record<string, boolean>;
  layers: Record<Exclude<GeneralLayer, "container">, boolean>;
}

// Everything off except extracts, so a fresh map isn't buried in pins.
export const DEFAULT_FILTERS: MapFilters = {
  cats: [],
  typeOverrides: {},
  layers: { extract: true, lock: false, loose: false, boss: false },
};

export function typeVisible(filters: MapFilters, type: Pick<ContainerType, "typeId" | "category">): boolean {
  return filters.typeOverrides[type.typeId] ?? filters.cats.includes(type.category);
}

/** Turns a whole category on or off, clearing per-type exceptions within it. */
export function setCategory(
  filters: MapFilters,
  category: ContainerCategory,
  on: boolean,
  typesInCategory: string[],
): MapFilters {
  const typeOverrides = { ...filters.typeOverrides };
  for (const id of typesInCategory) delete typeOverrides[id];
  const cats = filters.cats.filter((c) => c !== category);
  return { ...filters, cats: on ? [...cats, category] : cats, typeOverrides };
}

export function setType(filters: MapFilters, typeId: string, on: boolean): MapFilters {
  return { ...filters, typeOverrides: { ...filters.typeOverrides, [typeId]: on } };
}

export function useMapFilters() {
  const [stored, setFilters] = useLocalStorage<MapFilters>("tc.mapFilters", DEFAULT_FILTERS);
  const filters: MapFilters = {
    ...DEFAULT_FILTERS,
    ...stored,
    layers: { ...DEFAULT_FILTERS.layers, ...stored.layers },
  };
  return [filters, setFilters] as const;
}

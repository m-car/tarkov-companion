import { useEffect, useRef, useState } from "react";
import { Collapsible } from "../../components/Collapsible";
import { CONTAINER_CATEGORIES } from "../../lib/containers";
import type { GeneralLayer, GeneralMarkers } from "../../lib/mapMarkers";
import { setCategory, setType, typeVisible, type MapFilters } from "./useMapFilters";

export const RAID_LAYERS = {
  hunt: { name: "Hunt spawns", color: "#e0a83a" },
  huntContainer: { name: "Hunt containers", color: "#e0a83a" },
  keySpawn: { name: "Key spawns", color: "#26c6da" },
  lock: { name: "Likely-room doors", color: "#ff7043" },
  lockOwned: { name: "Doors you have keys for", color: "#7fbf6a" },
  objective: { name: "Objectives", color: "#b39ddb" },
} as const;
export type RaidKind = keyof typeof RAID_LAYERS;

const GENERAL_LAYERS: { id: Exclude<GeneralLayer, "container">; name: string; color: string }[] = [
  { id: "extract", name: "Extracts", color: "#66bb6a" },
  { id: "lock", name: "Locked doors & stashes", color: "#ff7043" },
  { id: "loose", name: "Loose loot spots", color: "#f5f5f5" },
  { id: "boss", name: "Boss spawns", color: "#d81b60" },
];

function Check({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
    />
  );
}

export function MapFilterPanel({
  general,
  filters,
  setFilters,
  raidKinds,
  hiddenRaid,
  toggleRaid,
}: {
  general: GeneralMarkers | null;
  filters: MapFilters;
  setFilters: (f: MapFilters) => void;
  raidKinds: RaidKind[];
  hiddenRaid: ReadonlySet<RaidKind>;
  toggleRaid: (kind: RaidKind) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const types = general?.containerTypes ?? [];
  const toggleExpanded = (id: string) =>
    setExpanded((e) => {
      const next = new Set(e);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Collapsible id="mapFilters" title="Map filters">
      <div className="filter-grid">
        <div className="filter-group">
          <h4>Containers</h4>
          {types.length === 0 && <p className="hint small">No container data for this map.</p>}
          <ul>
            {CONTAINER_CATEGORIES.map((cat) => {
              const inCat = types.filter((t) => t.category === cat.id);
              if (inCat.length === 0) return null;
              const shown = inCat.filter((t) => typeVisible(filters, t));
              const count = inCat.reduce((n, t) => n + t.count, 0);
              const open = expanded.has(cat.id);
              return (
                <li key={cat.id}>
                  <div className="filter-row">
                    <label>
                      <Check
                        checked={shown.length === inCat.length}
                        indeterminate={shown.length > 0 && shown.length < inCat.length}
                        onChange={(on) =>
                          setFilters(setCategory(filters, cat.id, on, inCat.map((t) => t.typeId)))
                        }
                        label={`Show ${cat.name} containers`}
                      />
                      <span className="dot" style={{ background: cat.color }} />
                      {cat.name} <span className="muted">({count})</span>
                    </label>
                    <button
                      className="link-btn"
                      onClick={() => toggleExpanded(cat.id)}
                      aria-expanded={open}
                      aria-label={`${open ? "Hide" : "Show"} ${cat.name} container types`}
                    >
                      {open ? "▾" : "▸"} {inCat.length} type{inCat.length === 1 ? "" : "s"}
                    </button>
                  </div>
                  {open && (
                    <ul className="filter-types">
                      {inCat.map((t) => (
                        <li key={t.typeId}>
                          <label>
                            <Check
                              checked={typeVisible(filters, t)}
                              onChange={(on) => setFilters(setType(filters, t.typeId, on))}
                              label={`Show ${t.typeName}`}
                            />
                            {t.typeName} <span className="muted">({t.count})</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="filter-group">
          <h4>Markers</h4>
          <ul>
            {GENERAL_LAYERS.map((l) => (
              <li key={l.id} className="filter-row">
                <label>
                  <Check
                    checked={filters.layers[l.id]}
                    onChange={(on) => setFilters({ ...filters, layers: { ...filters.layers, [l.id]: on } })}
                    label={`Show ${l.name}`}
                  />
                  <span className="dot" style={{ background: l.color }} />
                  {l.name} <span className="muted">({general?.counts[l.id] ?? 0})</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {raidKinds.length > 0 && (
          <div className="filter-group">
            <h4>Your raid</h4>
            <ul>
              {raidKinds.map((k) => (
                <li key={k} className="filter-row">
                  <label>
                    <Check
                      checked={!hiddenRaid.has(k)}
                      onChange={() => toggleRaid(k)}
                      label={`Show ${RAID_LAYERS[k].name}`}
                    />
                    <span
                      className={`dot ${k === "huntContainer" ? "ring" : ""}`}
                      style={{ background: k === "huntContainer" ? "#42a5f5" : RAID_LAYERS[k].color }}
                    />
                    {RAID_LAYERS[k].name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

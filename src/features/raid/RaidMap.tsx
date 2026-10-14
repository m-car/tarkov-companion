import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Position } from "../../api/maps";
import { floorLayer, type MapConfig } from "../../lib/mapGeo";
import type { GeneralMarkers } from "../../lib/mapMarkers";
import { MapFilterPanel, RAID_LAYERS, type RaidKind } from "./MapFilterPanel";
import { typeVisible, useMapFilters } from "./useMapFilters";

/** A pin from the raid plan (hunt, keys, objectives), drawn above general markers. */
export interface Pin {
  position: Position;
  kind: RaidKind;
  label: string;
  details?: string[];
  /** Fill colour override, e.g. a hunt container's category colour. */
  fill?: string;
}

const RAID_RADIUS: Record<RaidKind, number> = {
  hunt: 7,
  huntContainer: 6,
  keySpawn: 5,
  lock: 6,
  lockOwned: 6,
  objective: 7,
};

const ALL = "All floors";
const GROUND = "Ground";

// Same coordinate setup as tarkov.dev's interactive maps: [z, x] with a per-map
// scale/offset transform and rotation.
function rotate(latLng: L.LatLng, degrees: number | undefined): L.LatLng {
  if (!degrees || (!latLng.lat && !latLng.lng)) return latLng;
  const a = (degrees * Math.PI) / 180;
  const { lng: x, lat: y } = latLng;
  return L.latLng(x * Math.sin(a) + y * Math.cos(a), x * Math.cos(a) - y * Math.sin(a));
}

function makeCrs(config: MapConfig): L.CRS {
  const [sx, mx, sy, my] = config.transform ?? [1, 0, 1, 0];
  return L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(sx, mx, -sy, my),
    projection: L.extend({}, L.Projection.LonLat, {
      project: (latLng: L.LatLng) => L.Projection.LonLat.project(rotate(latLng, config.coordinateRotation)),
      unproject: (point: L.Point) =>
        rotate(L.Projection.LonLat.unproject(point), -(config.coordinateRotation ?? 0)),
    }),
  });
}

const toLatLng = (p: Position): L.LatLngExpression => [p.z, p.x];
const toBounds = (b: number[][]) => L.latLngBounds([b[0][1], b[0][0]], [b[1][1], b[1][0]]);

// Built with text nodes so names from the data can't inject markup.
function popupContent(title: string, details: string[] = []) {
  const el = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = title;
  el.append(strong);
  for (const line of details.filter(Boolean)) {
    const div = document.createElement("div");
    div.textContent = line;
    el.append(div);
  }
  return el;
}

export default function RaidMap({
  config,
  pins,
  general,
}: {
  config: MapConfig;
  pins: Pin[];
  general: GeneralMarkers | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const generalRef = useRef<L.LayerGroup | null>(null);
  const raidRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Renderer | null>(null);
  const [floor, setFloor] = useState(ALL);
  const [filters, setFilters] = useMapFilters();
  const [hiddenRaid, setHiddenRaid] = useState<Set<RaidKind>>(new Set());
  const [baseError, setBaseError] = useState(false);

  const floors = useMemo(() => [ALL, GROUND, ...(config.layers ?? []).map((l) => l.name)], [config]);
  const onFloor = (p: Position) => floor === ALL || (floorLayer(p, config)?.name ?? GROUND) === floor;

  // Create the map and its base image once per map config.
  useEffect(() => {
    if (!el.current) return;
    const bounds = toBounds(config.bounds);
    const map = L.map(el.current, {
      crs: makeCrs(config),
      minZoom: config.minZoom ?? 1,
      maxZoom: config.maxZoom ?? 6,
      zoomSnap: 0.5,
      attributionControl: false,
      maxBounds: bounds.pad(0.5),
      // Canvas keeps hundreds of container pins fast.
      preferCanvas: true,
    });
    map.fitBounds(bounds);
    mapRef.current = map;
    // Pins get their own pane above the map image (which sits in the overlay pane).
    map.createPane("pins").style.zIndex = "450";
    rendererRef.current = L.canvas({ pane: "pins" });
    generalRef.current = L.layerGroup().addTo(map);
    raidRef.current = L.layerGroup().addTo(map);

    let cancelled = false;
    const svgBounds = config.svgBounds ? toBounds(config.svgBounds) : bounds;
    const fallback = () => {
      if (cancelled) return;
      if (config.tilePath) {
        L.tileLayer(config.tilePath, { tileSize: config.tileSize ?? 256, bounds }).addTo(map).bringToBack();
      } else if (config.svgPath) {
        L.imageOverlay(config.svgPath, svgBounds).addTo(map).bringToBack();
      } else {
        setBaseError(true);
      }
    };
    if (config.svgPath) {
      // Inline the SVG so floors can be shown and hidden; fall back to tiles if it can't be fetched.
      fetch(config.svgPath)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
        .then((text) => {
          if (cancelled) return;
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.innerHTML = text;
          const inner = svg.querySelector("svg");
          svg.setAttribute("viewBox", inner?.getAttribute("viewBox") ?? "");
          svgRef.current = svg;
          L.svgOverlay(svg, svgBounds).addTo(map).bringToBack();
          map.fire("svgready");
        })
        .catch(fallback);
    } else {
      fallback();
    }

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      svgRef.current = null;
    };
  }, [config]);

  // Show the base layer plus the chosen floor in the SVG.
  useEffect(() => {
    const apply = () => {
      const inner = svgRef.current?.querySelector("svg");
      if (!inner) return;
      const active = config.layers?.find((l) => l.name === floor)?.svgLayer;
      for (const g of inner.querySelectorAll(":scope > g[id]")) {
        const show = g.id === config.svgLayer || g.id === active;
        (g as SVGGElement).style.display = show ? "" : "none";
      }
    };
    apply();
    mapRef.current?.on("svgready", apply);
    return () => {
      mapRef.current?.off("svgready", apply);
    };
  }, [floor, config]);

  // General markers: filtered only by the general filters.
  useEffect(() => {
    const group = generalRef.current;
    if (!group) return;
    group.clearLayers();
    let drawn = 0;
    for (const m of general?.markers ?? []) {
      const visible =
        m.layer === "container"
          ? typeVisible(filters, { typeId: m.typeId!, category: m.category! })
          : filters.layers[m.layer];
      if (!visible || !onFloor(m.position)) continue;
      L.circleMarker(toLatLng(m.position), {
        renderer: rendererRef.current ?? undefined,
        pane: "pins",
        radius: m.radius,
        color: "#121210",
        weight: 1,
        fillColor: m.color,
        fillOpacity: 0.9,
      })
        .bindTooltip(m.title)
        .bindPopup(popupContent(m.title, m.details))
        .addTo(group);
      drawn++;
    }
    // Pin counts on the element, for tests and debugging (pins are drawn on canvas).
    el.current?.setAttribute("data-general-pins", String(drawn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [general, filters, floor, config]);

  // Raid-plan pins: their own toggles, never affected by the general filters.
  useEffect(() => {
    const group = raidRef.current;
    if (!group) return;
    group.clearLayers();
    let drawn = 0;
    for (const pin of pins) {
      if (hiddenRaid.has(pin.kind) || !onFloor(pin.position)) continue;
      const ring = pin.kind === "huntContainer";
      L.circleMarker(toLatLng(pin.position), {
        renderer: rendererRef.current ?? undefined,
        pane: "pins",
        radius: RAID_RADIUS[pin.kind],
        color: ring ? RAID_LAYERS.huntContainer.color : "#121210",
        weight: ring ? 3 : 1.5,
        fillColor: pin.fill ?? RAID_LAYERS[pin.kind].color,
        fillOpacity: 0.95,
      })
        .bindTooltip(pin.label)
        .bindPopup(popupContent(pin.label, pin.details))
        .addTo(group);
      drawn++;
    }
    el.current?.setAttribute("data-raid-pins", String(drawn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, hiddenRaid, floor, config]);

  const raidKinds = (Object.keys(RAID_LAYERS) as RaidKind[]).filter((k) => pins.some((p) => p.kind === k));
  const toggleRaid = (kind: RaidKind) =>
    setHiddenRaid((h) => {
      const next = new Set(h);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  return (
    <div className="raid-map">
      {floors.length > 2 && (
        <div className="chips small" role="group" aria-label="Floor">
          {floors.map((f) => (
            <button key={f} className={floor === f ? "active" : ""} onClick={() => setFloor(f)}>
              {f}
            </button>
          ))}
        </div>
      )}
      <div ref={el} className="raid-map-canvas" />
      {baseError && <p className="hint small">Map image unavailable; pins are still shown.</p>}
      <MapFilterPanel
        general={general}
        filters={filters}
        setFilters={setFilters}
        raidKinds={raidKinds}
        hiddenRaid={hiddenRaid}
        toggleRaid={toggleRaid}
      />
    </div>
  );
}

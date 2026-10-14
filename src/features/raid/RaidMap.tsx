import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Position } from "../../api/maps";
import { floorLayer, type MapConfig } from "../../lib/mapGeo";

export type PinKind = "hunt" | "keySpawn" | "container" | "lock" | "lockOwned" | "objective" | "extract" | "extractConditional";

export interface Pin {
  position: Position;
  kind: PinKind;
  label: string;
}

const STYLE: Record<PinKind, { color: string; radius: number; name: string }> = {
  hunt: { color: "#e0a83a", radius: 7, name: "Hunt spawns" },
  keySpawn: { color: "#7fd0d9", radius: 5, name: "Key spawns" },
  container: { color: "#5fa8d3", radius: 4, name: "Containers" },
  lock: { color: "#d9705c", radius: 6, name: "Locked doors" },
  lockOwned: { color: "#7fbf6a", radius: 6, name: "Doors you have keys for" },
  objective: { color: "#b6a6ff", radius: 7, name: "Objectives" },
  extract: { color: "#7fbf6a", radius: 8, name: "Extracts" },
  extractConditional: { color: "#e0a83a", radius: 8, name: "Conditional extracts" },
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

export default function RaidMap({ config, pins }: { config: MapConfig; pins: Pin[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [floor, setFloor] = useState(ALL);
  const [hidden, setHidden] = useState<Set<PinKind>>(new Set(["container"]));
  const [baseError, setBaseError] = useState(false);

  const floors = useMemo(() => [ALL, GROUND, ...(config.layers ?? []).map((l) => l.name)], [config]);

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
    });
    map.fitBounds(bounds);
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

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

  // Draw pins for the visible kinds and floor.
  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    for (const pin of pins) {
      if (hidden.has(pin.kind)) continue;
      if (floor !== ALL) {
        const pinFloor = floorLayer(pin.position, config)?.name ?? GROUND;
        if (pinFloor !== floor) continue;
      }
      const style = STYLE[pin.kind];
      L.circleMarker(toLatLng(pin.position), {
        radius: style.radius,
        color: "#121210",
        weight: 1.5,
        fillColor: style.color,
        fillOpacity: 0.95,
      })
        .bindTooltip(pin.label)
        .addTo(group);
    }
  }, [pins, hidden, floor, config]);

  const kinds = [...new Set(pins.map((p) => p.kind))];
  const toggleKind = (kind: PinKind) =>
    setHidden((h) => {
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
      <ul className="map-legend">
        {kinds.map((k) => (
          <li key={k}>
            <button className={hidden.has(k) ? "off" : ""} onClick={() => toggleKind(k)} aria-pressed={!hidden.has(k)}>
              <span className="dot" style={{ background: STYLE[k].color }} />
              {STYLE[k].name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

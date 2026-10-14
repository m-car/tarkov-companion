import { useMemo } from "react";
import { LoadState } from "../../components/LoadState";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useGameData } from "../../state/useGameData";
import { MapView } from "../raid/MapPlanner";
import { BossesSection, ExtractsSection } from "../raid/MapSections";

/** Browse any map with the general marker filters, no raid plan needed. */
export function MapsTab() {
  const { maps, items, itemsById, retry } = useGameData();
  const mapList = useMemo(() => (maps.status === "ready" ? maps.data : []), [maps]);
  const playable = useMemo(
    () => mapList.filter((m) => m.extracts.length > 0 || m.lootContainers.length > 0),
    [mapList],
  );
  const [selected, setSelected] = useLocalStorage<string | null>("tc.mapsTabMap", null);
  const map = playable.find((m) => m.id === selected) ?? playable[0];

  return (
    <section className="panel">
      <div className="chips" role="group" aria-label="Map">
        {playable.map((m) => (
          <button key={m.id} className={map?.id === m.id ? "active" : ""} onClick={() => setSelected(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
      <LoadState states={[maps, items]} what="maps" onRetry={retry} />
      {map && items.status === "ready" && (
        <>
          <div className="map-header">
            <h2 className="map-title">{map.name}</h2>
            <span className="muted">
              {map.raidDuration && `${map.raidDuration} min`}
              {map.players && ` · ${map.players} players`}
            </span>
          </div>
          <MapView key={map.id} map={map} />
          <ExtractsSection map={map} itemsById={itemsById} mapList={mapList} />
          <BossesSection map={map} />
        </>
      )}
    </section>
  );
}

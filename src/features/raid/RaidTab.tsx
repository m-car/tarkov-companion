import { useMemo } from "react";
import type { Item } from "../../api/items";
import type { GameMap } from "../../api/maps";
import type { Task } from "../../api/tasks";
import { ItemIcon } from "../../components/ItemIcon";
import { LoadState } from "../../components/LoadState";
import { Segmented } from "../../components/Segmented";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { CURRENCY_CODES } from "../../lib/hideout";
import { formatPrice } from "../../lib/prices";
import { appliesToFaction, objectivesAnywhere } from "../../lib/quests";
import {
  extractsFor,
  keysForMap,
  planMaps,
  questKeysOnMap,
  type BringItem,
  type MapPlan,
  type Side,
} from "../../lib/raid";
import { useAppState } from "../../state/AppState";
import { useGameData, useNeeds } from "../../state/useGameData";
import { QuestRow } from "../quests/QuestRow";
import { RecentlyFinished } from "../quests/RecentlyFinished";
import { useQuestToggle } from "../quests/useQuestToggle";

const PLAN = "plan";

export function RaidTab() {
  const { tasks, maps, items, itemsById, retry } = useGameData();
  const { statuses } = useNeeds();
  const { settings } = useAppState();
  const [selected, setSelected] = useLocalStorage("tc.raidMap", PLAN);

  const taskList = useMemo(
    () =>
      tasks.status === "ready"
        ? tasks.data.filter((t) => appliesToFaction(t, settings.faction))
        : [],
    [tasks, settings.faction],
  );
  const mapList = useMemo(() => (maps.status === "ready" ? maps.data : []), [maps]);
  // Hide maps with nothing to show (e.g. arena-style or retired locations).
  const playable = useMemo(
    () => mapList.filter((m) => m.extracts.length > 0 || m.locks.length > 0),
    [mapList],
  );
  const plans = useMemo(() => planMaps(playable, taskList, statuses), [playable, taskList, statuses]);
  const plan = plans.find((p) => p.map.id === selected);

  return (
    <section className="panel">
      <div className="chips" role="group" aria-label="Map">
        <button className={!plan ? "active" : ""} onClick={() => setSelected(PLAN)}>
          Plan
        </button>
        {playable.map((m) => (
          <button
            key={m.id}
            className={selected === m.id ? "active" : ""}
            onClick={() => setSelected(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <LoadState states={[maps, tasks, items]} what="raid data" onRetry={retry} />

      {maps.status === "ready" &&
        tasks.status === "ready" &&
        (plan ? (
          <MapDetail plan={plan} tasks={taskList} itemsById={itemsById} mapList={mapList} />
        ) : (
          <PlanView plans={plans} itemsById={itemsById} onPick={setSelected} />
        ))}
    </section>
  );
}

function BringList({ bring, itemsById }: { bring: BringItem[]; itemsById: Map<string, Item> }) {
  if (bring.length === 0) return null;
  const label = { key: "Key", plant: "Plant", marker: "Marker" };
  return (
    <ul className="bring-list">
      {bring.map((b) => {
        const item = itemsById.get(b.itemId);
        return (
          <li key={`${b.kind}:${b.itemId}`} title={b.quests.join(", ")}>
            <ItemIcon item={item} size={28} />
            <span>
              {b.count > 1 && `${b.count}× `}
              {item?.shortName ?? b.itemId}
            </span>
            <span className={`badge bring-${b.kind}`}>{label[b.kind]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PlanView({
  plans,
  itemsById,
  onPick,
}: {
  plans: MapPlan[];
  itemsById: Map<string, Item>;
  onPick: (mapId: string) => void;
}) {
  return (
    <>
      <p className="hint small">
        Maps ranked by how many of your available quests they move forward. Tap one for extracts,
        objectives, bosses and keys.
      </p>
      <ul className="plan-list">
        {plans.map((p, i) => (
          <li key={p.map.id} className={p.quests.length === 0 ? "plan empty" : "plan"}>
            <button className="plan-head" onClick={() => onPick(p.map.id)}>
              <span className="plan-rank">{p.quests.length > 0 ? i + 1 : "–"}</span>
              <span className="plan-name">{p.map.name}</span>
              <span className="plan-stats">
                {p.quests.length} quest{p.quests.length === 1 ? "" : "s"} · {p.objectiveCount}{" "}
                objective{p.objectiveCount === 1 ? "" : "s"}
                {p.kappaCount > 0 && <span className="badge kappa">{p.kappaCount} Kappa</span>}
              </span>
            </button>
            {p.quests.length > 0 && (
              <div className="plan-body">
                <span className="muted">{p.quests.map((q) => q.task.name).join(" · ")}</span>
                {p.bring.length > 0 && (
                  <>
                    <span className="bring-title">Bring:</span>
                    <BringList bring={p.bring} itemsById={itemsById} />
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function MapDetail({
  plan,
  tasks,
  itemsById,
  mapList,
}: {
  plan: MapPlan;
  tasks: Task[];
  itemsById: Map<string, Item>;
  mapList: GameMap[];
}) {
  const { map } = plan;
  const { ownedKeys, toggleOwnedKey } = useAppState();
  const { statuses } = useNeeds();
  const [side, setSide] = useLocalStorage<Side>("tc.side", "pmc");
  const extracts = extractsFor(map, side);

  const toggle = useQuestToggle(tasks);

  const available = tasks.filter((t) => statuses.get(t.id) === "available");
  const anywhere = available
    .map((t) => ({ t, objectives: objectivesAnywhere(t) }))
    .filter((x) => x.objectives.length > 0);
  const keys = keysForMap(map, itemsById, ownedKeys, questKeysOnMap(map.id, available));

  const requirement = (e: (typeof map.extracts)[number]) => {
    const parts: string[] = [];
    if (e.transferItem) {
      const code = CURRENCY_CODES[e.transferItem.itemId];
      const item = itemsById.get(e.transferItem.itemId);
      parts.push(
        code
          ? `Pay ${formatPrice(e.transferItem.count, code)}`
          : `Hand over ${e.transferItem.count > 1 ? `${e.transferItem.count}× ` : ""}${item?.name ?? "item"}`,
      );
    }
    if (e.needsSwitch) parts.push("Needs a switch or power");
    return parts.join(" · ");
  };

  return (
    <>
      <div className="map-header">
        <h2 className="map-title">{map.name}</h2>
        <span className="muted">
          {map.raidDuration && `${map.raidDuration} min`}
          {map.players && ` · ${map.players} players`}
        </span>
      </div>

      {plan.bring.length > 0 && (
        <div className="bring-box">
          <span className="bring-title">Bring for your quests:</span>
          <BringList bring={plan.bring} itemsById={itemsById} />
        </div>
      )}

      <div className="section-head">
        <h2 className="section-title">Extracts</h2>
        <Segmented<Side>
          label="Side"
          value={side}
          onChange={setSide}
          options={[
            { value: "pmc", label: "PMC" },
            { value: "scav", label: "Scav" },
          ]}
        />
      </div>
      {extracts.open.length + extracts.conditional.length === 0 ? (
        <p className="hint">No extract data for this map.</p>
      ) : (
        <ul className="extract-list">
          {extracts.open.map((e) => (
            <li key={e.id} className="extract">
              <span className="extract-name">{e.name}</span>
              {e.faction === "shared" && <span className="badge">Shared</span>}
            </li>
          ))}
          {extracts.conditional.map((e) => (
            <li key={e.id} className="extract conditional">
              <span className="extract-name">{e.name}</span>
              {e.faction === "shared" && <span className="badge">Shared</span>}
              <span className="extract-req">{requirement(e)}</span>
            </li>
          ))}
        </ul>
      )}
      {map.transits.length > 0 && (
        <details className="needs">
          <summary>
            Transits <span className="muted">({map.transits.length})</span>
          </summary>
          <ul className="extract-list">
            {map.transits.map((tr) => (
              <li key={tr.id} className="extract">
                <span className="extract-name">
                  → {mapList.find((m) => m.id === tr.toMapId)?.name ?? tr.toMapId}
                </span>
                <span className="extract-req">{tr.description}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <RecentlyFinished tasks={tasks} />

      <h2 className="section-title">
        Your objectives here <span className="muted">({plan.quests.length})</span>
      </h2>
      {plan.quests.length === 0 ? (
        <p className="hint">None of your available quests have objectives on {map.name}.</p>
      ) : (
        <ul className="quest-list">
          {plan.quests.map(({ task, objectives }) => (
            <QuestRow
              key={task.id}
              task={task}
              status={statuses.get(task.id) ?? "locked"}
              onToggle={() => toggle(task)}
              itemsById={itemsById}
              objectives={objectives}
              expanded
            />
          ))}
        </ul>
      )}
      {anywhere.length > 0 && (
        <details className="needs">
          <summary>
            Can also be done here <span className="muted">({anywhere.length})</span>
          </summary>
          <ul className="quest-list">
            {anywhere.map(({ t, objectives }) => (
              <QuestRow
                key={t.id}
                task={t}
                status={statuses.get(t.id) ?? "locked"}
                onToggle={() => toggle(t)}
                itemsById={itemsById}
                objectives={objectives}
                expanded
              />
            ))}
          </ul>
        </details>
      )}

      {map.bosses.length > 0 && (
        <>
          <h2 className="section-title">Bosses</h2>
          <ul className="boss-list">
            {map.bosses.map((b) => (
              <li key={b.name}>
                <span className="boss-chance">{Math.round(b.chance * 100)}%</span>
                <span>
                  {b.name}
                  {b.locations.length > 0 && <span className="muted"> {b.locations.join(", ")}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {keys.length > 0 && (
        <details className="needs" open={keys.some((k) => k.owned || k.quests.length > 0)}>
          <summary>
            Keys <span className="muted">({keys.length}) · tap ⚿ to mark keys you own</span>
          </summary>
          <ul className="key-list">
            {keys.map((k) => {
              const price = k.item?.avg24hPrice ?? k.item?.lastLowPrice;
              const types = [...new Set(k.locks.map((l) => l.lockType))].join(", ");
              return (
                <li key={k.keyId} className={k.owned ? "owned" : ""}>
                  <button
                    className={`own ${k.owned ? "on" : ""}`}
                    onClick={() => toggleOwnedKey(k.keyId)}
                    aria-pressed={k.owned}
                    aria-label={k.owned ? `I don't have ${k.item?.name}` : `I have ${k.item?.name}`}
                    title={k.owned ? "You have this key" : "Mark as owned"}
                  >
                    ⚿
                  </button>
                  <ItemIcon item={k.item} size={32} />
                  <span className="key-name">
                    {k.item?.name ?? k.keyId}
                    {k.quests.length > 0 && <span className="badge fir">Quest</span>}
                    {k.locks.some((l) => l.needsPower) && <span className="badge">Power</span>}
                    <span className="muted">
                      {" "}
                      {k.quests.length > 0 ? k.quests.join(", ") : types}
                    </span>
                  </span>
                  <span className="key-price">{price ? formatPrice(price) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </>
  );
}

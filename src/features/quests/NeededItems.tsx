import type { Item } from "../../api/items";
import { ItemIcon } from "../../components/ItemIcon";
import type { QuestNeed } from "../../lib/quests";

export function NeededItems({
  needs,
  itemsById,
}: {
  needs: Map<string, QuestNeed>;
  itemsById: Map<string, Item>;
}) {
  const rows = [...needs.entries()]
    .map(([id, need]) => ({ id, need, item: itemsById.get(id) }))
    .sort((a, b) => (a.item?.name ?? a.id).localeCompare(b.item?.name ?? b.id));

  if (rows.length === 0) return <p className="hint">No items needed for your open quests.</p>;

  return (
    <ul className="need-list">
      {rows.map(({ id, need, item }) => (
        <li key={id}>
          <ItemIcon item={item} size={36} />
          <span className="need-count">{need.count}×</span>
          <span className="need-name">
            {item?.name ?? id}
            {need.foundInRaid && <span className="badge fir">FIR</span>}
            <span className="muted"> {need.quests.join(", ")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

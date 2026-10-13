import type { Item } from "../api/items";

export function ItemIcon({ item, size = 40 }: { item?: Item; size?: number }) {
  return (
    <span className="item-icon" style={{ width: size, height: size }}>
      {item?.iconLink && <img src={item.iconLink} alt="" loading="lazy" />}
    </span>
  );
}

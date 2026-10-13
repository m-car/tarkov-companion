import type { Item } from "../../api/items";
import { ItemIcon } from "../../components/ItemIcon";
import {
  bestTraderSell,
  cheapestBuy,
  fleaSellPrice,
  formatPrice,
  slots,
  valuePerSlot,
} from "../../lib/prices";
import type { Verdict } from "../../lib/verdict";

const VERDICT_LABEL: Record<Verdict["kind"], string> = {
  quest: "QUEST",
  hideout: "HIDEOUT",
  starred: "KEEP",
  keep: "KEEP",
  sell: "SELL",
};

export function ItemCard({
  item,
  verdict,
  starred,
  onToggleStar,
}: {
  item: Item;
  verdict: Verdict;
  starred: boolean;
  onToggleStar: () => void;
}) {
  const flea = fleaSellPrice(item);
  const trader = bestTraderSell(item);
  const buy = cheapestBuy(item);
  const change = item.changeLast48hPercent;
  const sellToFlea = flea !== null && (!trader || flea > trader.priceRUB);

  return (
    <article className={`item-card verdict-${verdict.kind}`}>
      <div className="verdict">
        <span className="verdict-label">{VERDICT_LABEL[verdict.kind]}</span>
        <ul className="verdict-reasons">
          {verdict.reasons.map((r) => (
            <li key={r.kind}>{r.text}</li>
          ))}
        </ul>
      </div>

      <div className="item-main">
        <ItemIcon item={item} size={56} />
        <div className="item-body">
          <header>
            <h3>
              {item.link ? (
                <a href={item.link} target="_blank" rel="noreferrer">
                  {item.name}
                </a>
              ) : (
                item.name
              )}
            </h3>
            <span className="muted">
              {item.shortName} · {item.width}×{item.height} ({slots(item)} slot
              {slots(item) === 1 ? "" : "s"})
            </span>
          </header>
        </div>
        <button
          className={`star ${starred ? "on" : ""}`}
          onClick={onToggleStar}
          aria-pressed={starred}
          aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
          title={starred ? "Remove from watchlist" : "Add to watchlist"}
        >
          {starred ? "★" : "☆"}
        </button>
      </div>

      <dl className="price-grid">
        <div className={sellToFlea ? "best" : ""}>
          <dt>Flea</dt>
          <dd>
            {flea !== null ? formatPrice(flea) : <span className="muted">Not sellable</span>}
            {change !== null && change !== 0 && (
              <span className={change > 0 ? "up" : "down"}>
                {" "}
                {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </dd>
        </div>
        <div className={!sellToFlea && trader ? "best" : ""}>
          <dt>Best trader</dt>
          <dd>
            {trader ? (
              <>
                {formatPrice(trader.price, trader.currency)}{" "}
                <span className="muted">{trader.vendor.name}</span>
              </>
            ) : (
              <span className="muted">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Per slot</dt>
          <dd>{formatPrice(valuePerSlot(item))}</dd>
        </div>
        <div>
          <dt>Cheapest buy</dt>
          <dd>
            {buy ? (
              <>
                {formatPrice(buy.price, buy.currency)}{" "}
                <span className="muted">{buy.vendor.name}</span>
              </>
            ) : (
              <span className="muted">—</span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

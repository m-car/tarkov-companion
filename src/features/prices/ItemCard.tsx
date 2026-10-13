import type { Item } from "../../api/items";
import {
  bestTraderSell,
  cheapestBuy,
  fleaSellPrice,
  formatPrice,
  slots,
  valuePerSlot,
} from "../../lib/prices";

export function ItemCard({ item }: { item: Item }) {
  const flea = fleaSellPrice(item);
  const trader = bestTraderSell(item);
  const buy = cheapestBuy(item);
  const change = item.changeLast48hPercent;
  const sellToFlea = flea !== null && (!trader || flea > trader.priceRUB);

  return (
    <article className="item-card">
      <div className="item-icon">
        {item.iconLink && <img src={item.iconLink} alt="" loading="lazy" />}
      </div>
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
      </div>
    </article>
  );
}

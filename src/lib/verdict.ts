import type { Item } from "../api/items";
import type { HideoutNeed } from "./hideout";
import { bestTraderSell, fleaSellPrice, valuePerSlot } from "./prices";
import type { QuestNeed } from "./quests";

export type VerdictKind = "quest" | "hideout" | "starred" | "keep" | "sell";

export interface Verdict {
  /** The headline call, most important reason first. */
  kind: VerdictKind;
  /** Every reason that applies, for badges. */
  reasons: { kind: VerdictKind; text: string }[];
}

export interface VerdictContext {
  questNeeds: Map<string, QuestNeed>;
  hideoutNeeds: Map<string, HideoutNeed>;
  starred: ReadonlySet<string>;
  /** Keep anything worth at least this much per slot. */
  perSlotThreshold: number;
}

export function itemVerdict(item: Item, ctx: VerdictContext): Verdict {
  const reasons: Verdict["reasons"] = [];

  const quest = ctx.questNeeds.get(item.id);
  if (quest) {
    const fir = quest.foundInRaid ? " (found in raid)" : "";
    const more = quest.quests.length > 1 ? ` +${quest.quests.length - 1} more` : "";
    reasons.push({ kind: "quest", text: `${quest.count}× for ${quest.quests[0]}${more}${fir}` });
  }

  const hideout = ctx.hideoutNeeds.get(item.id);
  if (hideout) {
    const more = hideout.upgrades.length > 1 ? ` +${hideout.upgrades.length - 1} more` : "";
    reasons.push({ kind: "hideout", text: `${hideout.count}× for ${hideout.upgrades[0]}${more}` });
  }

  if (ctx.starred.has(item.id)) {
    reasons.push({ kind: "starred", text: "On your watchlist" });
  }

  const perSlot = valuePerSlot(item);
  if (ctx.perSlotThreshold > 0 && perSlot >= ctx.perSlotThreshold) {
    reasons.push({
      kind: "keep",
      text: `Worth ${perSlot.toLocaleString("en-US")} ₽ per slot`,
    });
  }

  if (reasons.length === 0) {
    const flea = fleaSellPrice(item) ?? 0;
    const trader = bestTraderSell(item);
    const where = trader && trader.priceRUB >= flea ? trader.vendor.name : "flea";
    reasons.push({
      kind: "sell",
      text: perSlot > 0 ? `Low value per slot; sell to ${where}` : "No market value",
    });
  }

  return { kind: reasons[0].kind, reasons };
}

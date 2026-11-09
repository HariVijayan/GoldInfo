import { GOLD_LABEL, RUPEE_SYMBOL } from "../../config/displayLabels";
import type { CurrencyEffect } from "../../types/savingsTypes";
import { formatPrice, getChangeTone } from "../../utils/formatters";
import { formatSignedPercent } from "../../utils/savingsFormatters";
import { ChartPanel } from "../common/ChartPanel";
import { MetricCard } from "../common/MetricCard";

export function CurrencyEffectPanel({ currencyEffect }: { currencyEffect: CurrencyEffect }) {
  const rupeeWeakened = (currencyEffect.usd_inr_change_pct ?? 0) >= 0;

  return (
    <ChartPanel
      title="Why gold rose in rupees"
      subtitle="Gold is priced in dollars. Its rupee price combines the dollar move with the rupee's move against the dollar."
    >
      <div className="metrics-grid metrics-grid-compact">
        <MetricCard
          metricTitle={`${GOLD_LABEL} in USD`}
          metricValue={formatSignedPercent(currencyEffect.gold_usd_change_pct)}
          metricCaption={`$${formatPrice(currencyEffect.start_gold_usd_per_ounce)} to $${formatPrice(
            currencyEffect.end_gold_usd_per_ounce
          )} per oz`}
          changeTone={getChangeTone(currencyEffect.gold_usd_change_pct)}
        />
        <MetricCard
          metricTitle={`Rupee against the dollar`}
          metricValue={formatSignedPercent(currencyEffect.usd_inr_change_pct)}
          metricCaption={`${RUPEE_SYMBOL}${formatPrice(currencyEffect.start_inr_per_usd)} to ${RUPEE_SYMBOL}${formatPrice(
            currencyEffect.end_inr_per_usd
          )} per $ (${rupeeWeakened ? "weaker" : "stronger"} rupee)`}
        />
        <MetricCard
          metricTitle={`${GOLD_LABEL} in ${RUPEE_SYMBOL}`}
          metricValue={formatSignedPercent(currencyEffect.gold_inr_change_pct)}
          metricCaption="the two combined"
          changeTone={getChangeTone(currencyEffect.gold_inr_change_pct)}
        />
      </div>
    </ChartPanel>
  );
}

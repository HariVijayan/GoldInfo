import { GOLD_LABEL, RUPEE_SYMBOL } from "../../config/displayLabels";
import type { CurrencyEffect } from "../../types/savingsTypes";
import { formatPrice, getChangeTone } from "../../utils/formatters";
import { formatSignedPercent } from "../../utils/savingsFormatters";
import { ChartPanel } from "../common/ChartPanel";
import { MetricCard } from "../common/MetricCard";

export function CurrencyEffectPanel({ currencyEffect }: { currencyEffect: CurrencyEffect }) {
  const rupeeWeakened = (currencyEffect.usd_inr_change_pct ?? 0) >= 0;
  const hasRetailCost = (currencyEffect.retail_cost_effect_pct ?? 0) !== 0;

  return (
    <ChartPanel
      title="Why gold rose in rupees"
      subtitle="Gold is priced in dollars. Its rupee return combines the dollar move, the rupee's move against the dollar, and any retail charge paid."
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
        {hasRetailCost && (
          <MetricCard
            metricTitle="Retail charge paid"
            metricValue={formatSignedPercent(currencyEffect.retail_cost_effect_pct)}
            metricCaption="bought above, valued at the original price"
            changeTone="negative"
          />
        )}
        <MetricCard
          metricTitle={`${GOLD_LABEL} in ${RUPEE_SYMBOL}`}
          metricValue={formatSignedPercent(currencyEffect.gold_inr_change_pct)}
          metricCaption={hasRetailCost ? "all of the above combined" : "the two combined"}
          changeTone={getChangeTone(currencyEffect.gold_inr_change_pct)}
        />
      </div>
    </ChartPanel>
  );
}

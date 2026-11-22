import { useRetailPricing } from "../../../hooks/shared/useRetailPricing";
import type { FeatureId } from "../../../types/shared/featureTypes";

/** What the Retail view means on each tab. The percentage is added when shown. */
const RETAIL_MEANING: Record<FeatureId, string> = {
  analysis: "INR gold prices, statistics and the AI overview include the retail charge. USD prices and USD/INR are unchanged.",
  forecast: "INR per gram prices, ranges and history include the retail charge. Percentage changes, USD prices and USD/INR are unchanged.",
  savings: "Gold is bought at the retail price and valued at the original price, the way a buyer-back roughly pays.",
  "savings-monthly": "Each month's gold is bought at the retail price and valued at the original price. The RD is unaffected.",
};

const ORIGINAL_MEANING =
  "INR gold prices are the converted international price (gold in USD times USD/INR), with no retail charge.";

/** The gold strip under the header that says which prices every tab is showing. */
export function PriceViewNotice({ featureId }: { featureId: FeatureId }) {
  const { priceView, retailChargePct } = useRetailPricing();
  const isRetail = priceView === "retail";

  return (
    <p className={isRetail ? "price-view-notice price-view-notice-retail" : "price-view-notice"} role="status">
      <strong>{isRetail ? `Retail prices (+${retailChargePct}%)` : "Original prices"}</strong>
      <span>{isRetail ? RETAIL_MEANING[featureId] : ORIGINAL_MEANING}</span>
    </p>
  );
}

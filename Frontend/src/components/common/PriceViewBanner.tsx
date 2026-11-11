import type { PriceView } from "../../types/retailPricingTypes";

type PriceViewBannerProps = {
  priceView: PriceView;
  /** The percentage the shown result was computed with. */
  retailChargePct: number;
  /** Says what Retail means on this tab, when the default is not enough. */
  retailDescription?: string;
};

/** Tells the reader which prices a dashboard is showing. */
export function PriceViewBanner({ priceView, retailChargePct, retailDescription }: PriceViewBannerProps) {
  const isRetail = priceView === "retail";

  return (
    <p className={isRetail ? "price-view-banner price-view-banner-retail" : "price-view-banner"} role="status">
      <strong>{isRetail ? `Retail prices (+${retailChargePct}%)` : "Original prices"}</strong>
      <span>
        {isRetail
          ? (retailDescription ?? "INR gold prices include the retail charge. USD prices and USD/INR are unchanged.")
          : "INR gold prices are the converted international price, with no retail charge."}
      </span>
    </p>
  );
}

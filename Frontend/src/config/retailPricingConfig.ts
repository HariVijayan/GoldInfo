import type { PriceView } from "../types/retailPricingTypes";

/** Keep these limits identical to Backend/retail_pricing.py. */
export const DEFAULT_RETAIL_CHARGE_PCT = 15;
export const MINIMUM_RETAIL_CHARGE_PCT = 0;
export const MAXIMUM_RETAIL_CHARGE_PCT = 100;

export const DEFAULT_PRICE_VIEW: PriceView = "original";

export const PRICE_VIEW_OPTIONS: { value: PriceView; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "retail", label: "Retail" },
];

export const RETAIL_CHARGE_STORAGE_KEY = "goldinfo.retailChargePct";
export const PRICE_VIEW_STORAGE_KEY = "goldinfo.priceView";

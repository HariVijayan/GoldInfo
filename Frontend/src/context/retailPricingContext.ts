import { createContext } from "react";
import type { PriceView } from "../types/retailPricingTypes";

export type RetailPricingContextValue = {
  /** The percentage the data is fetched with. Changes only when committed. */
  retailChargePct: number;
  priceView: PriceView;
  commitRetailChargePct: (retailChargePct: number) => void;
  setPriceView: (priceView: PriceView) => void;
};

export const RetailPricingContext = createContext<RetailPricingContextValue | null>(null);

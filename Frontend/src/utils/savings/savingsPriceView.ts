/**
 * Picks the Original or Retail version of a server response. The server
 * computes both views, so this only swaps in the values it sent: there is no
 * price arithmetic here.
 */
import type { SavingsResult, SavingsViewData } from "../../types/savings/savingsTypes";
import type { PriceView } from "../../types/shared/retailPricingTypes";

/** Shared fields plus the chosen view's fields, in one flat object. */
export type SavingsViewedResult = Omit<SavingsResult, "views"> & SavingsViewData;

export function selectSavingsView(savingsResult: SavingsResult, priceView: PriceView): SavingsViewedResult {
  const { views, ...sharedFields } = savingsResult;
  return { ...sharedFields, ...views[priceView] };
}

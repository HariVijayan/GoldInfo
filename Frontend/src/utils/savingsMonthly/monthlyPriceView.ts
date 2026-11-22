/**
 * Picks the Original or Retail version of a server response. The server
 * computes both views, so this only swaps in the values it sent: there is no
 * price arithmetic here.
 */
import type { MonthlyResult, MonthlyViewData } from "../../types/savingsMonthly/savingsMonthlyTypes";
import type { PriceView } from "../../types/shared/retailPricingTypes";

/** Shared fields plus the chosen view's fields, in one flat object. */
export type MonthlyViewedResult = Omit<MonthlyResult, "views"> & MonthlyViewData;

export function selectMonthlyView(monthlyResult: MonthlyResult, priceView: PriceView): MonthlyViewedResult {
  const { views, ...sharedFields } = monthlyResult;
  return { ...sharedFields, ...views[priceView] };
}

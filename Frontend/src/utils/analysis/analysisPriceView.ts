/**
 * Picks the Original or Retail version of a server response. The server
 * computes both views, so this only swaps in the values it sent: there is no
 * price arithmetic here.
 */
import type { AgentResult } from "../../types/analysis/analysisTypes";
import type { PriceView } from "../../types/shared/retailPricingTypes";

export function applyAnalysisPriceView(analysisResult: AgentResult, priceView: PriceView): AgentResult {
  const retailView = analysisResult.retail;
  if (priceView === "original" || !retailView) return analysisResult;

  return {
    ...analysisResult,
    analysis: retailView.analysis,
    interpretation: retailView.interpretation,
    processed_data: analysisResult.processed_data
      ? {
          ...analysisResult.processed_data,
          gold_inr_per_ounce: retailView.processed_data.gold_inr_per_ounce,
          gold_inr_per_gram: retailView.processed_data.gold_inr_per_gram,
          metadata: { ...analysisResult.processed_data.metadata, ...retailView.processed_data.metadata },
        }
      : null,
  };
}

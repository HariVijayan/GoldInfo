/**
 * Picks the Original or Retail version of a server response.
 *
 * The server computes both views, so nothing here does any price arithmetic:
 * the selectors only swap in the values the server sent. The result has the
 * same shape as the original response, so the dashboards need no changes.
 */
import type { AgentResult } from "../types/analysisTypes";
import type { ForecastResult } from "../types/forecastTypes";
import type { PriceView } from "../types/retailPricingTypes";
import type { SavingsResult, SavingsViewData } from "../types/savingsTypes";

const GOLD_INR_PER_GRAM_KEY = "gold_inr_per_gram";

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

export function applyForecastPriceView(forecastResult: ForecastResult, priceView: PriceView): ForecastResult {
  const retailView = forecastResult.retail;
  if (priceView === "original" || !retailView) return forecastResult;

  const retailPointByStep = new Map(retailView.forecast_points.map((point) => [point.step, point]));
  const retailHistoryByDate = new Map(retailView.history_points.map((point) => [point.date, point]));

  return {
    ...forecastResult,
    data_summary: {
      ...forecastResult.data_summary,
      latest_values: {
        ...forecastResult.data_summary.latest_values,
        [GOLD_INR_PER_GRAM_KEY]: retailView.latest_value,
      },
    },
    forecast: {
      ...forecastResult.forecast,
      points: forecastResult.forecast.points.map((point) => {
        const retailPoint = retailPointByStep.get(point.step);
        if (!retailPoint) return point;
        return {
          ...point,
          [GOLD_INR_PER_GRAM_KEY]: retailPoint.gold_inr_per_gram,
          bounds: {
            ...point.bounds,
            [GOLD_INR_PER_GRAM_KEY]: { lower: retailPoint.lower, upper: retailPoint.upper },
          },
        };
      }),
      end_of_horizon: {
        ...forecastResult.forecast.end_of_horizon,
        [GOLD_INR_PER_GRAM_KEY]: retailView.end_of_horizon,
      },
    },
    history: {
      points: forecastResult.history.points.map((point) => {
        const retailPoint = retailHistoryByDate.get(point.date);
        return retailPoint ? { ...point, [GOLD_INR_PER_GRAM_KEY]: retailPoint.gold_inr_per_gram } : point;
      }),
    },
  };
}

/** Shared fields plus the chosen view's fields, in one flat object. */
export type SavingsViewedResult = Omit<SavingsResult, "views"> & SavingsViewData;

export function selectSavingsView(savingsResult: SavingsResult, priceView: PriceView): SavingsViewedResult {
  const { views, ...sharedFields } = savingsResult;
  return { ...sharedFields, ...views[priceView] };
}

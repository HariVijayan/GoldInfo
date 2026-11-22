/**
 * Picks the Original or Retail version of a server response. The server
 * computes both views, so this only swaps in the values it sent: there is no
 * price arithmetic here.
 */
import type { ForecastResult } from "../../types/forecast/forecastTypes";
import type { PriceView } from "../../types/shared/retailPricingTypes";

const GOLD_INR_PER_GRAM_KEY = "gold_inr_per_gram";

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

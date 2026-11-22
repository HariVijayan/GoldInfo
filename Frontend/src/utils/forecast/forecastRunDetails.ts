import type { ForecastResult } from "../../types/forecast/forecastTypes";
import type { RunDetailItem } from "../../types/shared/artifactTypes";
import { formatLongDate } from "../shared/chartDates";

export function buildForecastRunDetails(forecastResult: ForecastResult): RunDetailItem[] {
  return [
    { label: "Run ID", value: forecastResult.run_id },
    { label: "Generated at", value: forecastResult.generated_at },
    { label: "Horizon", value: `${forecastResult.forecast.horizon_weeks} weeks` },
    { label: "Retail charge", value: `${forecastResult.request.retail_charge_pct}%` },
    { label: "Detail", value: forecastResult.forecast.frequency },
    { label: "Range level", value: `${Math.round(forecastResult.forecast.interval_level * 100)}%` },
    {
      label: "Training observations",
      value: `${forecastResult.data_summary.observations_used.toLocaleString("en-IN")} ${
        forecastResult.data_summary.training_frequency
      }`,
    },
    {
      label: "Aligned daily observations",
      value: forecastResult.data_summary.aligned_daily_observations.toLocaleString("en-IN"),
    },
    {
      label: "History used",
      value: `${formatLongDate(forecastResult.data_summary.history_start)} to ${formatLongDate(
        forecastResult.data_summary.history_end
      )}`,
    },
    { label: "Model", value: forecastResult.model.approach },
  ];
}

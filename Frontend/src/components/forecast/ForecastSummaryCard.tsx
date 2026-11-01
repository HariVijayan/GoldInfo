import type { PriceSeriesOption } from "../../config/priceSeriesConfig";
import type { EndOfHorizonSummary } from "../../types/forecastTypes";
import { formatPercent, formatSeriesValue, getChangeTone } from "../../utils/formatters";

type ForecastSummaryCardProps = {
  seriesOption: PriceSeriesOption;
  summary: EndOfHorizonSummary;
  isSelected: boolean;
  onSelect: () => void;
};

export function ForecastSummaryCard({
  seriesOption,
  summary,
  isSelected,
  onSelect,
}: ForecastSummaryCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className="forecast-card"
      onClick={onSelect}
    >
      <span className="forecast-card-label">{seriesOption.label}</span>
      <span className="forecast-card-price">
        {formatSeriesValue(seriesOption, summary.forecast)}{" "}
        <small>{seriesOption.unitDescription}</small>
      </span>
      <span className={`forecast-card-change tone-${getChangeTone(summary.change_pct)}`}>
        {formatPercent(summary.change_pct)} from {formatSeriesValue(seriesOption, summary.latest)}
      </span>
      <span className="forecast-card-range">
        Range {formatSeriesValue(seriesOption, summary.lower)} to{" "}
        {formatSeriesValue(seriesOption, summary.upper)}
      </span>
    </button>
  );
}

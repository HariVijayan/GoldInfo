import type { ForecastSeriesOption } from "../config/forecastConfig";
import type { EndOfHorizonSummary } from "../types/forecastTypes";
import { formatPercent, formatPrice, getChangeTone } from "../utils/formatters";

type ForecastSummaryCardProps = {
  seriesOption: ForecastSeriesOption;
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
        {formatPrice(summary.forecast)} <small>{seriesOption.unit}</small>
      </span>
      <span className={`forecast-card-change tone-${getChangeTone(summary.change_pct)}`}>
        {formatPercent(summary.change_pct)} from {formatPrice(summary.latest)}
      </span>
      <span className="forecast-card-range">
        Range {formatPrice(summary.lower)} to {formatPrice(summary.upper)}
      </span>
    </button>
  );
}

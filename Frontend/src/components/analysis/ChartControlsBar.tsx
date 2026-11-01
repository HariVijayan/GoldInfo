import { CHART_RANGE_OPTIONS } from "../../config/chartRangeConfig";
import { PRICE_SERIES_OPTIONS } from "../../config/priceSeriesConfig";
import type { ChartRangeKey } from "../../types/chartTypes";
import type { PriceSeriesKey } from "../../types/priceSeriesTypes";

type ChartControlsBarProps = {
  selectedSeriesKey: PriceSeriesKey;
  onSelectSeries: (seriesKey: PriceSeriesKey) => void;
  selectedRangeKey: ChartRangeKey;
  onSelectRange: (rangeKey: ChartRangeKey) => void;
  /** Ranges the downloaded data is long enough to fill. */
  coveredRangeKeys: ReadonlySet<ChartRangeKey>;
  coverageCaption: string;
};

/** The one place that sets what every chart on the dashboard shows. */
export function ChartControlsBar({
  selectedSeriesKey,
  onSelectSeries,
  selectedRangeKey,
  onSelectRange,
  coveredRangeKeys,
  coverageCaption,
}: ChartControlsBarProps) {
  return (
    <section className="panel chart-toolbar" aria-label="Chart filters">
      <div className="chart-toolbar-group">
        <span className="chart-toolbar-label" id="chart-series-label">
          Show
        </span>
        <div role="radiogroup" aria-labelledby="chart-series-label" className="period-picker">
          {PRICE_SERIES_OPTIONS.map((seriesOption) => (
            <button
              key={seriesOption.key}
              type="button"
              role="radio"
              aria-checked={selectedSeriesKey === seriesOption.key}
              className="period-option"
              onClick={() => onSelectSeries(seriesOption.key)}
            >
              {seriesOption.shortLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-toolbar-group">
        <span className="chart-toolbar-label" id="chart-range-label">
          Time range
        </span>
        <div
          role="radiogroup"
          aria-labelledby="chart-range-label"
          className="period-picker range-picker"
        >
          {CHART_RANGE_OPTIONS.map((rangeOption) => {
            const isCovered = coveredRangeKeys.has(rangeOption.key);
            return (
              <button
                key={rangeOption.key}
                type="button"
                role="radio"
                aria-checked={selectedRangeKey === rangeOption.key}
                aria-label={`Chart range: ${rangeOption.spokenLabel}`}
                className="period-option period-option-compact"
                disabled={!isCovered}
                title={
                  isCovered
                    ? undefined
                    : "Not covered by the period you analysed. Run a longer period to use this range."
                }
                onClick={() => onSelectRange(rangeOption.key)}
              >
                {rangeOption.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="chart-toolbar-caption" aria-live="polite">
        {coverageCaption}
      </p>
    </section>
  );
}

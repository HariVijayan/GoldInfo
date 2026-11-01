import { getPriceSeriesOption } from "../../config/priceSeriesConfig";
import type { ForecastRangeBarModel } from "../../utils/forecastDashboardModel";
import { formatPercent, formatSeriesValue, getChangeTone } from "../../utils/formatters";

type ForecastRangeBarsProps = {
  rangeBarModels: ForecastRangeBarModel[];
  intervalPercent: number;
};

/**
 * One bar per series on its own percentage scale: the tick is the latest
 * actual value, the band is the likely range, the dot is the forecast.
 */
export function ForecastRangeBars({ rangeBarModels, intervalPercent }: ForecastRangeBarsProps) {
  return (
    <>
      <ul className="range-bar-list">
        {rangeBarModels.map((rangeBarModel) => {
          const seriesOption = getPriceSeriesOption(rangeBarModel.seriesKey);

          const scaleMinimum = Math.min(rangeBarModel.lowerChangePct, 0);
          const scaleMaximum = Math.max(rangeBarModel.upperChangePct, 0);
          const padding = (scaleMaximum - scaleMinimum) * 0.12 || 1;
          const paddedMinimum = scaleMinimum - padding;
          const paddedSpan = scaleMaximum + padding - paddedMinimum;
          const positionOf = (changePct: number) => ((changePct - paddedMinimum) / paddedSpan) * 100;

          const bandStart = positionOf(rangeBarModel.lowerChangePct);
          const bandWidth = positionOf(rangeBarModel.upperChangePct) - bandStart;

          return (
            <li key={rangeBarModel.seriesKey} className="range-bar-item">
              <div className="range-bar-heading">
                <span>{seriesOption.shortLabel}</span>
                <strong className={`tone-${getChangeTone(rangeBarModel.forecastChangePct)}`}>
                  {formatPercent(rangeBarModel.forecastChangePct)}
                </strong>
              </div>

              <div
                className="range-bar-track"
                role="img"
                aria-label={`${seriesOption.label}: forecast ${formatSeriesValue(
                  seriesOption,
                  rangeBarModel.forecast
                )}, likely between ${formatSeriesValue(seriesOption, rangeBarModel.lower)} and ${formatSeriesValue(
                  seriesOption,
                  rangeBarModel.upper
                )}`}
              >
                <div className="range-bar-band" style={{ left: `${bandStart}%`, width: `${bandWidth}%` }} />
                <div className="range-bar-latest" style={{ left: `${positionOf(0)}%` }} />
                <div className="range-bar-forecast" style={{ left: `${positionOf(rangeBarModel.forecastChangePct)}%` }} />
              </div>

              <div className="range-bar-values">
                <span>
                  {formatSeriesValue(seriesOption, rangeBarModel.lower)}{" "}
                  <small>({formatPercent(rangeBarModel.lowerChangePct)})</small>
                </span>
                <span>
                  {formatSeriesValue(seriesOption, rangeBarModel.upper)}{" "}
                  <small>({formatPercent(rangeBarModel.upperChangePct)})</small>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="chart-footnote">
        The tick is today’s latest value, the dot is the forecast, and the shaded band is the{" "}
        {intervalPercent}% range at the end of the horizon.
      </p>
    </>
  );
}

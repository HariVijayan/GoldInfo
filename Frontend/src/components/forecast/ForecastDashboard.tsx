import { useMemo } from "react";
import { HISTORY_SHOWN_OPTIONS, STEPS_PER_WEEK } from "../../config/forecastConfig";
import { GOLD_LABEL, INR_LABEL } from "../../config/displayLabels";
import { PRICE_SERIES_OPTIONS, getPriceSeriesOption } from "../../config/priceSeriesConfig";
import type { ForecastResult, ForecastSeriesKey } from "../../types/forecastTypes";
import { formatLongDate } from "../../utils/chartDates";
import { buildForecastChartModel } from "../../utils/forecastChartData";
import {
  buildEndOfHorizonChangeBars,
  buildForecastPeriodChanges,
  buildForecastRangeBarModels,
  buildIndexedForecastPath,
  buildRangeWidthSeries,
  findForecastExtremes,
} from "../../utils/forecastDashboardModel";
import { formatPercent, formatSeriesValue, formatShare } from "../../utils/formatters";
import { AreaTrendChart } from "../common/AreaTrendChart";
import { ChartEmptyMessage, ChartPanel } from "../common/ChartPanel";
import { DashboardLayout } from "../common/DashboardLayout";
import { IndexedComparisonChart } from "../common/IndexedComparisonChart";
import { MetricCard } from "../common/MetricCard";
import { ToneBarChart } from "../common/ToneBarChart";
import { ForecastChart } from "./ForecastChart";
import { ForecastRangeBars } from "./ForecastRangeBars";
import { ForecastSummaryCard } from "./ForecastSummaryCard";

type ForecastDashboardProps = {
  forecastResult: ForecastResult;
  selectedSeriesKey: ForecastSeriesKey;
  onSelectSeries: (seriesKey: ForecastSeriesKey) => void;
  historyWeeksShown: number;
  onSelectHistoryWeeks: (historyWeeks: number) => void;
};

const GRANULARITY_TITLES = { week: "week", month: "month", year: "year" } as const;

const formatOnePercentAxis = (tickValue: number) => `${tickValue.toFixed(1)}%`;

export function ForecastDashboard({
  forecastResult,
  selectedSeriesKey,
  onSelectSeries,
  historyWeeksShown,
  onSelectHistoryWeeks,
}: ForecastDashboardProps) {
  const { forecast, history, data_summary: dataSummary } = forecastResult;
  const seriesOption = getPriceSeriesOption(selectedSeriesKey);
  const intervalPercent = Math.round(forecast.interval_level * 100);
  const periodName = forecast.frequency === "daily" ? "day" : "week";
  const anchorDate = history.points[history.points.length - 1]?.date ?? dataSummary.history_end;
  const selectedSummary = forecast.end_of_horizon[selectedSeriesKey];

  const chartModel = useMemo(
    () =>
      buildForecastChartModel(
        selectedSeriesKey,
        history.points,
        forecast.points,
        historyWeeksShown * STEPS_PER_WEEK[forecast.frequency]
      ),
    [history.points, forecast.points, forecast.frequency, selectedSeriesKey, historyWeeksShown]
  );

  const indexedPath = useMemo(
    () => buildIndexedForecastPath(forecast.end_of_horizon, anchorDate, forecast.points),
    [forecast.end_of_horizon, anchorDate, forecast.points]
  );

  const rangeWidthSeries = useMemo(
    () => buildRangeWidthSeries(forecast.points, selectedSeriesKey),
    [forecast.points, selectedSeriesKey]
  );

  const periodChanges = useMemo(
    () =>
      buildForecastPeriodChanges(selectedSummary.latest, anchorDate, forecast.points, selectedSeriesKey),
    [selectedSummary.latest, anchorDate, forecast.points, selectedSeriesKey]
  );

  const endOfHorizonBars = useMemo(
    () => buildEndOfHorizonChangeBars(forecast.end_of_horizon),
    [forecast.end_of_horizon]
  );

  const rangeBarModels = useMemo(
    () => buildForecastRangeBarModels(forecast.end_of_horizon),
    [forecast.end_of_horizon]
  );

  const extremes = useMemo(
    () => findForecastExtremes(forecast.points, selectedSeriesKey),
    [forecast.points, selectedSeriesKey]
  );

  return (
    <DashboardLayout
      primaryColumn={
        <>
          <section className="forecast-cards" role="radiogroup" aria-label="Choose a price to chart">
            {PRICE_SERIES_OPTIONS.map((option) => (
              <ForecastSummaryCard
                key={option.key}
                seriesOption={option}
                summary={forecast.end_of_horizon[option.key]}
                isSelected={selectedSeriesKey === option.key}
                onSelect={() => onSelectSeries(option.key)}
              />
            ))}
          </section>

          <section className="panel chart-panel" aria-label={seriesOption.label}>
            <header className="chart-panel-header">
              <div className="chart-panel-titles">
                <h2>{seriesOption.label}</h2>
              </div>
              <div role="radiogroup" aria-label="History shown" className="period-picker">
                {HISTORY_SHOWN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={historyWeeksShown === option.value}
                    className="period-option"
                    onClick={() => onSelectHistoryWeeks(option.value)}
                  >
                    {option.label} back
                  </button>
                ))}
              </div>
            </header>

            <ForecastChart
              chartPoints={chartModel.chartPoints}
              lastHistoryDate={chartModel.lastHistoryDate}
              seriesOption={seriesOption}
              intervalPercent={intervalPercent}
            />

            <p className="chart-footnote">
              {forecast.steps} {forecast.frequency} points from {formatLongDate(forecast.start_date)} to{" "}
              {formatLongDate(forecast.end_date)}, trained on {dataSummary.observations_used}{" "}
              {forecast.frequency} observations ({formatLongDate(dataSummary.history_start)} onward).
            </p>
          </section>

          <ChartPanel
            title={`Projected paths, side by side`}
            subtitle={`Every line starts at 100 on the latest data. ${GOLD_LABEL} in ${INR_LABEL} is the dollar price of gold combined with the exchange rate.`}
          >
            <IndexedComparisonChart
              points={indexedPath}
              markerDate={anchorDate}
              markerLabel="Latest data"
              ariaLabel="Line chart comparing the forecast path of gold in rupees, gold in dollars and the exchange rate, each starting at 100"
            />
          </ChartPanel>

          <ChartPanel
            title="How the range widens"
            subtitle={`${seriesOption.shortLabel}. Width of the ${intervalPercent}% range as a share of the forecast: the further ahead, the less certain.`}
          >
            <AreaTrendChart
              points={rangeWidthSeries}
              seriesName="Range width"
              colorVariable="var(--color-gold)"
              baselineValue={0}
              formatValue={(value) => formatShare(value, 1)}
              formatAxisValue={(tickValue) => `${tickValue.toFixed(0)}%`}
              height={210}
              ariaLabel={`Area chart of how the forecast range widens over time for ${seriesOption.label}`}
            />
          </ChartPanel>
        </>
      }
      secondaryColumn={
        <>
          <ChartPanel title="Forecast summary" subtitle={seriesOption.shortLabel}>
            <div className="metrics-grid metrics-grid-compact">
              <MetricCard
                metricTitle="Latest actual"
                metricValue={formatSeriesValue(seriesOption, selectedSummary.latest)}
                metricCaption={formatLongDate(anchorDate)}
              />
              <MetricCard
                metricTitle="Highest forecast point"
                metricValue={formatSeriesValue(seriesOption, extremes?.highest.value)}
                metricCaption={extremes ? formatLongDate(extremes.highest.date) : undefined}
              />
              <MetricCard
                metricTitle="Lowest forecast point"
                metricValue={formatSeriesValue(seriesOption, extremes?.lowest.value)}
                metricCaption={extremes ? formatLongDate(extremes.lowest.date) : undefined}
              />
              <MetricCard
                metricTitle="Forecast length"
                metricValue={`${forecast.steps} ${periodName}s`}
                metricCaption={`${formatLongDate(forecast.start_date)} to ${formatLongDate(forecast.end_date)}`}
              />
              <MetricCard
                metricTitle="Training data"
                metricValue={dataSummary.observations_used.toLocaleString("en-IN")}
                metricCaption={`${forecast.frequency} observations from ${formatLongDate(dataSummary.history_start)}`}
              />
              <MetricCard
                metricTitle="Range level"
                metricValue={`${intervalPercent}%`}
                metricCaption="Shaded band on the charts"
              />
            </div>
          </ChartPanel>

          <ChartPanel
            title="Where each price could land"
            subtitle={`By ${formatLongDate(forecast.end_date)}, as a change from the latest value.`}
          >
            <ForecastRangeBars rangeBarModels={rangeBarModels} intervalPercent={intervalPercent} />
          </ChartPanel>

          <ChartPanel
            title="Expected change by the end"
            subtitle={`Forecast change by ${formatLongDate(forecast.end_date)} for each price.`}
          >
            <ToneBarChart
              bars={endOfHorizonBars}
              seriesName="Expected change"
              formatValue={formatPercent}
              formatAxisValue={formatOnePercentAxis}
              height={220}
              ariaLabel="Bar chart of the expected change at the end of the forecast for each price"
            />
          </ChartPanel>

          <ChartPanel
            title={`Expected change each ${GRANULARITY_TITLES[periodChanges.granularity]}`}
            subtitle={`${seriesOption.shortLabel}. Green bars rise, red bars fall.`}
          >
            {periodChanges.bars.length > 0 ? (
              <ToneBarChart
                bars={periodChanges.bars}
                seriesName="Expected change"
                formatValue={formatPercent}
                formatAxisValue={formatOnePercentAxis}
                height={230}
                ariaLabel={`Bar chart of the expected change each ${periodChanges.granularity} for ${seriesOption.label}`}
              />
            ) : (
              <ChartEmptyMessage message="The forecast is too short to split into periods." />
            )}
          </ChartPanel>
        </>
      }
    />
  );
}

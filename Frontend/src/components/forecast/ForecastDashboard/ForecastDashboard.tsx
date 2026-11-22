import { useMemo } from "react";
import { STEPS_PER_WEEK } from "../../../config/forecast/forecastConfig";
import { getPriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import type { ForecastResult, ForecastSeriesKey } from "../../../types/forecast/forecastTypes";
import { buildForecastChartModel } from "../../../utils/forecast/forecastChartData";
import {
  buildEndOfHorizonChangeBars,
  buildForecastPeriodChanges,
  buildForecastRangeBarModels,
  buildIndexedForecastPath,
  buildRangeWidthSeries,
  findForecastExtremes,
} from "../../../utils/forecast/forecastDashboardModel";
import { DashboardGrid } from "../../common/DashboardGrid";
import { DashboardSection } from "../../common/DashboardSection";
import { EndOfHorizonPanel } from "../EndOfHorizonPanel";
import { ForecastMainChartPanel } from "../ForecastMainChartPanel";
import { ForecastSeriesCards } from "../ForecastSeriesCards";
import { ForecastTable } from "../ForecastTable";
import { ForecastSummaryPanel } from "../ForecastSummaryPanel";
import { PeriodChangesPanel } from "../PeriodChangesPanel";
import { ProjectedPathsPanel } from "../ProjectedPathsPanel";
import { RangeLandingPanel } from "../RangeLandingPanel";
import { RangeWidthPanel } from "../RangeWidthPanel";

type ForecastDashboardProps = {
  forecastResult: ForecastResult;
  selectedSeriesKey: ForecastSeriesKey;
  onSelectSeries: (seriesKey: ForecastSeriesKey) => void;
  historyWeeksShown: number;
  onSelectHistoryWeeks: (historyWeeks: number) => void;
};

/**
 * Result of the Forecast tab, top to bottom: the price cards, every chart
 * across both columns, the summary statistics in a single column, then the
 * table of every forecast point.
 */
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
    () => buildForecastPeriodChanges(selectedSummary.latest, anchorDate, forecast.points, selectedSeriesKey),
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
    <DashboardGrid>
      <ForecastSeriesCards
        endOfHorizon={forecast.end_of_horizon}
        selectedSeriesKey={selectedSeriesKey}
        onSelectSeries={onSelectSeries}
      />

      <ForecastMainChartPanel
        seriesOption={seriesOption}
        chartModel={chartModel}
        intervalPercent={intervalPercent}
        historyWeeksShown={historyWeeksShown}
        onSelectHistoryWeeks={onSelectHistoryWeeks}
        footnote={{
          steps: forecast.steps,
          frequency: forecast.frequency,
          startDate: forecast.start_date,
          endDate: forecast.end_date,
          observationsUsed: dataSummary.observations_used,
          historyStart: dataSummary.history_start,
        }}
      />

      <ProjectedPathsPanel indexedPath={indexedPath} anchorDate={anchorDate} />
      <RangeWidthPanel
        seriesOption={seriesOption}
        rangeWidthSeries={rangeWidthSeries}
        intervalPercent={intervalPercent}
      />
      <RangeLandingPanel
        rangeBarModels={rangeBarModels}
        intervalPercent={intervalPercent}
        endDate={forecast.end_date}
      />
      <EndOfHorizonPanel bars={endOfHorizonBars} endDate={forecast.end_date} />
      <PeriodChangesPanel
        seriesOption={seriesOption}
        granularity={periodChanges.granularity}
        bars={periodChanges.bars}
      />

      <ForecastSummaryPanel
        seriesOption={seriesOption}
        latestValue={selectedSummary.latest}
        anchorDate={anchorDate}
        extremes={extremes}
        steps={forecast.steps}
        periodName={periodName}
        startDate={forecast.start_date}
        endDate={forecast.end_date}
        observationsUsed={dataSummary.observations_used}
        frequency={forecast.frequency}
        historyStart={dataSummary.history_start}
        intervalPercent={intervalPercent}
      />

      <DashboardSection span="full">
        <ForecastTable forecastPoints={forecast.points} frequency={forecast.frequency} />
      </DashboardSection>
    </DashboardGrid>
  );
}

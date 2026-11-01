import { useMemo, useState } from "react";
import {
  LONG_MOVING_AVERAGE_WINDOW,
  ROLLING_VOLATILITY_WINDOW,
  SHORT_MOVING_AVERAGE_WINDOW,
} from "../../config/analysisChartConfig";
import { INR_LABEL } from "../../config/displayLabels";
import { getPriceSeriesOption } from "../../config/priceSeriesConfig";
import type { AgentResult } from "../../types/analysisTypes";
import type { ChartRangeKey } from "../../types/chartTypes";
import type { PricePoint, PriceSeriesKey } from "../../types/priceSeriesTypes";
import { buildAnalysisDashboardModel } from "../../utils/analysisDashboardModel";
import { formatLongDate } from "../../utils/chartDates";
import { describeChartRange, getChartRangeOption } from "../../utils/chartRange";
import { formatPercent, formatShare } from "../../utils/formatters";
import { ChartEmptyMessage, ChartPanel, ChartPanelSection } from "../common/ChartPanel";
import { AreaTrendChart } from "../common/AreaTrendChart";
import { DashboardLayout } from "../common/DashboardLayout";
import { IndexedComparisonChart } from "../common/IndexedComparisonChart";
import { ShareDonutChart } from "../common/ShareDonutChart";
import { ToneBarChart } from "../common/ToneBarChart";
import { AnalysisHero } from "./AnalysisHero";
import { ChartControlsBar } from "./ChartControlsBar";
import { InterpretationPanel } from "./InterpretationPanel";
import { KeyMetricsGrid } from "./KeyMetricsGrid";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { WindowStatisticsPanel } from "./WindowStatisticsPanel";

type AnalysisDashboardProps = {
  analysisResult: AgentResult;
  pricePoints: PricePoint[];
  selectedPeriodLabel: string;
  selectedSeriesKey: PriceSeriesKey;
  onSelectSeries: (seriesKey: PriceSeriesKey) => void;
  selectedRangeKey: ChartRangeKey;
  onSelectRange: (rangeKey: ChartRangeKey) => void;
  coveredRangeKeys: ReadonlySet<ChartRangeKey>;
};

const GRANULARITY_TITLES = { week: "Weekly", month: "Monthly", year: "Yearly" } as const;

const formatWholePercentAxis = (tickValue: number) => `${tickValue.toFixed(0)}%`;
const formatOnePercentAxis = (tickValue: number) => `${tickValue.toFixed(1)}%`;
const formatDayCount = (dayCount: number) => `${dayCount} days`;
const formatCountAxis = (tickValue: number) => tickValue.toFixed(0);

export function AnalysisDashboard({
  analysisResult,
  pricePoints,
  selectedPeriodLabel,
  selectedSeriesKey,
  onSelectSeries,
  selectedRangeKey,
  onSelectRange,
  coveredRangeKeys,
}: AnalysisDashboardProps) {
  const [showShortAverage, setShowShortAverage] = useState(true);
  const [showLongAverage, setShowLongAverage] = useState(false);

  const seriesOption = getPriceSeriesOption(selectedSeriesKey);
  const rangeOption = getChartRangeOption(selectedRangeKey);
  const rangePhrase = describeChartRange(rangeOption);

  const model = useMemo(
    () => buildAnalysisDashboardModel(pricePoints, selectedSeriesKey, rangeOption),
    [pricePoints, selectedSeriesKey, rangeOption]
  );

  const metrics = analysisResult.analysis;
  const seriesAndRange = `${seriesOption.shortLabel}, ${rangePhrase}`;

  const coverageCaption = model
    ? `${model.observationCount.toLocaleString("en-IN")} observations from ${formatLongDate(
      model.firstDate
    )} to ${formatLongDate(model.lastDate)}.`
    : "No price history in this response.";

  const hasEnoughObservations = model !== null && model.observationCount >= 2;

  const heroPanel = <AnalysisHero metrics={metrics} selectedPeriodLabel={selectedPeriodLabel} />;

  if (model === null || !hasEnoughObservations) {
    return (
      <>
        <ChartControlsBar
          selectedSeriesKey={selectedSeriesKey}
          onSelectSeries={onSelectSeries}
          selectedRangeKey={selectedRangeKey}
          onSelectRange={onSelectRange}
          coveredRangeKeys={coveredRangeKeys}
          coverageCaption={coverageCaption}
        />
        <DashboardLayout
          primaryColumn={
            <>
              {heroPanel}
              <ChartPanel title="Charts">
                <ChartEmptyMessage
                  message={
                    model === null
                      ? "The server response did not include price history, so charts are unavailable."
                      : "This range holds fewer than two observations. Choose a longer range."
                  }
                />
              </ChartPanel>
            </>
          }
          secondaryColumn={
            <>
              <KeyMetricsGrid metrics={metrics} />
              <InterpretationPanel interpretation={analysisResult.interpretation} />
            </>
          }
        />
      </>
    );
  }

  const priceToggles = (
    <div className="toggle-group">
      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showShortAverage && model.hasShortAverage}
          disabled={!model.hasShortAverage}
          onChange={(changeEvent) => setShowShortAverage(changeEvent.target.checked)}
        />
        {SHORT_MOVING_AVERAGE_WINDOW}-day average
      </label>
      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showLongAverage && model.hasLongAverage}
          disabled={!model.hasLongAverage}
          onChange={(changeEvent) => setShowLongAverage(changeEvent.target.checked)}
        />
        {LONG_MOVING_AVERAGE_WINDOW}-day average
      </label>
    </div>
  );

  return (
    <>


      <DashboardLayout
        primaryColumn={
          <>
            {heroPanel}

            <ChartControlsBar
              selectedSeriesKey={selectedSeriesKey}
              onSelectSeries={onSelectSeries}
              selectedRangeKey={selectedRangeKey}
              onSelectRange={onSelectRange}
              coveredRangeKeys={coveredRangeKeys}
              coverageCaption={coverageCaption}
            />

            <ChartPanel
              title={seriesOption.label}
              subtitle={`Daily closing price over ${rangePhrase}.`}
              controls={priceToggles}
            >
              <PriceHistoryChart
                chartPoints={model.priceChartPoints}
                seriesOption={seriesOption}
                windowHigh={model.windowHigh}
                windowLow={model.windowLow}
                showShortAverage={showShortAverage && model.hasShortAverage}
                showLongAverage={showLongAverage && model.hasLongAverage}
              />
            </ChartPanel>

            <ChartPanel
              title={`What moved the ${INR_LABEL} price`}
              subtitle={`Every line starts at 100 at the beginning of the range, over ${rangePhrase}. Gold in rupees follows gold in dollars and the exchange rate together.`}
            >
              <IndexedComparisonChart
                points={model.indexedPoints}
                ariaLabel={`Line chart comparing the percentage change of gold in rupees, gold in dollars and the exchange rate over ${rangePhrase}`}
              />
            </ChartPanel>

            <ChartPanel
              title="How rough the ride was"
              subtitle={`${seriesAndRange}. Both charts share the same dates.`}
            >
              <ChartPanelSection
                title="Drawdown"
                subtitle={`How far the price sat below its highest earlier point. Deepest: ${formatPercent(
                  model.statistics.maximumDrawdownPct
                )}.`}
              >
                <AreaTrendChart
                  points={model.drawdownPoints}
                  seriesName="Below peak"
                  colorVariable="var(--color-negative)"
                  baselineValue={0}
                  formatValue={formatPercent}
                  formatAxisValue={formatWholePercentAxis}
                  height={190}
                  ariaLabel={`Area chart of drawdown from the running peak for ${seriesAndRange}`}
                />
              </ChartPanelSection>

              <ChartPanelSection
                title="Volatility"
                subtitle={`Annualised, measured over a rolling ${ROLLING_VOLATILITY_WINDOW}-day window.`}
              >
                {model.volatilityPoints.length > 1 ? (
                  <AreaTrendChart
                    points={model.volatilityPoints}
                    seriesName="Volatility"
                    colorVariable="var(--color-series-fx)"
                    baselineValue={0}
                    formatValue={(value) => formatShare(value, 1)}
                    formatAxisValue={formatWholePercentAxis}
                    height={190}
                    ariaLabel={`Area chart of rolling ${ROLLING_VOLATILITY_WINDOW}-day volatility for ${seriesAndRange}`}
                  />
                ) : (
                  <ChartEmptyMessage
                    message={`Volatility needs at least ${ROLLING_VOLATILITY_WINDOW + 1} observations in total.`}
                  />
                )}
              </ChartPanelSection>
            </ChartPanel>

            <ChartPanel
              title={`${GRANULARITY_TITLES[model.returnGranularity]} change`}
              subtitle={`${seriesAndRange}. Green bars rose, red bars fell.`}
            >
              {model.periodReturnBars.length > 0 ? (
                <ToneBarChart
                  bars={model.periodReturnBars}
                  seriesName="Change"
                  formatValue={formatPercent}
                  formatAxisValue={formatOnePercentAxis}
                  height={240}
                  ariaLabel={`Bar chart of ${model.returnGranularity}ly change for ${seriesAndRange}`}
                />
              ) : (
                <ChartEmptyMessage message="Not enough observations to compare periods." />
              )}
            </ChartPanel>
          </>
        }
        secondaryColumn={
          <>
            <KeyMetricsGrid metrics={metrics} />
            <InterpretationPanel interpretation={analysisResult.interpretation} />

            <WindowStatisticsPanel
              title={`Statistics for ${rangePhrase}`}
              subtitle={seriesOption.shortLabel}
              model={model}
            />

            <ChartPanel title="Daily moves" subtitle={seriesAndRange}>
              <ChartPanelSection
                title="Spread of daily changes"
                subtitle="How many days fell into each size of move. Most days cluster near zero."
              >
                {model.histogramBars.length > 0 ? (
                  <ToneBarChart
                    bars={model.histogramBars}
                    seriesName="Days"
                    formatValue={formatDayCount}
                    formatAxisValue={formatCountAxis}
                    showZeroLine={false}
                    height={220}
                    ariaLabel={`Histogram of daily percentage changes for ${seriesAndRange}`}
                  />
                ) : (
                  <ChartEmptyMessage message="At least 30 daily changes are needed to draw the spread. Choose a longer range." />
                )}
              </ChartPanelSection>

              <ChartPanelSection title="Up days and down days">
                <ShareDonutChart
                  slices={[
                    { label: "Rose", value: model.directionCounts.up, colorVariable: "var(--color-positive)" },
                    { label: "Fell", value: model.directionCounts.down, colorVariable: "var(--color-negative)" },
                    { label: "Unchanged", value: model.directionCounts.flat, colorVariable: "var(--color-ink-muted)" },
                  ]}
                  centerValue={formatShare(model.statistics.upDayShare, 0)}
                  centerCaption="rose"
                  ariaLabel={`Donut chart: ${model.directionCounts.up} days rose, ${model.directionCounts.down} fell and ${model.directionCounts.flat} were unchanged`}
                />
              </ChartPanelSection>
            </ChartPanel>

            <ChartPanel
              title="Average change by calendar month"
              subtitle={`${seriesOption.shortLabel}. Shows whether some months tend to be stronger.`}
            >
              {model.isSeasonalityAvailable && model.seasonalityBars.length > 0 ? (
                <ToneBarChart
                  bars={model.seasonalityBars}
                  seriesName="Average change"
                  formatValue={formatPercent}
                  formatAxisValue={formatOnePercentAxis}
                  height={230}
                  ariaLabel={`Bar chart of average change by calendar month for ${seriesAndRange}`}
                />
              ) : (
                <ChartEmptyMessage message="This needs at least 3 years of history. Choose 3Y or longer, or analyse a longer period." />
              )}
            </ChartPanel>
          </>
        }
      />
    </>
  );
}

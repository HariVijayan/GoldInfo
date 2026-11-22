import { useMemo } from "react";
import { getPriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import { useRetailPricing } from "../../../hooks/shared/useRetailPricing";
import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import type { AgentResult } from "../../../types/analysis/analysisTypes";
import type { ChartRangeKey } from "../../../types/shared/chartTypes";
import type { PricePoint, PriceSeriesKey } from "../../../types/shared/priceSeriesTypes";
import { buildAnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { formatLongDate } from "../../../utils/shared/chartDates";
import { describeChartRange, getChartRangeOption } from "../../../utils/shared/chartRange";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { DashboardGrid } from "../../common/DashboardGrid";
import { DashboardSection } from "../../common/DashboardSection";
import { AiOverviewPanel } from "../AiOverviewPanel";
import { AnalysisHero } from "../AnalysisHero";
import { ChartControlsBar } from "../ChartControlsBar";
import { DailyMovesPanel } from "../DailyMovesPanel";
import { IndexedComparisonPanel } from "../IndexedComparisonPanel";
import { KeyMetricsGrid } from "../KeyMetricsGrid";
import { PeriodChangePanel } from "../PeriodChangePanel";
import { PriceHistoryPanel } from "../PriceHistoryPanel";
import { RoughRidePanel } from "../RoughRidePanel";
import { SeasonalityPanel } from "../SeasonalityPanel";
import { WindowStatisticsPanel } from "../WindowStatisticsPanel";

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

/**
 * Result of the Historical analysis tab, top to bottom: the AI overview,
 * the headline price, the time range controls, every chart across both
 * columns, then the statistics in single columns.
 */
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
  const { priceView } = useRetailPricing();
  const seriesOption = getPriceSeriesOption(selectedSeriesKey);
  const rangeOption = getChartRangeOption(selectedRangeKey);
  const rangePhrase = describeChartRange(rangeOption);

  const model = useMemo(
    () => buildAnalysisDashboardModel(pricePoints, selectedSeriesKey, rangeOption),
    [pricePoints, selectedSeriesKey, rangeOption]
  );

  const scope: AnalysisChartScope = {
    seriesOption,
    rangePhrase,
    seriesAndRange: `${seriesOption.shortLabel}, ${rangePhrase}`,
  };

  const coverageCaption = model
    ? `${model.observationCount.toLocaleString("en-IN")} observations from ${formatLongDate(
        model.firstDate
      )} to ${formatLongDate(model.lastDate)}.`
    : "No price history in this response.";

  const modelName = String(analysisResult.request.model ?? "");
  const hasEnoughObservations = model !== null && model.observationCount >= 2;

  return (
    <DashboardGrid>
      <AiOverviewPanel
        interpretation={analysisResult.interpretation}
        viewLabel={priceView === "retail" ? "Retail" : "Original"}
        modelName={modelName}
      />

      <DashboardSection span="full">
        <AnalysisHero metrics={analysisResult.analysis} selectedPeriodLabel={selectedPeriodLabel} />
      </DashboardSection>

      <DashboardSection span="full">
        <ChartControlsBar
          selectedSeriesKey={selectedSeriesKey}
          onSelectSeries={onSelectSeries}
          selectedRangeKey={selectedRangeKey}
          onSelectRange={onSelectRange}
          coveredRangeKeys={coveredRangeKeys}
          coverageCaption={coverageCaption}
        />
      </DashboardSection>

      {model === null || !hasEnoughObservations ? (
        <ChartPanel title="Charts">
          <ChartEmptyMessage
            message={
              model === null
                ? "The server response did not include price history, so charts are unavailable."
                : "This range holds fewer than two observations. Choose a longer range."
            }
          />
        </ChartPanel>
      ) : (
        <>
          <PriceHistoryPanel model={model} scope={scope} />
          <IndexedComparisonPanel model={model} scope={scope} />
          <RoughRidePanel model={model} scope={scope} />
          <PeriodChangePanel model={model} scope={scope} />
          <DailyMovesPanel model={model} scope={scope} />
          <SeasonalityPanel model={model} scope={scope} />
        </>
      )}

      <DashboardSection span="single">
        <KeyMetricsGrid metrics={analysisResult.analysis} />
      </DashboardSection>

      {model !== null && hasEnoughObservations && (
        <WindowStatisticsPanel
          title={`Statistics for ${rangePhrase}`}
          subtitle={seriesOption.shortLabel}
          model={model}
        />
      )}
    </DashboardGrid>
  );
}

import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import { formatOnePercentAxis } from "../../../utils/analysis/axisFormatters";
import type { AnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { formatPercent } from "../../../utils/shared/formatters";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { ToneBarChart } from "../../common/ToneBarChart";

type SeasonalityPanelProps = { model: AnalysisDashboardModel; scope: AnalysisChartScope };

/** Average change in each calendar month. */
export function SeasonalityPanel({ model, scope }: SeasonalityPanelProps) {
  return (
    <ChartPanel
      title="Average change by calendar month"
      subtitle={`${scope.seriesOption.shortLabel}. Shows whether some months tend to be stronger.`}
    >
      {model.isSeasonalityAvailable && model.seasonalityBars.length > 0 ? (
        <ToneBarChart
          bars={model.seasonalityBars}
          seriesName="Average change"
          formatValue={formatPercent}
          formatAxisValue={formatOnePercentAxis}
          height={230}
          ariaLabel={`Bar chart of average change by calendar month for ${scope.seriesAndRange}`}
        />
      ) : (
        <ChartEmptyMessage message="This needs at least 3 years of history. Choose 3Y or longer, or analyse a longer period." />
      )}
    </ChartPanel>
  );
}

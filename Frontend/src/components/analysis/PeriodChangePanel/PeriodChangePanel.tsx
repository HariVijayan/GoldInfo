import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import { formatOnePercentAxis } from "../../../utils/analysis/axisFormatters";
import type { AnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { formatPercent } from "../../../utils/shared/formatters";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { ToneBarChart } from "../../common/ToneBarChart";

const GRANULARITY_TITLES = { week: "Weekly", month: "Monthly", year: "Yearly" } as const;

type PeriodChangePanelProps = { model: AnalysisDashboardModel; scope: AnalysisChartScope };

/** Change per week, month, or year, depending on how long the range is. */
export function PeriodChangePanel({ model, scope }: PeriodChangePanelProps) {
  return (
    <ChartPanel
      title={`${GRANULARITY_TITLES[model.returnGranularity]} change`}
      subtitle={`${scope.seriesAndRange}. Green bars rose, red bars fell.`}
    >
      {model.periodReturnBars.length > 0 ? (
        <ToneBarChart
          bars={model.periodReturnBars}
          seriesName="Change"
          formatValue={formatPercent}
          formatAxisValue={formatOnePercentAxis}
          height={240}
          ariaLabel={`Bar chart of ${model.returnGranularity}ly change for ${scope.seriesAndRange}`}
        />
      ) : (
        <ChartEmptyMessage message="Not enough observations to compare periods." />
      )}
    </ChartPanel>
  );
}

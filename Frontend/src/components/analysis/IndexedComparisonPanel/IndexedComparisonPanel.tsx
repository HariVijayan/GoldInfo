import { INR_LABEL } from "../../../config/shared/displayLabels";
import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import type { AnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { ChartPanel } from "../../common/ChartPanel";
import { IndexedComparisonChart } from "../../common/IndexedComparisonChart";

type IndexedComparisonPanelProps = { model: AnalysisDashboardModel; scope: AnalysisChartScope };

/** Gold in rupees, gold in dollars and the exchange rate, all starting at 100. */
export function IndexedComparisonPanel({ model, scope }: IndexedComparisonPanelProps) {
  return (
    <ChartPanel
      title={`What moved the ${INR_LABEL} price`}
      subtitle={`Every line starts at 100 at the beginning of the range, over ${scope.rangePhrase}. Gold in rupees follows gold in dollars and the exchange rate together.`}
    >
      <IndexedComparisonChart
        points={model.indexedPoints}
        ariaLabel={`Line chart comparing the percentage change of gold in rupees, gold in dollars and the exchange rate over ${scope.rangePhrase}`}
      />
    </ChartPanel>
  );
}

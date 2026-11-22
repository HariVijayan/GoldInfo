import { ROLLING_VOLATILITY_WINDOW } from "../../../config/analysis/analysisChartConfig";
import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import { formatWholePercentAxis } from "../../../utils/analysis/axisFormatters";
import type { AnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { formatPercent, formatShare } from "../../../utils/shared/formatters";
import { AreaTrendChart } from "../../common/AreaTrendChart";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { ChartPanelSection } from "../../common/ChartPanelSection";

type RoughRidePanelProps = { model: AnalysisDashboardModel; scope: AnalysisChartScope };

/** Drawdown and volatility side by side: how far the price fell, and how jumpy it was. */
export function RoughRidePanel({ model, scope }: RoughRidePanelProps) {
  return (
    <ChartPanel title="How rough the ride was" subtitle={`${scope.seriesAndRange}. Both charts share the same dates.`}>
      <div className="chart-panel-sections">
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
            ariaLabel={`Area chart of drawdown from the running peak for ${scope.seriesAndRange}`}
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
              ariaLabel={`Area chart of rolling ${ROLLING_VOLATILITY_WINDOW}-day volatility for ${scope.seriesAndRange}`}
            />
          ) : (
            <ChartEmptyMessage
              message={`Volatility needs at least ${ROLLING_VOLATILITY_WINDOW + 1} observations in total.`}
            />
          )}
        </ChartPanelSection>
      </div>
    </ChartPanel>
  );
}

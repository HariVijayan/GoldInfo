import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import { formatCountAxis, formatDayCount } from "../../../utils/analysis/axisFormatters";
import type { AnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { formatShare } from "../../../utils/shared/formatters";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { ChartPanelSection } from "../../common/ChartPanelSection";
import { ShareDonutChart } from "../../common/ShareDonutChart";
import { ToneBarChart } from "../../common/ToneBarChart";

type DailyMovesPanelProps = { model: AnalysisDashboardModel; scope: AnalysisChartScope };

/** How daily changes are spread, and how many days rose or fell. */
export function DailyMovesPanel({ model, scope }: DailyMovesPanelProps) {
  const { directionCounts } = model;

  return (
    <ChartPanel title="Daily moves" subtitle={scope.seriesAndRange}>
      <div className="chart-panel-sections">
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
              ariaLabel={`Histogram of daily percentage changes for ${scope.seriesAndRange}`}
            />
          ) : (
            <ChartEmptyMessage message="At least 30 daily changes are needed to draw the spread. Choose a longer range." />
          )}
        </ChartPanelSection>

        <ChartPanelSection title="Up days and down days">
          <ShareDonutChart
            slices={[
              { label: "Rose", value: directionCounts.up, colorVariable: "var(--color-positive)" },
              { label: "Fell", value: directionCounts.down, colorVariable: "var(--color-negative)" },
              { label: "Unchanged", value: directionCounts.flat, colorVariable: "var(--color-ink-muted)" },
            ]}
            centerValue={formatShare(model.statistics.upDayShare, 0)}
            centerCaption="rose"
            ariaLabel={`Donut chart: ${directionCounts.up} days rose, ${directionCounts.down} fell and ${directionCounts.flat} were unchanged`}
          />
        </ChartPanelSection>
      </div>
    </ChartPanel>
  );
}

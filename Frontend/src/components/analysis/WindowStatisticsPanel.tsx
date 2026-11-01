import { TRADING_PERIODS_PER_YEAR } from "../../config/analysisChartConfig";
import type { AnalysisDashboardModel } from "../../utils/analysisDashboardModel";
import { formatDate, formatPercent, formatShare, getChangeTone } from "../../utils/formatters";
import { ChartPanel } from "../common/ChartPanel";
import { MetricCard } from "../common/MetricCard";

type WindowStatisticsPanelProps = {
  title: string;
  subtitle: string;
  model: AnalysisDashboardModel;
};

export function WindowStatisticsPanel({ title, subtitle, model }: WindowStatisticsPanelProps) {
  const { statistics, directionCounts } = model;
  const changeCount = directionCounts.up + directionCounts.down + directionCounts.flat;

  return (
    <ChartPanel title={title} subtitle={subtitle}>
      <div className="metrics-grid metrics-grid-compact">
        <MetricCard
          metricTitle="Change over range"
          metricValue={formatPercent(statistics.changePct)}
          metricCaption={`${formatDate(model.firstDate)} to ${formatDate(model.lastDate)}`}
          changeTone={getChangeTone(statistics.changePct)}
        />
        <MetricCard
          metricTitle="Volatility"
          metricValue={formatShare(statistics.annualisedVolatilityPct, 1)}
          metricCaption={`Annualised, ${TRADING_PERIODS_PER_YEAR} trading days`}
        />
        <MetricCard
          metricTitle="Deepest drawdown"
          metricValue={formatPercent(statistics.maximumDrawdownPct)}
          metricCaption={
            statistics.maximumDrawdownDate ? formatDate(statistics.maximumDrawdownDate) : "No decline"
          }
          changeTone={getChangeTone(statistics.maximumDrawdownPct)}
        />
        <MetricCard
          metricTitle="Days that rose"
          metricValue={formatShare(statistics.upDayShare, 0)}
          metricCaption={`${directionCounts.up} of ${changeCount} days`}
        />
        <MetricCard
          metricTitle="Best day"
          metricValue={formatPercent(statistics.bestDay?.value)}
          metricCaption={statistics.bestDay ? formatDate(statistics.bestDay.date) : undefined}
          changeTone={getChangeTone(statistics.bestDay?.value)}
        />
        <MetricCard
          metricTitle="Worst day"
          metricValue={formatPercent(statistics.worstDay?.value)}
          metricCaption={statistics.worstDay ? formatDate(statistics.worstDay.date) : undefined}
          changeTone={getChangeTone(statistics.worstDay?.value)}
        />
      </div>
    </ChartPanel>
  );
}

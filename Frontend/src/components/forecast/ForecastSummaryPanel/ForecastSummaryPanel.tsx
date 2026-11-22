import type { PriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import { formatLongDate } from "../../../utils/shared/chartDates";
import { formatSeriesValue } from "../../../utils/shared/formatters";
import { ChartPanel } from "../../common/ChartPanel";
import { MetricCard } from "../../common/MetricCard";

type ForecastSummaryPanelProps = {
  seriesOption: PriceSeriesOption;
  latestValue: number;
  anchorDate: string;
  extremes: { highest: { value: number; date: string }; lowest: { value: number; date: string } } | null;
  steps: number;
  periodName: string;
  startDate: string;
  endDate: string;
  observationsUsed: number;
  frequency: string;
  historyStart: string;
  intervalPercent: number;
};

/** The headline numbers of the forecast for the chosen price. */
export function ForecastSummaryPanel(props: ForecastSummaryPanelProps) {
  const { seriesOption, extremes } = props;

  return (
    <ChartPanel title="Forecast summary" subtitle={seriesOption.shortLabel} span="single">
      <div className="metrics-grid metrics-grid-compact">
        <MetricCard
          metricTitle="Latest actual"
          metricValue={formatSeriesValue(seriesOption, props.latestValue)}
          metricCaption={formatLongDate(props.anchorDate)}
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
          metricValue={`${props.steps} ${props.periodName}s`}
          metricCaption={`${formatLongDate(props.startDate)} to ${formatLongDate(props.endDate)}`}
        />
        <MetricCard
          metricTitle="Training data"
          metricValue={props.observationsUsed.toLocaleString("en-IN")}
          metricCaption={`${props.frequency} observations from ${formatLongDate(props.historyStart)}`}
        />
        <MetricCard
          metricTitle="Range level"
          metricValue={`${props.intervalPercent}%`}
          metricCaption="Shaded band on the charts"
        />
      </div>
    </ChartPanel>
  );
}

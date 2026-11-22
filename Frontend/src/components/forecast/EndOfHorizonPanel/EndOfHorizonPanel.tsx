import type { ToneBarDatum } from "../../../types/shared/chartTypes";
import { formatPercent } from "../../../utils/shared/formatters";
import { formatLongDate } from "../../../utils/shared/chartDates";
import { ChartPanel } from "../../common/ChartPanel";
import { ToneBarChart } from "../../common/ToneBarChart";

const formatOnePercentAxis = (tickValue: number) => `${tickValue.toFixed(1)}%`;

type EndOfHorizonPanelProps = { bars: ToneBarDatum[]; endDate: string };

/** The forecast change at the end of the horizon, for each price. */
export function EndOfHorizonPanel({ bars, endDate }: EndOfHorizonPanelProps) {
  return (
    <ChartPanel
      title="Expected change by the end"
      subtitle={`Forecast change by ${formatLongDate(endDate)} for each price.`}
    >
      <ToneBarChart
        bars={bars}
        seriesName="Expected change"
        formatValue={formatPercent}
        formatAxisValue={formatOnePercentAxis}
        height={220}
        ariaLabel="Bar chart of the expected change at the end of the forecast for each price"
      />
    </ChartPanel>
  );
}

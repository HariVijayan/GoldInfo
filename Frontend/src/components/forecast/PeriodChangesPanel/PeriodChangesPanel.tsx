import type { PriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import type { ToneBarDatum } from "../../../types/shared/chartTypes";
import { formatPercent } from "../../../utils/shared/formatters";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { ToneBarChart } from "../../common/ToneBarChart";

const formatOnePercentAxis = (tickValue: number) => `${tickValue.toFixed(1)}%`;

type PeriodChangesPanelProps = {
  seriesOption: PriceSeriesOption;
  granularity: "week" | "month" | "year";
  bars: ToneBarDatum[];
};

/** Expected change in each week, month, or year of the forecast. */
export function PeriodChangesPanel({ seriesOption, granularity, bars }: PeriodChangesPanelProps) {
  return (
    <ChartPanel
      title={`Expected change each ${granularity}`}
      subtitle={`${seriesOption.shortLabel}. Green bars rise, red bars fall.`}
    >
      {bars.length > 0 ? (
        <ToneBarChart
          bars={bars}
          seriesName="Expected change"
          formatValue={formatPercent}
          formatAxisValue={formatOnePercentAxis}
          height={230}
          ariaLabel={`Bar chart of the expected change each ${granularity} for ${seriesOption.label}`}
        />
      ) : (
        <ChartEmptyMessage message="The forecast is too short to split into periods." />
      )}
    </ChartPanel>
  );
}

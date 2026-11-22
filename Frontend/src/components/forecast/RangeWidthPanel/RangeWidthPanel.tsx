import type { PriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";
import { formatShare } from "../../../utils/shared/formatters";
import { AreaTrendChart } from "../../common/AreaTrendChart";
import { ChartPanel } from "../../common/ChartPanel";

type RangeWidthPanelProps = {
  seriesOption: PriceSeriesOption;
  rangeWidthSeries: SeriesPoint[];
  intervalPercent: number;
};

/** How much wider the uncertainty range gets the further ahead the forecast looks. */
export function RangeWidthPanel({ seriesOption, rangeWidthSeries, intervalPercent }: RangeWidthPanelProps) {
  return (
    <ChartPanel
      title="How the range widens"
      subtitle={`${seriesOption.shortLabel}. Width of the ${intervalPercent}% range as a share of the forecast: the further ahead, the less certain.`}
    >
      <AreaTrendChart
        points={rangeWidthSeries}
        seriesName="Range width"
        colorVariable="var(--color-gold)"
        baselineValue={0}
        formatValue={(value) => formatShare(value, 1)}
        formatAxisValue={(tickValue) => `${tickValue.toFixed(0)}%`}
        height={210}
        ariaLabel={`Area chart of how the forecast range widens over time for ${seriesOption.label}`}
      />
    </ChartPanel>
  );
}

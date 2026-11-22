import type { ComponentProps } from "react";
import { formatLongDate } from "../../../utils/shared/chartDates";
import { ChartPanel } from "../../common/ChartPanel";
import { ForecastRangeBars } from "../ForecastRangeBars";

type RangeLandingPanelProps = {
  rangeBarModels: ComponentProps<typeof ForecastRangeBars>["rangeBarModels"];
  intervalPercent: number;
  endDate: string;
};

/** The low-to-high range each price could end at, as a change from today. */
export function RangeLandingPanel({ rangeBarModels, intervalPercent, endDate }: RangeLandingPanelProps) {
  return (
    <ChartPanel
      title="Where each price could land"
      subtitle={`By ${formatLongDate(endDate)}, as a change from the latest value.`}
    >
      <ForecastRangeBars rangeBarModels={rangeBarModels} intervalPercent={intervalPercent} />
    </ChartPanel>
  );
}

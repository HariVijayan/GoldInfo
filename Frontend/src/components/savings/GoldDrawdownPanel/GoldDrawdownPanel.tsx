import { useMemo } from "react";
import { GOLD_LABEL } from "../../../config/shared/displayLabels";
import type { SavingsTimelinePoint } from "../../../types/savings/savingsTypes";
import { buildGoldDrawdown } from "../../../utils/savings/savingsDashboardModel";
import { formatSignedPercent } from "../../../utils/savingsShared/savingsFormatters";
import { AreaTrendChart } from "../../common/AreaTrendChart";
import { ChartPanel } from "../../common/ChartPanel";

/** How far the gold holding sat below its highest value so far. */
export function GoldDrawdownPanel({ timelinePoints }: { timelinePoints: SavingsTimelinePoint[] }) {
  const goldDrawdown = useMemo(() => buildGoldDrawdown(timelinePoints), [timelinePoints]);

  return (
    <ChartPanel
      title={`${GOLD_LABEL}: falls from its peak`}
      subtitle="How far the gold holding sat below its highest value so far. Savings with interest never fall."
    >
      <AreaTrendChart
        points={goldDrawdown.series}
        seriesName="Below peak"
        colorVariable="var(--color-negative)"
        formatValue={formatSignedPercent}
        formatAxisValue={(tickValue) => `${tickValue.toFixed(0)}%`}
        baselineValue={0}
        ariaLabel="Fall of the gold holding from its running peak"
      />
    </ChartPanel>
  );
}

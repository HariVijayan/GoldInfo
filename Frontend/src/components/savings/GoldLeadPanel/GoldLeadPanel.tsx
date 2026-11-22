import { useMemo } from "react";
import type { SavingsTimelinePoint } from "../../../types/savings/savingsTypes";
import { buildLeadRatioSeries } from "../../../utils/savings/savingsDashboardModel";
import { formatMultiple } from "../../../utils/savingsShared/savingsFormatters";
import { AreaTrendChart } from "../../common/AreaTrendChart";
import { ChartPanel } from "../../common/ChartPanel";

/** Gold's growth divided by the savings' growth: above 1x gold is ahead. */
export function GoldLeadPanel({ timelinePoints }: { timelinePoints: SavingsTimelinePoint[] }) {
  const leadRatioSeries = useMemo(() => buildLeadRatioSeries(timelinePoints), [timelinePoints]);

  return (
    <ChartPanel
      title="Gold's lead over savings"
      subtitle="Gold's growth divided by the savings' growth. Above 1× gold is ahead, below 1× savings are."
    >
      <AreaTrendChart
        points={leadRatioSeries}
        seriesName="Gold vs savings"
        colorVariable="var(--color-gold)"
        formatValue={formatMultiple}
        formatAxisValue={(tickValue) => `${tickValue.toFixed(1)}×`}
        baselineValue={1}
        ariaLabel="Gold's growth relative to savings growth over time"
      />
    </ChartPanel>
  );
}

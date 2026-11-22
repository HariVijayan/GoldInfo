import { useMemo } from "react";
import type { MonthlyTimelinePoint } from "../../../types/savingsMonthly/savingsMonthlyTypes";
import { buildGoldLeadSeries } from "../../../utils/savingsMonthly/savingsMonthlyDashboardModel";
import { formatSignedRupees } from "../../../utils/savingsMonthly/savingsMonthlyFormatters";
import { formatCompactRupees } from "../../../utils/savingsShared/savingsFormatters";
import { AreaTrendChart } from "../../common/AreaTrendChart";
import { ChartPanel } from "../../common/ChartPanel";

/** Gold portfolio minus RD balance, in rupees. */
export function GoldLeadOverRdPanel({ timelinePoints }: { timelinePoints: MonthlyTimelinePoint[] }) {
  const leadSeries = useMemo(() => buildGoldLeadSeries(timelinePoints), [timelinePoints]);

  return (
    <ChartPanel
      title="Gold's lead over the RD"
      subtitle="Gold portfolio minus RD balance, in rupees. Both received the same installments. Above zero gold is ahead."
    >
      <AreaTrendChart
        points={leadSeries}
        seriesName="Gold minus RD"
        colorVariable="var(--color-gold)"
        formatValue={formatSignedRupees}
        formatAxisValue={formatCompactRupees}
        baselineValue={0}
        ariaLabel="Gold portfolio value minus the RD balance over time"
      />
    </ChartPanel>
  );
}

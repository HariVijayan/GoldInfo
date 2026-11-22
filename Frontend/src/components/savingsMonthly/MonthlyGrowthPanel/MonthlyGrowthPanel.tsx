import { useMemo } from "react";
import type { MonthlyTimelinePoint } from "../../../types/savingsMonthly/savingsMonthlyTypes";
import { buildMonthlyGrowthPoints } from "../../../utils/savingsMonthly/savingsMonthlyDashboardModel";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { MonthlyGrowthChart } from "../MonthlyGrowthChart";

/** Money paid in, the RD balance, and the gold portfolio over time. */
export function MonthlyGrowthPanel({ timelinePoints }: { timelinePoints: MonthlyTimelinePoint[] }) {
  const growthPoints = useMemo(() => buildMonthlyGrowthPoints(timelinePoints), [timelinePoints]);

  return (
    <ChartPanel
      title="Value over time"
      subtitle="Money paid in, the RD balance, and the gold portfolio (grams held at that day's price, plus money set aside but not yet spent)."
    >
      {timelinePoints.length >= 2 ? (
        <MonthlyGrowthChart points={growthPoints} />
      ) : (
        <ChartEmptyMessage message="Too few observations to draw a chart." />
      )}
    </ChartPanel>
  );
}

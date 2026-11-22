import { useMemo } from "react";
import type { MonthlyTimelinePoint } from "../../../types/savingsMonthly/savingsMonthlyTypes";
import { buildCostComparisonPoints } from "../../../utils/savingsMonthly/savingsMonthlyDashboardModel";
import { ChartPanel } from "../../common/ChartPanel";
import { CostComparisonChart } from "../CostComparisonChart";

/** The market price per gram beside the average price paid so far. */
export function CostComparisonPanel({ timelinePoints }: { timelinePoints: MonthlyTimelinePoint[] }) {
  const costPoints = useMemo(() => buildCostComparisonPoints(timelinePoints), [timelinePoints]);

  return (
    <ChartPanel
      title="Your average cost per gram"
      subtitle="Buying every month averages the price you pay. The gap to the market price is the gain or loss per gram."
    >
      <CostComparisonChart points={costPoints} />
    </ChartPanel>
  );
}

import type { SavingsTimelinePoint } from "../../../types/savings/savingsTypes";
import { buildGrowthChartPoints } from "../../../utils/savings/savingsDashboardModel";
import { ChartEmptyMessage } from "../../common/ChartEmptyMessage";
import { ChartPanel } from "../../common/ChartPanel";
import { SavingsGrowthChart } from "../SavingsGrowthChart";
import { useMemo } from "react";

/** What each holding would have been worth on every day since the start. */
export function SavingsGrowthPanel({ timelinePoints }: { timelinePoints: SavingsTimelinePoint[] }) {
  const growthPoints = useMemo(() => buildGrowthChartPoints(timelinePoints), [timelinePoints]);

  return (
    <ChartPanel title="Value over time" subtitle="What each holding would have been worth on every day since the start.">
      {timelinePoints.length >= 2 ? (
        <SavingsGrowthChart points={growthPoints} />
      ) : (
        <ChartEmptyMessage message="Too few observations to draw a chart." />
      )}
    </ChartPanel>
  );
}

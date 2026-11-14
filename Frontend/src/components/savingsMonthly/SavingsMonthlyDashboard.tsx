import { useMemo, useState } from "react";
import type { MonthlyViewedResult } from "../../utils/priceViewSelectors";
import {
  buildCostComparisonPoints,
  buildGoldLeadSeries,
  buildMonthlyGrowthPoints,
  buildMonthlyTakeaways,
} from "../../utils/savingsMonthlyDashboardModel";
import { formatCompactRupees } from "../../utils/savingsFormatters";
import { formatSignedRupees } from "../../utils/savingsMonthlyFormatters";
import { AreaTrendChart } from "../common/AreaTrendChart";
import { ChartEmptyMessage, ChartPanel } from "../common/ChartPanel";
import { CollapsiblePanel } from "../common/CollapsiblePanel";
import { DashboardLayout } from "../common/DashboardLayout";
import { CostComparisonChart } from "./CostComparisonChart";
import { InstallmentsTable } from "./InstallmentsTable";
import { MonthlyGrowthChart } from "./MonthlyGrowthChart";
import { MonthlyHero } from "./MonthlyHero";
import { MonthlyStatsGrid } from "./MonthlyStatsGrid";
import { YearEndTable } from "./YearEndTable";

export function SavingsMonthlyDashboard({ monthlyResult }: { monthlyResult: MonthlyViewedResult }) {
  const [areNotesExpanded, setAreNotesExpanded] = useState(true);
  const timelinePoints = monthlyResult.timeline.points;

  const model = useMemo(
    () => ({
      growthPoints: buildMonthlyGrowthPoints(timelinePoints),
      leadSeries: buildGoldLeadSeries(timelinePoints),
      costPoints: buildCostComparisonPoints(timelinePoints),
      takeaways: buildMonthlyTakeaways(monthlyResult),
    }),
    [monthlyResult, timelinePoints]
  );

  const hasEnoughPoints = timelinePoints.length >= 2;

  return (
    <DashboardLayout
      primaryColumn={
        <>
          <MonthlyHero monthlyResult={monthlyResult} />

          <ChartPanel
            title="Value over time"
            subtitle="Money paid in, the RD balance, and the gold portfolio (grams held at that day's price, plus money set aside but not yet spent)."
          >
            {hasEnoughPoints ? (
              <MonthlyGrowthChart points={model.growthPoints} />
            ) : (
              <ChartEmptyMessage message="Too few observations to draw a chart." />
            )}
          </ChartPanel>

          {hasEnoughPoints && (
            <ChartPanel
              title="Gold's lead over the RD"
              subtitle="Gold portfolio minus RD balance, in rupees. Both received the same installments. Above zero gold is ahead."
            >
              <AreaTrendChart
                points={model.leadSeries}
                seriesName="Gold minus RD"
                colorVariable="var(--color-gold)"
                formatValue={formatSignedRupees}
                formatAxisValue={formatCompactRupees}
                baselineValue={0}
                ariaLabel="Gold portfolio value minus the RD balance over time"
              />
            </ChartPanel>
          )}

          {hasEnoughPoints && (
            <ChartPanel
              title="Your average cost per gram"
              subtitle="Buying every month averages the price you pay. The gap to the market price is the gain or loss per gram."
            >
              <CostComparisonChart points={model.costPoints} />
            </ChartPanel>
          )}

          <YearEndTable yearEndRows={monthlyResult.year_end_rows} />
          <InstallmentsTable installments={monthlyResult.installments} />
        </>
      }
      secondaryColumn={
        <>
          <section className="panel" aria-label="Key findings">
            <h2 className="section-heading-text">Key findings</h2>
            <ul className="takeaway-list">
              {model.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ul>
          </section>

          <MonthlyStatsGrid monthlyResult={monthlyResult} />

          <CollapsiblePanel
            panelId="monthly-notes"
            title="Notes and limits"
            summary={`${monthlyResult.warnings.length} notes`}
            isExpanded={areNotesExpanded}
            onToggle={() => setAreNotesExpanded((wasExpanded) => !wasExpanded)}
          >
            <ul className="takeaway-list">
              {monthlyResult.warnings.map((warningText) => (
                <li key={warningText}>{warningText}</li>
              ))}
            </ul>
          </CollapsiblePanel>
        </>
      }
    />
  );
}

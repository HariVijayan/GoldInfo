import { useMemo } from "react";
import { buildMonthlyTakeaways } from "../../../utils/savingsMonthly/monthlyTakeaways";
import type { MonthlyViewedResult } from "../../../utils/savingsMonthly/monthlyPriceView";
import { DashboardGrid } from "../../common/DashboardGrid";
import { DashboardSection } from "../../common/DashboardSection";
import { KeyFindingsPanel } from "../../common/KeyFindingsPanel";
import { CostComparisonPanel } from "../CostComparisonPanel";
import { GoldLeadOverRdPanel } from "../GoldLeadOverRdPanel";
import { InstallmentsTable } from "../InstallmentsTable";
import { MonthlyGrowthPanel } from "../MonthlyGrowthPanel";
import { MonthlyHero } from "../MonthlyHero";
import { MonthlyStatsGrid } from "../MonthlyStatsGrid";
import { YearEndTable } from "../YearEndTable";

/**
 * Result of the Savings (Monthly) tab, top to bottom: the result cards,
 * every chart across both columns, the statistics in single columns, then
 * the tables.
 */
export function SavingsMonthlyDashboard({ monthlyResult }: { monthlyResult: MonthlyViewedResult }) {
  const timelinePoints = monthlyResult.timeline.points;
  const findings = useMemo(() => buildMonthlyTakeaways(monthlyResult), [monthlyResult]);
  const hasEnoughPoints = timelinePoints.length >= 2;

  return (
    <DashboardGrid>
      <DashboardSection span="full">
        <MonthlyHero monthlyResult={monthlyResult} />
      </DashboardSection>

      <MonthlyGrowthPanel timelinePoints={timelinePoints} />
      {hasEnoughPoints && <GoldLeadOverRdPanel timelinePoints={timelinePoints} />}
      {hasEnoughPoints && <CostComparisonPanel timelinePoints={timelinePoints} />}

      <KeyFindingsPanel findings={findings} />
      <DashboardSection span="single">
        <MonthlyStatsGrid monthlyResult={monthlyResult} />
      </DashboardSection>

      <DashboardSection span="full">
        <YearEndTable yearEndRows={monthlyResult.year_end_rows} />
      </DashboardSection>
      <DashboardSection span="full">
        <InstallmentsTable installments={monthlyResult.installments} />
      </DashboardSection>
    </DashboardGrid>
  );
}

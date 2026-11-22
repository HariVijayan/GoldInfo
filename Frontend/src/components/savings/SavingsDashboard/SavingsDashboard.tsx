import { useMemo } from "react";
import { buildTakeaways } from "../../../utils/savings/savingsTakeaways";
import type { SavingsViewedResult } from "../../../utils/savings/savingsPriceView";
import { DashboardGrid } from "../../common/DashboardGrid";
import { DashboardSection } from "../../common/DashboardSection";
import { KeyFindingsPanel } from "../../common/KeyFindingsPanel";
import { CurrencyEffectPanel } from "../CurrencyEffectPanel";
import { GoldDrawdownPanel } from "../GoldDrawdownPanel";
import { GoldLeadPanel } from "../GoldLeadPanel";
import { HoldingPeriodTable } from "../HoldingPeriodTable";
import { SavingsGrowthPanel } from "../SavingsGrowthPanel";
import { SavingsHero } from "../SavingsHero";
import { SavingsStatsGrid } from "../SavingsStatsGrid";
import { YearlyReturnsPanel } from "../YearlyReturnsPanel";
import { YearlyReturnsTable } from "../YearlyReturnsTable";

/**
 * Result of the Savings (Lumpsum) tab, top to bottom: the result cards,
 * every chart across both columns, the statistics in single columns, then
 * the tables.
 */
export function SavingsDashboard({ savingsResult }: { savingsResult: SavingsViewedResult }) {
  const timelinePoints = savingsResult.timeline.points;
  const findings = useMemo(() => buildTakeaways(savingsResult), [savingsResult]);
  const hasEnoughPoints = timelinePoints.length >= 2;

  return (
    <DashboardGrid>
      <DashboardSection span="full">
        <SavingsHero savingsResult={savingsResult} />
      </DashboardSection>

      <SavingsGrowthPanel timelinePoints={timelinePoints} />
      {hasEnoughPoints && <GoldLeadPanel timelinePoints={timelinePoints} />}
      <YearlyReturnsPanel calendarYears={savingsResult.calendar_years} />
      {hasEnoughPoints && <GoldDrawdownPanel timelinePoints={timelinePoints} />}

      <KeyFindingsPanel findings={findings} />
      <DashboardSection span="single">
        <SavingsStatsGrid savingsResult={savingsResult} />
      </DashboardSection>
      <CurrencyEffectPanel currencyEffect={savingsResult.currency_effect} />

      <DashboardSection span="full">
        <YearlyReturnsTable calendarYears={savingsResult.calendar_years} />
      </DashboardSection>
      <HoldingPeriodTable outcomes={savingsResult.holding_period_outcomes} />
    </DashboardGrid>
  );
}

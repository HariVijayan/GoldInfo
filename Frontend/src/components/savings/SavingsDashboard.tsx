import { useMemo, useState } from "react";
import { GOLD_LABEL } from "../../config/displayLabels";
import type { SavingsViewedResult } from "../../utils/priceViewSelectors";
import {
  buildGoldDrawdown,
  buildGrowthChartPoints,
  buildLeadRatioSeries,
  buildTakeaways,
  buildYearlyBars,
} from "../../utils/savingsDashboardModel";
import { formatMultiple, formatSignedPercent } from "../../utils/savingsFormatters";
import { AreaTrendChart } from "../common/AreaTrendChart";
import { ChartEmptyMessage, ChartPanel } from "../common/ChartPanel";
import { CollapsiblePanel } from "../common/CollapsiblePanel";
import { DashboardLayout } from "../common/DashboardLayout";
import { CurrencyEffectPanel } from "./CurrencyEffectPanel";
import { HoldingPeriodTable } from "./HoldingPeriodTable";
import { SavingsGrowthChart } from "./SavingsGrowthChart";
import { SavingsHero } from "./SavingsHero";
import { SavingsStatsGrid } from "./SavingsStatsGrid";
import { YearlyReturnsChart } from "./YearlyReturnsChart";
import { YearlyReturnsTable } from "./YearlyReturnsTable";

export function SavingsDashboard({ savingsResult }: { savingsResult: SavingsViewedResult }) {
  const [areNotesExpanded, setAreNotesExpanded] = useState(true);
  const timelinePoints = savingsResult.timeline.points;

  const model = useMemo(
    () => ({
      growthPoints: buildGrowthChartPoints(timelinePoints),
      leadRatioSeries: buildLeadRatioSeries(timelinePoints),
      goldDrawdown: buildGoldDrawdown(timelinePoints),
      yearlyBars: buildYearlyBars(savingsResult.calendar_years),
      takeaways: buildTakeaways(savingsResult),
    }),
    [savingsResult, timelinePoints]
  );

  const hasEnoughPoints = timelinePoints.length >= 2;

  return (
    <DashboardLayout
      primaryColumn={
        <>
          <SavingsHero savingsResult={savingsResult} />

          <ChartPanel
            title="Value over time"
            subtitle="What each holding would have been worth on every day since the start."
          >
            {hasEnoughPoints ? (
              <SavingsGrowthChart points={model.growthPoints} />
            ) : (
              <ChartEmptyMessage message="Too few observations to draw a chart." />
            )}
          </ChartPanel>

          {hasEnoughPoints && (
            <ChartPanel
              title="Gold's lead over savings"
              subtitle="Gold's growth divided by the savings' growth. Above 1× gold is ahead, below 1× savings are."
            >
              <AreaTrendChart
                points={model.leadRatioSeries}
                seriesName="Gold vs savings"
                colorVariable="var(--color-gold)"
                formatValue={formatMultiple}
                formatAxisValue={(tickValue) => `${tickValue.toFixed(1)}×`}
                baselineValue={1}
                ariaLabel="Gold's growth relative to savings growth over time"
              />
            </ChartPanel>
          )}

          {model.yearlyBars.length > 0 && (
            <ChartPanel
              title="Year by year"
              subtitle="Change in each calendar year. Savings earn close to the same every year; gold swings."
            >
              <YearlyReturnsChart bars={model.yearlyBars} />
            </ChartPanel>
          )}

          <YearlyReturnsTable calendarYears={savingsResult.calendar_years} />

          <HoldingPeriodTable outcomes={savingsResult.holding_period_outcomes} />

          {hasEnoughPoints && (
            <ChartPanel
              title={`${GOLD_LABEL}: falls from its peak`}
              subtitle="How far the gold holding sat below its highest value so far. Savings with interest never fall."
            >
              <AreaTrendChart
                points={model.goldDrawdown.series}
                seriesName="Below peak"
                colorVariable="var(--color-negative)"
                formatValue={formatSignedPercent}
                formatAxisValue={(tickValue) => `${tickValue.toFixed(0)}%`}
                baselineValue={0}
                ariaLabel="Fall of the gold holding from its running peak"
              />
            </ChartPanel>
          )}
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

          <SavingsStatsGrid savingsResult={savingsResult} />

          <CurrencyEffectPanel currencyEffect={savingsResult.currency_effect} />

          <CollapsiblePanel
            panelId="savings-notes"
            title="Notes and limits"
            summary={`${savingsResult.warnings.length} notes`}
            isExpanded={areNotesExpanded}
            onToggle={() => setAreNotesExpanded((wasExpanded) => !wasExpanded)}
          >
            <ul className="takeaway-list">
              {savingsResult.warnings.map((warningText) => (
                <li key={warningText}>{warningText}</li>
              ))}
            </ul>
          </CollapsiblePanel>
        </>
      }
    />
  );
}

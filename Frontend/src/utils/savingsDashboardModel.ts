/** Turns one savings response into the series and figures the charts need. */
import { SAVINGS_CHART_MAXIMUM_POINTS } from "../config/savingsConfig";
import { GOLD_LABEL, RUPEE_SYMBOL } from "../config/displayLabels";
import type { SeriesPoint } from "../types/priceSeriesTypes";
import type { CalendarYearRow, SavingsResult, SavingsTimelinePoint } from "../types/savingsTypes";
import { formatLongDate } from "./chartDates";
import { downsampleEvenly } from "./downsample";
import { formatRupees } from "./formatters";
import {
  describeInterest,
  formatGrams,
  formatMultiple,
  formatRate,
  formatSignedPercent,
} from "./savingsFormatters";
import { calculateDrawdown, type DrawdownResult } from "./seriesStatistics";

export type GrowthChartPoint = { date: string; goldValue: number; savingsValue: number };

export function buildGrowthChartPoints(timelinePoints: SavingsTimelinePoint[]): GrowthChartPoint[] {
  return downsampleEvenly(timelinePoints, SAVINGS_CHART_MAXIMUM_POINTS).map((point) => ({
    date: point.date,
    goldValue: point.gold_value,
    savingsValue: point.inr_value,
  }));
}

/**
 * How many times larger gold's growth multiple is than the savings multiple.
 * Above 1 gold is ahead. Using multiples keeps it fair when the two start
 * from different amounts.
 */
export function buildLeadRatioSeries(timelinePoints: SavingsTimelinePoint[]): SeriesPoint[] {
  const firstPoint = timelinePoints[0];
  const ratioSeries = timelinePoints.map((point) => ({
    date: point.date,
    value: point.gold_value / firstPoint.gold_value / (point.inr_value / firstPoint.inr_value),
  }));
  return downsampleEvenly(ratioSeries, SAVINGS_CHART_MAXIMUM_POINTS);
}

/** The drawdown is found on every day, then thinned for drawing. */
export function buildGoldDrawdown(timelinePoints: SavingsTimelinePoint[]): DrawdownResult {
  const drawdown = calculateDrawdown(
    timelinePoints.map((point) => ({ date: point.date, value: point.gold_value }))
  );
  return {
    ...drawdown,
    series: downsampleEvenly(drawdown.series, SAVINGS_CHART_MAXIMUM_POINTS),
  };
}

export type YearlyBarDatum = {
  label: string;
  goldChangePct: number;
  savingsChangePct: number;
};

export function buildYearlyBars(calendarYears: CalendarYearRow[]): YearlyBarDatum[] {
  return calendarYears.flatMap((yearRow) =>
    yearRow.gold_change_pct === null || yearRow.inr_savings_change_pct === null
      ? []
      : [
          {
            // An asterisk marks a year that is only partly covered.
            label: `${yearRow.year}${yearRow.is_partial_year ? "*" : ""}`,
            goldChangePct: yearRow.gold_change_pct,
            savingsChangePct: yearRow.inr_savings_change_pct,
          },
        ]
  );
}

/** Plain-language findings, written only from numbers the server returned. */
export function buildTakeaways(savingsResult: SavingsResult): string[] {
  const { summary, request, currency_effect: currencyEffect } = savingsResult;
  const { gold, inr_savings: savings, comparison } = summary;
  const startDate = formatLongDate(request.effective_start_date);
  const endDate = formatLongDate(request.end_date);
  const takeaways: string[] = [];

  takeaways.push(
    `${formatGrams(gold.grams)} g of ${GOLD_LABEL} bought on ${startDate} for ${formatRupees(
      gold.invested_inr
    )} was worth ${formatRupees(gold.current_value_inr)} on ${endDate}: ${formatSignedPercent(
      gold.change_pct
    )}, or ${formatRate(gold.cagr_pct)} a year.`
  );

  takeaways.push(
    `${formatRupees(savings.principal_inr)} in savings at ${describeInterest(
      request.annual_interest_rate_pct,
      request.compounding
    )} grew to ${formatRupees(savings.final_value_inr)}: ${formatSignedPercent(
      savings.change_pct
    )}, or ${formatRate(savings.cagr_pct)} a year.`
  );

  const gapText = Math.abs(comparison.change_gap_points ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  });
  const basisNote = summary.same_budget
    ? ""
    : " (compared by percentage growth, because the starting amounts differ)";
  if (comparison.leader === "tie") {
    takeaways.push(`Gold and savings ended level${basisNote}.`);
  } else {
    takeaways.push(
      `${comparison.leader === "gold" ? "Gold" : "Savings"} finished ahead by ${gapText} percentage points${basisNote}.`
    );
  }

  if (comparison.break_even_annual_rate_pct !== null) {
    takeaways.push(
      `To match gold, the savings would have needed about ${formatRate(
        comparison.break_even_annual_rate_pct
      )} a year.`
    );
  }

  takeaways.push(
    `Measured in gold, the savings would buy ${formatGrams(
      comparison.gold_equivalent_grams_now
    )} g today against ${formatGrams(comparison.gold_equivalent_grams_at_start)} g at the start (${formatSignedPercent(
      comparison.gold_purchasing_power_change_pct
    )}).`
  );

  if (
    currencyEffect.gold_usd_change_pct !== null &&
    currencyEffect.usd_inr_change_pct !== null
  ) {
    const rupeeDirection = currencyEffect.usd_inr_change_pct >= 0 ? "weakened" : "strengthened";
    takeaways.push(
      `In US dollars gold moved ${formatSignedPercent(
        currencyEffect.gold_usd_change_pct
      )} while the rupee ${rupeeDirection} by ${Math.abs(
        currencyEffect.usd_inr_change_pct
      ).toLocaleString("en-IN", { maximumFractionDigits: 1 })}% against the dollar. Together they gave the ${RUPEE_SYMBOL} price its ${formatSignedPercent(
        currencyEffect.gold_inr_change_pct
      )}.`
    );
  }

  if (comparison.share_of_days_gold_ahead_pct !== null) {
    takeaways.push(
      `Gold's growth was ahead of the savings on ${comparison.share_of_days_gold_ahead_pct.toFixed(
        0
      )}% of days (by the end its growth was ${formatMultiple(comparison.gold_to_savings_growth_ratio)} the savings' growth).`
    );
  }

  return takeaways;
}

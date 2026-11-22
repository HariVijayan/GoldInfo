import { useMemo } from "react";
import type { CalendarYearRow } from "../../../types/savings/savingsTypes";
import { buildYearlyBars } from "../../../utils/savings/savingsDashboardModel";
import { ChartPanel } from "../../common/ChartPanel";
import { YearlyReturnsChart } from "../YearlyReturnsChart";

/** The change in each calendar year, gold beside savings. */
export function YearlyReturnsPanel({ calendarYears }: { calendarYears: CalendarYearRow[] }) {
  const yearlyBars = useMemo(() => buildYearlyBars(calendarYears), [calendarYears]);
  if (yearlyBars.length === 0) return null;

  return (
    <ChartPanel
      title="Year by year"
      subtitle="Change in each calendar year. Savings earn close to the same every year; gold swings."
    >
      <YearlyReturnsChart bars={yearlyBars} />
    </ChartPanel>
  );
}

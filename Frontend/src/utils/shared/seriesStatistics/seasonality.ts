/** Average change by calendar month. Percentages are numbers such as 1.25 meaning 1.25%. */
import type { ToneBarDatum } from "../../../types/shared/chartTypes";
import type { SeriesPoint } from "../../../types/shared/priceSeriesTypes";
import { getChangeTone } from "../formatters";
import { collectPeriodCloses } from "./periodReturns";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Average month-end to month-end change for each calendar month. The first
 * month has no earlier month-end to compare with, so it only serves as the
 * baseline for the second.
 */
export function calculateMonthOfYearAverages(series: SeriesPoint[]): ToneBarDatum[] {
  const monthlyCloses = collectPeriodCloses(series, "month");
  const returnsByMonth: number[][] = MONTH_NAMES.map(() => []);

  for (let closeIndex = 1; closeIndex < monthlyCloses.length; closeIndex += 1) {
    const previousClose = monthlyCloses[closeIndex - 1].closingValue;
    if (previousClose <= 0) continue;

    const monthIndex = Number(monthlyCloses[closeIndex].periodKey.slice(5, 7)) - 1;
    returnsByMonth[monthIndex].push(
      (monthlyCloses[closeIndex].closingValue / previousClose - 1) * 100
    );
  }

  return MONTH_NAMES.flatMap((monthName, monthIndex) => {
    const monthReturns = returnsByMonth[monthIndex];
    if (monthReturns.length === 0) return [];

    const averageReturn = monthReturns.reduce((sum, value) => sum + value, 0) / monthReturns.length;
    const upCount = monthReturns.filter((value) => value > 0).length;
    return [
      {
        label: monthName,
        value: averageReturn,
        tone: getChangeTone(averageReturn),
        detail: `Rose in ${upCount} of ${monthReturns.length} years`,
      },
    ];
  });
}

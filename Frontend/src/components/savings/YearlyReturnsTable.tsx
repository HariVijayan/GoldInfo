import { useState } from "react";
import { GOLD_LABEL } from "../../config/displayLabels";
import type { CalendarYearRow } from "../../types/savingsTypes";
import { formatLongDate } from "../../utils/chartDates";
import { formatSignedPercent } from "../../utils/savingsFormatters";
import { CollapsiblePanel } from "../common/CollapsiblePanel";

export function YearlyReturnsTable({ calendarYears }: { calendarYears: CalendarYearRow[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const yearsGoldWon = calendarYears.filter((yearRow) => yearRow.gold_beat_savings).length;

  return (
    <CollapsiblePanel
      panelId="savings-yearly-table"
      title="Year-by-year table"
      summary={`Gold ahead in ${yearsGoldWon} of ${calendarYears.length} years`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
    >
      <div className="table-scroll table-scroll-tall">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Covers</th>
              <th scope="col">{GOLD_LABEL}</th>
              <th scope="col">INR savings</th>
              <th scope="col">Ahead</th>
            </tr>
          </thead>
          <tbody>
            {calendarYears.map((yearRow) => (
              <tr key={yearRow.year}>
                <td>{yearRow.year}{yearRow.is_partial_year ? "*" : ""}</td>
                <td>{formatLongDate(yearRow.period_start)} to {formatLongDate(yearRow.period_end)}</td>
                <td>{formatSignedPercent(yearRow.gold_change_pct)}</td>
                <td>{formatSignedPercent(yearRow.inr_savings_change_pct)}</td>
                <td>{yearRow.gold_beat_savings ? "Gold" : "Savings"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="chart-footnote">* The data covers only part of this year.</p>
    </CollapsiblePanel>
  );
}

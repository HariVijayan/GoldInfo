import { useState } from "react";
import { GOLD_LABEL } from "../../config/displayLabels";
import type { MonthlyYearEndRow } from "../../types/savingsMonthlyTypes";
import { formatLongDate } from "../../utils/chartDates";
import { formatRupees } from "../../utils/formatters";
import { formatSignedRupees } from "../../utils/savingsMonthlyFormatters";
import { CollapsiblePanel } from "../common/CollapsiblePanel";

export function YearEndTable({ yearEndRows }: { yearEndRows: MonthlyYearEndRow[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const yearsGoldAhead = yearEndRows.filter((yearRow) => yearRow.gold_ahead).length;

  return (
    <CollapsiblePanel
      panelId="monthly-year-end-table"
      title="Year-end snapshots"
      summary={`Gold ahead at ${yearsGoldAhead} of ${yearEndRows.length} year-ends`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
    >
      <div className="table-scroll table-scroll-tall">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">As of</th>
              <th scope="col">Paid in</th>
              <th scope="col">{GOLD_LABEL}</th>
              <th scope="col">RD</th>
              <th scope="col">Gold minus RD</th>
            </tr>
          </thead>
          <tbody>
            {yearEndRows.map((yearRow) => (
              <tr key={yearRow.year}>
                <td>{yearRow.year}</td>
                <td>{formatLongDate(yearRow.as_of_date)}</td>
                <td>{formatRupees(yearRow.invested_inr)}</td>
                <td>{formatRupees(yearRow.gold_value)}</td>
                <td>{formatRupees(yearRow.rd_value)}</td>
                <td>{formatSignedRupees(yearRow.lead_inr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}

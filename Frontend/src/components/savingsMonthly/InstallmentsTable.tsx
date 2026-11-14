import { useState } from "react";
import type { MonthlyInstallmentRow } from "../../types/savingsMonthlyTypes";
import { formatLongDate } from "../../utils/chartDates";
import { formatRupees } from "../../utils/formatters";
import { formatGrams } from "../../utils/savingsFormatters";
import { formatMonthLabel } from "../../utils/savingsMonthlyFormatters";
import { CollapsiblePanel } from "../common/CollapsiblePanel";

export function InstallmentsTable({ installments }: { installments: MonthlyInstallmentRow[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <CollapsiblePanel
      panelId="monthly-installments-table"
      title="Every installment"
      summary={`${installments.length} months, with the day each one bought gold`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
    >
      <div className="table-scroll table-scroll-tall">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">RD paid on</th>
              <th scope="col">Gold bought on</th>
              <th scope="col">Price paid a gram</th>
              <th scope="col">Grams</th>
              <th scope="col">Gold worth now</th>
              <th scope="col">RD worth now</th>
              <th scope="col">Ahead</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((installment) => (
              <tr key={installment.month}>
                <td>{formatMonthLabel(installment.month)}</td>
                <td>{formatLongDate(installment.rd_deposit_date)}</td>
                <td>{formatLongDate(installment.gold_buy_date)}</td>
                <td>{formatRupees(installment.price_paid_per_gram)}</td>
                <td>{formatGrams(installment.grams_bought)}</td>
                <td>{formatRupees(installment.gold_value_now)}</td>
                <td>{formatRupees(installment.rd_value_now)}</td>
                <td>{installment.gold_ahead ? "Gold" : "RD"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}

import { useState } from "react";
import { GOLD_LABEL, RUPEE_SYMBOL } from "../../config/displayLabels";
import type { ForecastFrequency, ForecastPoint } from "../../types/forecastTypes";
import { formatLongDate } from "../../utils/chartDates";
import { formatPrice } from "../../utils/formatters";
import { CollapsiblePanel } from "../common/CollapsiblePanel";

type ForecastTableProps = {
  forecastPoints: ForecastPoint[];
  frequency: ForecastFrequency;
};

export function ForecastTable({ forecastPoints, frequency }: ForecastTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const periodName = frequency === "daily" ? "day" : "week";

  return (
    <CollapsiblePanel
      panelId="forecast-table"
      title={`${frequency === "daily" ? "Daily" : "Weekly"} forecast table`}
      summary={`${forecastPoints.length} ${periodName}s`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
    >
      <div className="table-scroll table-scroll-tall">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{periodName === "day" ? "Day" : "Week"}</th>
              <th scope="col">Date</th>
              <th scope="col">{GOLD_LABEL} (USD/oz)</th>
              <th scope="col">USD/INR ({RUPEE_SYMBOL})</th>
              <th scope="col">{GOLD_LABEL} ({RUPEE_SYMBOL}/g)</th>
            </tr>
          </thead>
          <tbody>
            {forecastPoints.map((forecastPoint) => (
              <tr key={forecastPoint.step}>
                <td>{forecastPoint.step}</td>
                <td>{formatLongDate(forecastPoint.date)}</td>
                <td>{formatPrice(forecastPoint.gold_usd_per_ounce)}</td>
                <td>
                  {RUPEE_SYMBOL}
                  {formatPrice(forecastPoint.inr_per_usd)}
                </td>
                <td>
                  {RUPEE_SYMBOL}
                  {formatPrice(forecastPoint.gold_inr_per_gram)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}

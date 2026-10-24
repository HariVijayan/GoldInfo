import type { ForecastFrequency, ForecastPoint } from "../types/forecastTypes";
import { formatPrice } from "../utils/formatters";
import { formatLongDate } from "../utils/forecastChartData";

type ForecastTableProps = {
  forecastPoints: ForecastPoint[];
  frequency: ForecastFrequency;
};

export function ForecastTable({ forecastPoints, frequency }: ForecastTableProps) {
  const periodName = frequency === "daily" ? "day" : "week";

  return (
    <details className="panel">
      <summary className="table-summary">
        {frequency === "daily" ? "Daily" : "Weekly"} forecast table ({forecastPoints.length}{" "}
        {periodName}s)
      </summary>
      <div className="table-scroll table-scroll-tall">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{periodName === "day" ? "Day" : "Week"}</th>
              <th scope="col">Date</th>
              <th scope="col">Gold (USD/oz)</th>
              <th scope="col">USD/INR</th>
              <th scope="col">Gold (INR/g)</th>
            </tr>
          </thead>
          <tbody>
            {forecastPoints.map((forecastPoint) => (
              <tr key={forecastPoint.step}>
                <td>{forecastPoint.step}</td>
                <td>{formatLongDate(forecastPoint.date)}</td>
                <td>{formatPrice(forecastPoint.gold_usd_per_ounce)}</td>
                <td>{formatPrice(forecastPoint.inr_per_usd)}</td>
                <td>{formatPrice(forecastPoint.gold_inr_per_gram)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

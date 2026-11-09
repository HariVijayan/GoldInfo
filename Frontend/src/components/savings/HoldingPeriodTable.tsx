import type { HoldingPeriodOutcome } from "../../types/savingsTypes";
import { formatShare } from "../../utils/formatters";
import { formatRate } from "../../utils/savingsFormatters";
import { ChartEmptyMessage, ChartPanel } from "../common/ChartPanel";

export function HoldingPeriodTable({ outcomes }: { outcomes: HoldingPeriodOutcome[] }) {
  return (
    <ChartPanel
      title="Does the start date matter?"
      subtitle="Every day in the chosen range is tried as a purchase date and held for each length below, against savings at the same rate."
    >
      {outcomes.length === 0 ? (
        <ChartEmptyMessage message="The chosen range is shorter than one year, so no full holding periods fit." />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Held for</th>
                <th scope="col">Start dates</th>
                <th scope="col">Gold gained</th>
                <th scope="col">Gold beat savings</th>
                <th scope="col">Median gold a year</th>
                <th scope="col">Worst</th>
                <th scope="col">Best</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome) => (
                <tr key={outcome.years}>
                  <td>{outcome.years} {outcome.years === 1 ? "year" : "years"}</td>
                  <td>{outcome.window_count.toLocaleString("en-IN")}</td>
                  <td>{formatShare(outcome.gold_gain_share_pct, 0)}</td>
                  <td>{formatShare(outcome.gold_beat_savings_share_pct, 0)}</td>
                  <td>{formatRate(outcome.median_gold_cagr_pct)}</td>
                  <td>{formatRate(outcome.worst_gold_cagr_pct)}</td>
                  <td>{formatRate(outcome.best_gold_cagr_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="chart-footnote">
        Windows overlap, so these shares show how results varied with timing, not independent trials.
      </p>
    </ChartPanel>
  );
}

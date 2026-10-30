import type { BacktestSummary, ForecastSeriesKey } from "../types/forecastTypes";

type ReliabilityPanelProps = {
  backtest: BacktestSummary | null;
  selectedSeriesKey: ForecastSeriesKey;
  selectedSeriesLabel: string;
  warnings: string[];
};

export function ReliabilityPanel({
  backtest,
  selectedSeriesKey,
  selectedSeriesLabel,
  warnings,
}: ReliabilityPanelProps) {
  const horizonResults = backtest?.results[selectedSeriesKey] ?? [];

  return (
    <section className="panel" aria-label="Forecast reliability">
      <div className="section-heading">
        <h2>How reliable is this?</h2>
      </div>

      {backtest ? (
        <>
          <p className="tab-intro">
            Past accuracy for {selectedSeriesLabel}: the model was re-trained at{" "}
            {backtest.origin_count} earlier points (about every {backtest.step_periods}{" "}
            {backtest.period_unit}) and compared with what actually happened, and with simply
            assuming no change. Lower error is better.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Looking ahead</th>
                  <th scope="col">Model error</th>
                  <th scope="col">No-change error</th>
                  <th scope="col">Better</th>
                </tr>
              </thead>
              <tbody>
                {horizonResults.map((horizonResult) => (
                  <tr key={horizonResult.horizon_steps}>
                    <td>{horizonResult.horizon_label}</td>
                    <td>{horizonResult.model_mape_pct.toFixed(2)}%</td>
                    <td>{horizonResult.naive_mape_pct.toFixed(2)}%</td>
                    <td>{horizonResult.model_beats_naive ? "Model" : "No change"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="tab-intro">Backtest accuracy was not available for this run.</p>
      )}

      <ul className="warning-list">
        {warnings.map((warningText) => (
          <li key={warningText}>{warningText}</li>
        ))}
      </ul>
    </section>
  );
}

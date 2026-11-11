import { useEffect, useMemo, useRef, useState } from "react";
import { ForecastDashboard } from "../components/forecast/ForecastDashboard";
import { ForecastTable } from "../components/forecast/ForecastTable";
import { PriceViewBanner } from "../components/common/PriceViewBanner";
import { MetadataPanel, type RunDetailItem } from "../components/common/MetadataPanel";
import { GOLD_LABEL, INR_LABEL } from "../config/displayLabels";
import {
  DEFAULT_FORECAST_FREQUENCY,
  DEFAULT_FORECAST_HORIZON_WEEKS,
  DEFAULT_FORECAST_SERIES_KEY,
  DEFAULT_HISTORY_SHOWN_WEEKS,
  FORECAST_FREQUENCY_OPTIONS,
  FORECAST_HORIZON_OPTIONS,
} from "../config/forecastConfig";
import { useRerunOnRetailChargeChange } from "../hooks/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../hooks/useRetailPricing";
import { ForecastRequestError, requestForecast } from "../services/forecastClient";
import type { ArtifactFile } from "../types/analysisTypes";
import type {
  ForecastFrequency,
  ForecastResult,
  ForecastSeriesKey,
  ForecastState,
} from "../types/forecastTypes";
import { formatLongDate } from "../utils/chartDates";
import { applyForecastPriceView } from "../utils/priceViewSelectors";

function buildRunDetails(forecastResult: ForecastResult): RunDetailItem[] {
  return [
    { label: "Run ID", value: forecastResult.run_id },
    { label: "Generated at", value: forecastResult.generated_at },
    { label: "Horizon", value: `${forecastResult.forecast.horizon_weeks} weeks` },
    { label: "Retail charge", value: `${forecastResult.request.retail_charge_pct}%` },
    { label: "Detail", value: forecastResult.forecast.frequency },
    {
      label: "Range level",
      value: `${Math.round(forecastResult.forecast.interval_level * 100)}%`,
    },
    {
      label: "Training observations",
      value: `${forecastResult.data_summary.observations_used.toLocaleString("en-IN")} ${
        forecastResult.data_summary.training_frequency
      }`,
    },
    {
      label: "Aligned daily observations",
      value: forecastResult.data_summary.aligned_daily_observations.toLocaleString("en-IN"),
    },
    {
      label: "History used",
      value: `${formatLongDate(forecastResult.data_summary.history_start)} to ${formatLongDate(
        forecastResult.data_summary.history_end
      )}`,
    },
    { label: "Model", value: forecastResult.model.approach },
  ];
}

function ForecastView() {
  const [horizonWeeks, setHorizonWeeks] = useState<number>(DEFAULT_FORECAST_HORIZON_WEEKS);
  const [frequency, setFrequency] = useState<ForecastFrequency>(DEFAULT_FORECAST_FREQUENCY);
  const [historyWeeksShown, setHistoryWeeksShown] = useState<number>(DEFAULT_HISTORY_SHOWN_WEEKS);
  const [selectedSeriesKey, setSelectedSeriesKey] =
    useState<ForecastSeriesKey>(DEFAULT_FORECAST_SERIES_KEY);
  const [forecastState, setForecastState] = useState<ForecastState>("idle");
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([]);
  const activeRequestController = useRef<AbortController | null>(null);
  const { retailChargePct, priceView } = useRetailPricing();

  useEffect(() => () => activeRequestController.current?.abort(), []);

  const runForecast = async () => {
    activeRequestController.current?.abort();
    const requestController = new AbortController();
    activeRequestController.current = requestController;

    setForecastState("running");
    setForecastResult(null);
    setErrorMessage("");
    setArtifactFiles([]);

    try {
      const result = await requestForecast(
        horizonWeeks,
        frequency,
        retailChargePct,
        requestController.signal
      );
      setForecastResult(result);
      setArtifactFiles(result.metadata?.files ?? []);
      setForecastState("success");
    } catch (caughtError) {
      if (requestController.signal.aborted) return;
      if (caughtError instanceof ForecastRequestError) {
        setArtifactFiles(caughtError.artifactFiles);
      }
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : "An unexpected error occurred."
      );
      setForecastState("error");
    }
  };

  const isRunning = forecastState === "running";

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (forecastResult ? applyForecastPriceView(forecastResult, priceView) : null),
    [forecastResult, priceView]
  );

  useRerunOnRetailChargeChange(
    retailChargePct,
    forecastState === "success" || forecastState === "running",
    runForecast
  );

  return (
    <>
      <section className="panel controls" aria-label="Forecast settings">
        <div className="control-groups">
          <div role="radiogroup" aria-label="Forecast horizon" className="period-picker">
            {FORECAST_HORIZON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={horizonWeeks === option.value}
                className="period-option"
                onClick={() => setHorizonWeeks(option.value)}
                disabled={isRunning}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label="Forecast detail" className="period-picker">
            {FORECAST_FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={frequency === option.value}
                className="period-option"
                onClick={() => setFrequency(option.value)}
                disabled={isRunning}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="primary-button" onClick={runForecast} disabled={isRunning}>
          {isRunning ? "Forecasting…" : "Generate forecast"}
        </button>
      </section>

      {forecastState === "idle" && (
        <section className="panel empty-state">
          <h2>No forecast yet</h2>
          <p>
            Choose how far ahead to look and select Generate forecast. The model learns from the
            full available {GOLD_LABEL} price history, so it can take a little while.
          </p>
        </section>
      )}

      {isRunning && (
        <section className="panel loading-panel" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div>
            <h2>Building your forecast</h2>
            <p>
              Downloading the full {GOLD_LABEL} price history, converting it to {INR_LABEL} per
              gram, and training the models. This usually takes 10 to 30 seconds.
            </p>
          </div>
        </section>
      )}

      {forecastState === "error" && (
        <section className="panel error-panel" role="alert">
          <h2>Forecast failed</h2>
          <p>{errorMessage}</p>
          <button type="button" className="secondary-button" onClick={runForecast}>
            Try again
          </button>
        </section>
      )}

      {forecastState === "success" && displayedResult && forecastResult && (
        <>
          <PriceViewBanner
            priceView={priceView}
            retailChargePct={forecastResult.retail.retail_charge_pct}
            retailDescription="INR per gram prices, ranges, and history include the retail charge. Percentage changes, USD prices, and USD/INR are unchanged."
          />
          <ForecastDashboard
            forecastResult={displayedResult}
            selectedSeriesKey={selectedSeriesKey}
            onSelectSeries={setSelectedSeriesKey}
            historyWeeksShown={historyWeeksShown}
            onSelectHistoryWeeks={setHistoryWeeksShown}
          />

          <ForecastTable
            forecastPoints={displayedResult.forecast.points}
            frequency={displayedResult.forecast.frequency}
          />
        </>
      )}

      {artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="forecast-metadata"
          artifactFiles={artifactFiles}
          runDetails={forecastResult ? buildRunDetails(forecastResult) : null}
          isRunning={isRunning}
        />
      )}
    </>
  );
}

export default ForecastView;

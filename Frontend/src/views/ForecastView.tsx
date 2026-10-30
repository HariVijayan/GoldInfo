import { useEffect, useMemo, useRef, useState } from "react";
import { ForecastChart } from "../components/ForecastChart";
import { ForecastSummaryCard } from "../components/ForecastSummaryCard";
import { MetadataPanel } from "../components/MetadataPanel";
import { ReliabilityPanel } from "../components/ReliabilityPanel";
import { ForecastTable } from "../components/ForecastTable";
import {
  DEFAULT_FORECAST_FREQUENCY,
  DEFAULT_FORECAST_HORIZON_WEEKS,
  DEFAULT_FORECAST_SERIES_KEY,
  DEFAULT_HISTORY_SHOWN_WEEKS,
  FORECAST_FREQUENCY_OPTIONS,
  FORECAST_HORIZON_OPTIONS,
  FORECAST_SERIES_OPTIONS,
  HISTORY_SHOWN_OPTIONS,
  STEPS_PER_WEEK,
} from "../config/forecastConfig";
import { ForecastRequestError, requestForecast } from "../services/forecastClient";
import type { ArtifactFile } from "../types/analysisTypes";
import type {
  ForecastFrequency,
  ForecastResult,
  ForecastSeriesKey,
  ForecastState,
} from "../types/forecastTypes";
import { buildForecastChartModel, formatLongDate } from "../utils/forecastChartData";

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
      const result = await requestForecast(horizonWeeks, frequency, requestController.signal);
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
  const selectedSeriesOption =
    FORECAST_SERIES_OPTIONS.find((option) => option.key === selectedSeriesKey) ??
    FORECAST_SERIES_OPTIONS[0];

  const chartModel = useMemo(
    () =>
      forecastResult
        ? buildForecastChartModel(
            selectedSeriesKey,
            forecastResult.history.points,
            forecastResult.forecast.points,
            historyWeeksShown * STEPS_PER_WEEK[forecastResult.forecast.frequency]
          )
        : null,
    [forecastResult, selectedSeriesKey, historyWeeksShown]
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
            full available price history, so it can take a little while.
          </p>
        </section>
      )}

      {isRunning && (
        <section className="panel loading-panel" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div>
            <h2>Building your forecast</h2>
            <p>
              Downloading the full price history, converting it to INR per gram, and training the
              models. This usually takes 10 to 30 seconds.
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

      {forecastState === "success" && forecastResult && chartModel && (
        <>
          <section
            className="forecast-cards"
            role="radiogroup"
            aria-label="Choose a price to chart"
          >
            {FORECAST_SERIES_OPTIONS.map((seriesOption) => (
              <ForecastSummaryCard
                key={seriesOption.key}
                seriesOption={seriesOption}
                summary={forecastResult.forecast.end_of_horizon[seriesOption.key]}
                isSelected={selectedSeriesKey === seriesOption.key}
                onSelect={() => setSelectedSeriesKey(seriesOption.key)}
              />
            ))}
          </section>

          <section className="panel">
            <div className="section-heading chart-heading">
              <h2>{selectedSeriesOption.label}</h2>
              <div role="radiogroup" aria-label="History shown" className="period-picker">
                {HISTORY_SHOWN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={historyWeeksShown === option.value}
                    className="period-option"
                    onClick={() => setHistoryWeeksShown(option.value)}
                  >
                    {option.label} back
                  </button>
                ))}
              </div>
            </div>

            <ForecastChart
              chartPoints={chartModel.chartPoints}
              lastHistoryDate={chartModel.lastHistoryDate}
              unitLabel={selectedSeriesOption.unit}
              intervalPercent={Math.round(forecastResult.forecast.interval_level * 100)}
            />

            <p className="chart-footnote">
              {forecastResult.forecast.steps} {forecastResult.forecast.frequency} points from{" "}
              {formatLongDate(forecastResult.forecast.start_date)} to{" "}
              {formatLongDate(forecastResult.forecast.end_date)}, trained on{" "}
              {forecastResult.data_summary.observations_used} {forecastResult.forecast.frequency}{" "}
              observations ({formatLongDate(forecastResult.data_summary.history_start)} onward).
            </p>
          </section>

          <ReliabilityPanel
            backtest={forecastResult.model.backtest}
            selectedSeriesKey={selectedSeriesKey}
            selectedSeriesLabel={selectedSeriesOption.label}
            warnings={forecastResult.warnings}
          />

          <ForecastTable
            forecastPoints={forecastResult.forecast.points}
            frequency={forecastResult.forecast.frequency}
          />
        </>
      )}

      {artifactFiles.length > 0 && (
        <MetadataPanel
          artifactFiles={artifactFiles}
          runDetails={
            forecastResult
              ? [
                  { label: "Run ID", value: forecastResult.run_id },
                  { label: "Generated at", value: forecastResult.generated_at },
                  { label: "Horizon", value: `${forecastResult.forecast.horizon_weeks} weeks` },
                  { label: "Detail", value: forecastResult.forecast.frequency },
                ]
              : null
          }
          isRunning={isRunning}
        />
      )}
    </>
  );
}

export default ForecastView;

import { useEffect, useRef, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import { ProgressTimeline } from "../components/ProgressTimeline";
import { MetadataPanel } from "../components/MetadataPanel";
import { RangeGauge } from "../components/RangeGauge";
import { DEFAULT_PERIOD_VALUE, PERIOD_OPTIONS } from "../config/analysisConfig";
import { streamGoldAnalysis } from "../services/analysisStreamClient";
import type { AgentEvent, AgentResult, AnalysisState, ArtifactFile } from "../types/analysisTypes";
import { upsertArtifactFile } from "../utils/artifactFiles";
import { formatDate, formatPercent, formatPrice, getChangeTone } from "../utils/formatters";

function AnalysisView() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(DEFAULT_PERIOD_VALUE);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AgentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([]);
  const activeRequestController = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequestController.current?.abort(), []);

  const runAnalysis = async () => {
    activeRequestController.current?.abort();
    const requestController = new AbortController();
    activeRequestController.current = requestController;

    setAnalysisState("running");
    setAgentEvents([]);
    setAnalysisResult(null);
    setErrorMessage("");
    setArtifactFiles([]);

    try {
      const finalResult = await streamGoldAnalysis(
        selectedPeriod,
        {
          onStatusEvent: (agentEvent) =>
            setAgentEvents((currentEvents) => [...currentEvents, agentEvent]),
          onArtifactFile: (artifactFile) =>
            setArtifactFiles((currentFiles) => upsertArtifactFile(currentFiles, artifactFile)),
        },
        requestController.signal
      );
      if (finalResult.metadata?.files.length) {
        setArtifactFiles(finalResult.metadata.files);
      }
      setAnalysisResult(finalResult);
      setAnalysisState("success");
    } catch (caughtError) {
      if (requestController.signal.aborted) return;
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : "An unexpected error occurred."
      );
      setAnalysisState("error");
    }
  };

  const isRunning = analysisState === "running";
  const metrics = analysisResult?.analysis;
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === analysisResult?.request.period)?.label ??
    analysisResult?.request.period;
  const interpretationParagraphs =
    analysisResult?.interpretation.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <>
      <section className="panel controls" aria-label="Analysis settings">
        <div role="radiogroup" aria-label="Historical period" className="period-picker">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selectedPeriod === option.value}
              className="period-option"
              onClick={() => setSelectedPeriod(option.value)}
              disabled={isRunning}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button type="button" className="primary-button" onClick={runAnalysis} disabled={isRunning}>
          {isRunning ? "Analyzing…" : "Analyze gold"}
        </button>
      </section>

      {analysisState === "idle" && (
        <section className="panel empty-state">
          <h2>No analysis yet</h2>
          <p>Choose a period above and select Analyze gold to see price movement and a written summary.</p>
        </section>
      )}

      <ProgressTimeline agentEvents={agentEvents} isRunning={isRunning} />

      {analysisState === "error" && (
        <section className="panel error-panel" role="alert">
          <h2>Analysis failed</h2>
          <p>{errorMessage}</p>
          <button type="button" className="secondary-button" onClick={runAnalysis}>
            Try again
          </button>
        </section>
      )}

      {analysisState === "success" && analysisResult && metrics && (
        <>
          <section className="panel hero-panel">
            <p className="hero-label">Latest price, {formatDate(metrics.latest_observation_date)}</p>
            <p className="hero-price">
              {formatPrice(metrics.latest_price)} <span className="hero-unit">{metrics.unit}</span>
            </p>
            <p className="hero-coverage">
              {selectedPeriodLabel} selected. Data covers {formatDate(metrics.period_start)} to{" "}
              {formatDate(metrics.period_end)} across {metrics.observation_count} observations.
            </p>

            <RangeGauge
              unit={metrics.unit}
              historicalLow={metrics.historical_low}
              historicalLowDate={metrics.historical_low_date}
              historicalHigh={metrics.historical_high}
              historicalHighDate={metrics.historical_high_date}
              rangePositionPercent={metrics.range_position_pct}
            />
          </section>

          <section className="metrics-grid" aria-label="Key metrics">
            <MetricCard
              metricTitle="1-session change"
              metricValue={formatPercent(metrics.one_session_change_pct)}
              changeTone={getChangeTone(metrics.one_session_change_pct)}
            />
            <MetricCard
              metricTitle="7-day change"
              metricValue={formatPercent(metrics.seven_day_change_pct)}
              changeTone={getChangeTone(metrics.seven_day_change_pct)}
            />
            <MetricCard
              metricTitle="30-day change"
              metricValue={formatPercent(metrics.thirty_day_change_pct)}
              changeTone={getChangeTone(metrics.thirty_day_change_pct)}
            />
            <MetricCard
              metricTitle="Previous price"
              metricValue={`${formatPrice(metrics.previous_price)} ${metrics.unit}`}
              metricCaption={formatDate(metrics.previous_observation_date)}
            />
            <MetricCard
              metricTitle="Below historical high"
              metricValue={formatPercent(metrics.distance_below_high_pct)}
            />
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Analysis</h2>
              <span className="badge badge-success">Complete</span>
            </div>
            <div className="analysis-text">
              {interpretationParagraphs.map((paragraphText, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraphText}</p>
              ))}
            </div>
          </section>

        </>
      )}

      {artifactFiles.length > 0 && (
        <MetadataPanel
          artifactFiles={artifactFiles}
          runDetails={
            analysisResult
              ? [
                { label: "Run ID", value: analysisResult.run_id },
                { label: "Status", value: analysisResult.status },
              ]
              : null
          }
          isRunning={isRunning}
        />
      )}
    </>
  );
}

export default AnalysisView;

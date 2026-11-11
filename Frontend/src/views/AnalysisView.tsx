import { useEffect, useMemo, useRef, useState } from "react";
import { AnalysisDashboard } from "../components/analysis/AnalysisDashboard";
import { ModelSelector } from "../components/analysis/ModelSelector";
import { PriceViewBanner } from "../components/common/PriceViewBanner";
import { ProgressTimeline } from "../components/analysis/ProgressTimeline";
import { MetadataPanel, type RunDetailItem } from "../components/common/MetadataPanel";
import { DEFAULT_PERIOD_VALUE, PERIOD_OPTIONS } from "../config/analysisConfig";
import { CHART_RANGE_OPTIONS, DEFAULT_CHART_RANGE_KEY } from "../config/chartRangeConfig";
import { GOLD_LABEL } from "../config/displayLabels";
import { useModelCatalog } from "../hooks/useModelCatalog";
import { useRerunOnRetailChargeChange } from "../hooks/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../hooks/useRetailPricing";
import { applyAnalysisPriceView } from "../utils/priceViewSelectors";
import { DEFAULT_PRICE_SERIES_KEY } from "../config/priceSeriesConfig";
import { streamGoldAnalysis } from "../services/analysisStreamClient";
import type { AgentEvent, AgentResult, AnalysisState, ArtifactFile } from "../types/analysisTypes";
import type { ChartRangeKey } from "../types/chartTypes";
import type { PriceSeriesKey } from "../types/priceSeriesTypes";
import { upsertArtifactFile } from "../utils/artifactFiles";
import { isRangeCoveredByData } from "../utils/chartRange";
import { formatBackendUnitLabel } from "../utils/formatters";
import { buildHistoricalPricePoints } from "../utils/historicalPriceData";

function buildRunDetails(analysisResult: AgentResult): RunDetailItem[] {
  const requestDetails = analysisResult.request;

  return [
    { label: "Run ID", value: analysisResult.run_id },
    { label: "Status", value: analysisResult.status },
    { label: "Requested period", value: String(requestDetails.period) },
    { label: "Retail charge", value: `${String(requestDetails.retail_charge_pct ?? "N/A")}%` },
    {
      label: "Model",
      value: requestDetails.model
        ? `${String(requestDetails.model)} (${String(requestDetails.model_provider ?? "unknown")})`
        : "N/A",
    },
    {
      label: "Tool calling",
      value: requestDetails.model_supports_tool_calling ? "Model-driven" : "Application-driven",
    },
    { label: "Unit", value: formatBackendUnitLabel(analysisResult.analysis.unit) },
    { label: "Gold ticker", value: String(requestDetails.gold_ticker ?? "N/A") },
    { label: "Exchange rate ticker", value: String(requestDetails.fx_ticker ?? "N/A") },
    { label: "Interval", value: String(requestDetails.interval ?? "N/A") },
    {
      label: "Aligned observations",
      value: analysisResult.analysis.observation_count.toLocaleString("en-IN"),
    },
  ];
}

function AnalysisView() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(DEFAULT_PERIOD_VALUE);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AgentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([]);
  const [selectedChartSeriesKey, setSelectedChartSeriesKey] =
    useState<PriceSeriesKey>(DEFAULT_PRICE_SERIES_KEY);
  const [selectedChartRangeKey, setSelectedChartRangeKey] =
    useState<ChartRangeKey>(DEFAULT_CHART_RANGE_KEY);
  const activeRequestController = useRef<AbortController | null>(null);
  const { retailChargePct, priceView } = useRetailPricing();
  const {
    catalogState,
    modelCatalog,
    errorMessage: modelCatalogErrorMessage,
    selectedModelId,
    setSelectedModelId,
    reloadCatalog,
  } = useModelCatalog();

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
    // A new period may cover fewer ranges, so always start from everything fetched.
    setSelectedChartRangeKey(DEFAULT_CHART_RANGE_KEY);

    try {
      const finalResult = await streamGoldAnalysis(
        selectedPeriod,
        selectedModelId,
        retailChargePct,
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
  const canAnalyze = !isRunning && selectedModelId !== "";
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === analysisResult?.request.period)?.label ??
    analysisResult?.request.period ??
    "";

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (analysisResult ? applyAnalysisPriceView(analysisResult, priceView) : null),
    [analysisResult, priceView]
  );

  useRerunOnRetailChargeChange(
    retailChargePct,
    analysisState === "success" || analysisState === "running",
    runAnalysis
  );

  const pricePoints = useMemo(
    () => buildHistoricalPricePoints(displayedResult?.processed_data),
    [displayedResult]
  );

  const coveredRangeKeys = useMemo(() => {
    if (pricePoints.length === 0) return new Set<ChartRangeKey>([DEFAULT_CHART_RANGE_KEY]);

    const firstDate = pricePoints[0].date;
    const lastDate = pricePoints[pricePoints.length - 1].date;
    return new Set<ChartRangeKey>(
      CHART_RANGE_OPTIONS.filter((rangeOption) =>
        isRangeCoveredByData(firstDate, lastDate, rangeOption)
      ).map((rangeOption) => rangeOption.key)
    );
  }, [pricePoints]);

  return (
    <>
      <section className="panel controls" aria-label="Analysis settings">
        <div className="control-groups">
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

          <ModelSelector
            catalogState={catalogState}
            modelCatalog={modelCatalog}
            errorMessage={modelCatalogErrorMessage}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            onReload={reloadCatalog}
            disabled={isRunning}
          />
        </div>

        <button type="button" className="primary-button" onClick={runAnalysis} disabled={!canAnalyze}>
          {isRunning ? "Analyzing…" : `Analyze`}
        </button>
      </section>

      {analysisState === "idle" && (
        <section className="panel empty-state">
          <h2>No analysis yet</h2>
          <p>
            Choose a period above and select Analyze {GOLD_LABEL} to see price movement, charts,
            and a written summary. Max fetches the longest history available.
          </p>
        </section>
      )}

      <ProgressTimeline agentEvents={agentEvents} analysisState={analysisState} />

      {analysisState === "error" && (
        <section className="panel error-panel" role="alert">
          <h2>Analysis failed</h2>
          <p>{errorMessage}</p>
          <button type="button" className="secondary-button" onClick={runAnalysis}>
            Try again
          </button>
        </section>
      )}

      {analysisState === "success" && displayedResult && analysisResult && (
        <>
        <PriceViewBanner
          priceView={priceView}
          retailChargePct={analysisResult.retail?.retail_charge_pct ?? retailChargePct}
        />
        <AnalysisDashboard
          analysisResult={displayedResult}
          pricePoints={pricePoints}
          selectedPeriodLabel={selectedPeriodLabel}
          selectedSeriesKey={selectedChartSeriesKey}
          onSelectSeries={setSelectedChartSeriesKey}
          selectedRangeKey={selectedChartRangeKey}
          onSelectRange={setSelectedChartRangeKey}
          coveredRangeKeys={coveredRangeKeys}
        />
        </>
      )}

      {artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="analysis-metadata"
          artifactFiles={artifactFiles}
          runDetails={analysisResult ? buildRunDetails(analysisResult) : null}
          isRunning={isRunning}
        />
      )}
    </>
  );
}

export default AnalysisView;

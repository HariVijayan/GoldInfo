import { useCallback, useMemo, useState } from "react";
import { streamGoldAnalysis } from "../../api/analysis/analysisApi";
import { DEFAULT_PERIOD_VALUE, PERIOD_OPTIONS } from "../../config/analysis/analysisConfig";
import type { AgentEvent, AgentResult } from "../../types/analysis/analysisTypes";
import { applyAnalysisPriceView } from "../../utils/analysis/analysisPriceView";
import { buildHistoricalPricePoints } from "../../utils/analysis/historicalPriceData";
import { useAbortableRun } from "../shared/useAbortableRun";
import { useModelSelection } from "../shared/useModelSelection";
import { useRerunOnRetailChargeChange } from "../shared/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../shared/useRetailPricing";
import { useAnalysisChartState } from "./useAnalysisChartState";

/** Everything the Historical analysis tab needs: its inputs, its run, and what to show. */
export function useAnalysisRun() {
  const { retailChargePct, priceView } = useRetailPricing();
  const { selectedModelId } = useModelSelection();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(DEFAULT_PERIOD_VALUE);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const run = useAbortableRun<AgentResult>();

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (run.result ? applyAnalysisPriceView(run.result, priceView) : null),
    [run.result, priceView]
  );
  const pricePoints = useMemo(
    () => buildHistoricalPricePoints(displayedResult?.processed_data),
    [displayedResult]
  );
  const chart = useAnalysisChartState(pricePoints);
  const { resetRange } = chart;
  const { start } = run;

  const runAnalysis = useCallback(() => {
    setAgentEvents([]);
    resetRange();
    return start(({ signal, addArtifactFile }) =>
      streamGoldAnalysis(
        selectedPeriod,
        selectedModelId,
        retailChargePct,
        {
          onStatusEvent: (agentEvent) => setAgentEvents((currentEvents) => [...currentEvents, agentEvent]),
          onArtifactFile: addArtifactFile,
        },
        signal
      )
    );
  }, [start, resetRange, selectedPeriod, selectedModelId, retailChargePct]);

  useRerunOnRetailChargeChange(retailChargePct, run.hasResultOrRun, runAnalysis);

  const requestedPeriod = run.result?.request.period;
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === requestedPeriod)?.label ?? String(requestedPeriod ?? "");

  return {
    run,
    runAnalysis,
    selectedPeriod,
    setSelectedPeriod,
    selectedPeriodLabel,
    selectedModelId,
    canAnalyze: !run.isRunning && selectedModelId !== "",
    agentEvents,
    displayedResult,
    pricePoints,
    chart,
  };
}

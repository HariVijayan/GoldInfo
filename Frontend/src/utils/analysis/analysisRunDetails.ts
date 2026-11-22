import type { AgentResult } from "../../types/analysis/analysisTypes";
import type { RunDetailItem } from "../../types/shared/artifactTypes";
import { formatBackendUnitLabel } from "../shared/formatters";

export function buildAnalysisRunDetails(analysisResult: AgentResult): RunDetailItem[] {
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
    { label: "Aligned observations", value: analysisResult.analysis.observation_count.toLocaleString("en-IN") },
  ];
}

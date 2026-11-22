import { AnalysisControls } from "../../components/analysis/AnalysisControls";
import { AnalysisDashboard } from "../../components/analysis/AnalysisDashboard";
import { ProgressTimeline } from "../../components/analysis/ProgressTimeline";
import { ErrorPanel } from "../../components/common/ErrorPanel";
import { MetadataPanel } from "../../components/common/MetadataPanel";
import { ErrorBoundary } from "../../components/layout/ErrorBoundary";
import { ProcedurePanel } from "../../components/layout/ProcedurePanel";
import { useAnalysisRun } from "../../hooks/analysis/useAnalysisRun";
import { useCollapseWhenResultArrives } from "../../hooks/shared/useCollapseWhenResultArrives";
import { buildAnalysisRunDetails } from "../../utils/analysis/analysisRunDetails";

/** The Historical analysis tab: procedure, inputs, agent progress, then the result. */
function AnalysisView() {
  const analysis = useAnalysisRun();
  const { run, displayedResult } = analysis;
  const procedure = useCollapseWhenResultArrives(run.status === "success");

  return (
    <ErrorBoundary sectionName="Historical Analysis">
      <ProcedurePanel featureId="analysis" isExpanded={procedure.isExpanded} onToggle={procedure.toggle} />

      <AnalysisControls
        selectedPeriod={analysis.selectedPeriod}
        onSelectPeriod={analysis.setSelectedPeriod}
        isRunning={run.isRunning}
        canAnalyze={analysis.canAnalyze}
        onAnalyze={analysis.runAnalysis}
      />

      <ProgressTimeline agentEvents={analysis.agentEvents} analysisState={run.status} />

      {run.status === "error" && (
        <ErrorPanel title="Analysis failed" message={run.errorMessage} onRetry={analysis.runAnalysis} />
      )}

      {run.status === "success" && displayedResult && (
        <AnalysisDashboard
          analysisResult={displayedResult}
          pricePoints={analysis.pricePoints}
          selectedPeriodLabel={analysis.selectedPeriodLabel}
          selectedSeriesKey={analysis.chart.selectedSeriesKey}
          onSelectSeries={analysis.chart.setSelectedSeriesKey}
          selectedRangeKey={analysis.chart.selectedRangeKey}
          onSelectRange={analysis.chart.setSelectedRangeKey}
          coveredRangeKeys={analysis.chart.coveredRangeKeys}
        />
      )}

      {run.artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="analysis-metadata"
          artifactFiles={run.artifactFiles}
          runDetails={run.result ? buildAnalysisRunDetails(run.result) : null}
          isRunning={run.isRunning}
        />
      )}
    </ErrorBoundary>
  );
}

export default AnalysisView;

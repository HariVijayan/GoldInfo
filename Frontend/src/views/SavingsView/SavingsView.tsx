import { ErrorPanel } from "../../components/common/ErrorPanel";
import { LoadingPanel } from "../../components/common/LoadingPanel";
import { MetadataPanel } from "../../components/common/MetadataPanel";
import { ErrorBoundary } from "../../components/layout/ErrorBoundary";
import { ProcedurePanel } from "../../components/layout/ProcedurePanel";
import { SavingsControls } from "../../components/savings/SavingsControls";
import { SavingsDashboard } from "../../components/savings/SavingsDashboard";
import { useCollapseWhenResultArrives } from "../../hooks/shared/useCollapseWhenResultArrives";
import { useSavingsRun } from "../../hooks/savings/useSavingsRun";
import { buildSavingsRunDetails } from "../../utils/savings/savingsRunDetails";

/** The Savings (Lumpsum) tab: procedure, form, then the result. */
function SavingsView() {
  const savings = useSavingsRun();
  const { run, displayedResult } = savings;
  const procedure = useCollapseWhenResultArrives(run.status === "success");

  return (
    <ErrorBoundary sectionName="Savings (Lumpsum)">
      <ProcedurePanel featureId="savings" isExpanded={procedure.isExpanded} onToggle={procedure.toggle} />

      <SavingsControls
        formValues={savings.formValues}
        formErrors={savings.formErrors}
        onChangeValues={savings.changeFormValues}
        dataRange={savings.dataRange.dataRange}
        dataRangeErrorMessage={savings.dataRange.errorMessage}
        onRetryDataRange={savings.dataRange.retry}
        isRunning={run.isRunning}
        onSubmit={savings.runComparison}
      />

      {run.isRunning && (
        <LoadingPanel
          title="Comparing gold and savings"
          message="The first run downloads the full price history, which can take a few seconds. Later runs reuse it."
        />
      )}

      {run.status === "error" && (
        <ErrorPanel title="Comparison failed" message={run.errorMessage} onRetry={savings.runComparison} />
      )}

      {run.status === "success" && displayedResult && <SavingsDashboard savingsResult={displayedResult} />}

      {run.artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="savings-metadata"
          artifactFiles={run.artifactFiles}
          runDetails={run.result ? buildSavingsRunDetails(run.result) : null}
          isRunning={run.isRunning}
        />
      )}
    </ErrorBoundary>
  );
}

export default SavingsView;

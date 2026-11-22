import { ErrorPanel } from "../../components/common/ErrorPanel";
import { LoadingPanel } from "../../components/common/LoadingPanel";
import { MetadataPanel } from "../../components/common/MetadataPanel";
import { ErrorBoundary } from "../../components/layout/ErrorBoundary";
import { ProcedurePanel } from "../../components/layout/ProcedurePanel";
import { MonthlyControls } from "../../components/savingsMonthly/MonthlyControls";
import { SavingsMonthlyDashboard } from "../../components/savingsMonthly/SavingsMonthlyDashboard";
import { useCollapseWhenResultArrives } from "../../hooks/shared/useCollapseWhenResultArrives";
import { useSavingsMonthlyRun } from "../../hooks/savingsMonthly/useSavingsMonthlyRun";
import { buildMonthlyRunDetails } from "../../utils/savingsMonthly/monthlyRunDetails";

/** The Savings (Monthly) tab: procedure, form, then the result. */
function SavingsMonthlyView() {
  const monthly = useSavingsMonthlyRun();
  const { run, displayedResult } = monthly;
  const procedure = useCollapseWhenResultArrives(run.status === "success");

  return (
    <ErrorBoundary sectionName="Savings (Monthly)">
      <ProcedurePanel featureId="savings-monthly" isExpanded={procedure.isExpanded} onToggle={procedure.toggle} />

      <MonthlyControls
        formValues={monthly.formValues}
        formErrors={monthly.formErrors}
        onChangeValues={monthly.changeFormValues}
        dataRange={monthly.dataRange.dataRange}
        dataRangeErrorMessage={monthly.dataRange.errorMessage}
        onRetryDataRange={monthly.dataRange.retry}
        isRunning={run.isRunning}
        onSubmit={monthly.runComparison}
      />

      {run.isRunning && (
        <LoadingPanel
          title="Comparing monthly gold and RD"
          message="The first run downloads the full price history, which can take a few seconds. Later runs reuse it."
        />
      )}

      {run.status === "error" && (
        <ErrorPanel title="Comparison failed" message={run.errorMessage} onRetry={monthly.runComparison} />
      )}

      {run.status === "success" && displayedResult && <SavingsMonthlyDashboard monthlyResult={displayedResult} />}

      {run.artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="monthly-metadata"
          artifactFiles={run.artifactFiles}
          runDetails={run.result ? buildMonthlyRunDetails(run.result) : null}
          isRunning={run.isRunning}
        />
      )}
    </ErrorBoundary>
  );
}

export default SavingsMonthlyView;

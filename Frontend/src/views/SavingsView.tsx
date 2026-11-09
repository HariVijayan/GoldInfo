import { useCallback, useEffect, useRef, useState } from "react";
import { MetadataPanel, type RunDetailItem } from "../components/common/MetadataPanel";
import { SavingsControls } from "../components/savings/SavingsControls";
import { SavingsDashboard } from "../components/savings/SavingsDashboard";
import { GOLD_LABEL } from "../config/displayLabels";
import { DEFAULT_SAVINGS_FORM_VALUES } from "../config/savingsConfig";
import {
  fetchSavingsDataRange,
  requestSavingsComparison,
  SavingsRequestError,
} from "../services/savingsClient";
import type { ArtifactFile } from "../types/analysisTypes";
import type {
  SavingsDataRange,
  SavingsFormErrors,
  SavingsFormValues,
  SavingsResult,
  SavingsState,
} from "../types/savingsTypes";
import { formatLongDate } from "../utils/chartDates";
import { describeInterest, formatYears } from "../utils/savingsFormatters";
import { validateSavingsForm } from "../utils/savingsInputValidation";

function buildRunDetails(savingsResult: SavingsResult): RunDetailItem[] {
  const { request } = savingsResult;
  return [
    { label: "Run ID", value: savingsResult.run_id },
    { label: "Generated at", value: savingsResult.generated_at },
    {
      label: "Purchase date",
      value:
        request.requested_start_date && request.requested_start_date !== request.effective_start_date
          ? `${formatLongDate(request.effective_start_date)} (asked for ${formatLongDate(request.requested_start_date)})`
          : formatLongDate(request.effective_start_date),
    },
    { label: "Compared up to", value: formatLongDate(request.end_date) },
    { label: "Holding period", value: formatYears(savingsResult.summary.holding_years) },
    {
      label: "Savings amount",
      value:
        request.inr_principal_source === "matched_to_gold_cost"
          ? "Matched to the gold's cost"
          : "Entered by you",
    },
    {
      label: "Interest",
      value: describeInterest(request.annual_interest_rate_pct, request.compounding),
    },
    {
      label: "Market data fetched",
      value: savingsResult.data_range.is_stale
        ? `${savingsResult.data_range.data_fetched_at} (saved copy)`
        : savingsResult.data_range.data_fetched_at,
    },
  ];
}

function SavingsView() {
  const [formValues, setFormValues] = useState<SavingsFormValues>(DEFAULT_SAVINGS_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<SavingsFormErrors>({});
  const [dataRange, setDataRange] = useState<SavingsDataRange | null>(null);
  const [dataRangeErrorMessage, setDataRangeErrorMessage] = useState("");
  const [dataRangeReloadCount, setDataRangeReloadCount] = useState(0);
  const [savingsState, setSavingsState] = useState<SavingsState>("idle");
  const [savingsResult, setSavingsResult] = useState<SavingsResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([]);
  const activeRequestController = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequestController.current?.abort(), []);

  useEffect(() => {
    const requestController = new AbortController();

    fetchSavingsDataRange(requestController.signal)
      .then((loadedRange) => {
        setDataRange(loadedRange);
        setDataRangeErrorMessage("");
      })
      .catch((caughtError: unknown) => {
        if (requestController.signal.aborted) return;
        setDataRangeErrorMessage(
          caughtError instanceof Error ? caughtError.message : "The available dates could not be loaded."
        );
      });

    return () => requestController.abort();
  }, [dataRangeReloadCount]);

  const retryDataRange = useCallback(() => {
    setDataRangeErrorMessage("");
    setDataRangeReloadCount((currentCount) => currentCount + 1);
  }, []);

  const changeFormValues = (changedValues: Partial<SavingsFormValues>) => {
    setFormValues((currentValues) => ({ ...currentValues, ...changedValues }));
    // Clear the error of whatever the user is editing.
    setFormErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      for (const fieldName of Object.keys(changedValues) as (keyof SavingsFormValues)[]) {
        if (fieldName !== "compounding") delete remainingErrors[fieldName];
      }
      return remainingErrors;
    });
  };

  const runComparison = async () => {
    const formCheck = validateSavingsForm(formValues, dataRange);
    setFormErrors(formCheck.errors);
    if (formCheck.requestParams === null) return;

    activeRequestController.current?.abort();
    const requestController = new AbortController();
    activeRequestController.current = requestController;

    setSavingsState("running");
    setSavingsResult(null);
    setErrorMessage("");
    setArtifactFiles([]);

    try {
      const result = await requestSavingsComparison(formCheck.requestParams, requestController.signal);
      setSavingsResult(result);
      setArtifactFiles(result.metadata?.files ?? []);
      setSavingsState("success");
    } catch (caughtError) {
      if (requestController.signal.aborted) return;
      if (caughtError instanceof SavingsRequestError) {
        setArtifactFiles(caughtError.artifactFiles);
      }
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : "An unexpected error occurred."
      );
      setSavingsState("error");
    }
  };

  const isRunning = savingsState === "running";

  return (
    <>
      <SavingsControls
        formValues={formValues}
        formErrors={formErrors}
        onChangeValues={changeFormValues}
        dataRange={dataRange}
        dataRangeErrorMessage={dataRangeErrorMessage}
        onRetryDataRange={retryDataRange}
        isRunning={isRunning}
        onSubmit={runComparison}
      />

      {savingsState === "idle" && (
        <section className="panel empty-state">
          <h2>No comparison yet</h2>
          <p>
            Pick a start date, how much {GOLD_LABEL} you bought, and the interest a bank would have
            paid on the same money. Leave the date empty to start from the oldest data. Gold is
            valued at the latest price and the savings at their balance on the same day.
          </p>
        </section>
      )}

      {isRunning && (
        <section className="panel loading-panel" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div>
            <h2>Comparing gold and savings</h2>
            <p>
              The first run downloads the full price history, which can take a few seconds. Later
              runs reuse it.
            </p>
          </div>
        </section>
      )}

      {savingsState === "error" && (
        <section className="panel error-panel" role="alert">
          <h2>Comparison failed</h2>
          <p>{errorMessage}</p>
          <button type="button" className="secondary-button" onClick={runComparison}>
            Try again
          </button>
        </section>
      )}

      {savingsState === "success" && savingsResult && (
        <SavingsDashboard savingsResult={savingsResult} />
      )}

      {artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="savings-metadata"
          artifactFiles={artifactFiles}
          runDetails={savingsResult ? buildRunDetails(savingsResult) : null}
          isRunning={isRunning}
        />
      )}
    </>
  );
}

export default SavingsView;

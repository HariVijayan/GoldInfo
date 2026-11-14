import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MetadataPanel, type RunDetailItem } from "../components/common/MetadataPanel";
import { PriceViewBanner } from "../components/common/PriceViewBanner";
import { MonthlyControls } from "../components/savingsMonthly/MonthlyControls";
import { SavingsMonthlyDashboard } from "../components/savingsMonthly/SavingsMonthlyDashboard";
import { GOLD_LABEL } from "../config/displayLabels";
import { DEFAULT_MONTHLY_FORM_VALUES } from "../config/savingsMonthlyConfig";
import { useRerunOnRetailChargeChange } from "../hooks/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../hooks/useRetailPricing";
import { fetchSavingsDataRange } from "../services/savingsClient";
import { MonthlySavingsRequestError, requestMonthlySavings } from "../services/savingsMonthlyClient";
import type { ArtifactFile } from "../types/analysisTypes";
import type {
  MonthlyFormErrors,
  MonthlyFormValues,
  MonthlyResult,
  MonthlyState,
} from "../types/savingsMonthlyTypes";
import type { SavingsDataRange } from "../types/savingsTypes";
import { formatLongDate } from "../utils/chartDates";
import { formatRupees } from "../utils/formatters";
import { selectMonthlyView } from "../utils/priceViewSelectors";
import { describeInterest, formatPlainNumber, formatYears } from "../utils/savingsFormatters";
import { describeBuyRule } from "../utils/savingsMonthlyFormatters";
import { validateMonthlyForm } from "../utils/savingsMonthlyInputValidation";

function buildRunDetails(monthlyResult: MonthlyResult): RunDetailItem[] {
  const { request } = monthlyResult;
  const originalSummary = monthlyResult.views.original.summary;
  return [
    { label: "Run ID", value: monthlyResult.run_id },
    { label: "Generated at", value: monthlyResult.generated_at },
    { label: "Monthly investment", value: formatRupees(request.monthly_investment_inr) },
    {
      label: "First payment",
      value:
        request.requested_start_date && request.requested_start_date !== request.first_deposit_date
          ? `${formatLongDate(request.first_deposit_date)} (asked for ${formatLongDate(request.requested_start_date)})`
          : formatLongDate(request.first_deposit_date),
    },
    { label: "Valued on", value: formatLongDate(request.end_date) },
    { label: "Installments", value: String(originalSummary.installment_count) },
    { label: "Holding period", value: formatYears(originalSummary.holding_years) },
    { label: "RD interest", value: describeInterest(request.annual_interest_rate_pct, request.compounding) },
    { label: "Gold bought on", value: `${describeBuyRule(request.buy_rule)} (${request.buy_window})` },
    { label: "Retail charge", value: `${formatPlainNumber(request.retail_charge_pct)}%` },
    {
      label: "Market data fetched",
      value: monthlyResult.data_range.is_stale
        ? `${monthlyResult.data_range.data_fetched_at} (saved copy)`
        : monthlyResult.data_range.data_fetched_at,
    },
  ];
}

function SavingsMonthlyView() {
  const [formValues, setFormValues] = useState<MonthlyFormValues>(DEFAULT_MONTHLY_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<MonthlyFormErrors>({});
  const [dataRange, setDataRange] = useState<SavingsDataRange | null>(null);
  const [dataRangeErrorMessage, setDataRangeErrorMessage] = useState("");
  const [dataRangeReloadCount, setDataRangeReloadCount] = useState(0);
  const [monthlyState, setMonthlyState] = useState<MonthlyState>("idle");
  const [monthlyResult, setMonthlyResult] = useState<MonthlyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([]);
  const activeRequestController = useRef<AbortController | null>(null);
  const { retailChargePct, priceView } = useRetailPricing();

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

  const changeFormValues = (changedValues: Partial<MonthlyFormValues>) => {
    setFormValues((currentValues) => ({ ...currentValues, ...changedValues }));
    // Clear the error of whatever the user is editing.
    setFormErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      for (const fieldName of Object.keys(changedValues) as (keyof MonthlyFormValues)[]) {
        if (fieldName in remainingErrors) delete remainingErrors[fieldName as keyof MonthlyFormErrors];
      }
      return remainingErrors;
    });
  };

  const runComparison = async () => {
    const formCheck = validateMonthlyForm(formValues, dataRange, retailChargePct);
    setFormErrors(formCheck.errors);
    if (formCheck.requestParams === null) return;

    activeRequestController.current?.abort();
    const requestController = new AbortController();
    activeRequestController.current = requestController;

    setMonthlyState("running");
    setMonthlyResult(null);
    setErrorMessage("");
    setArtifactFiles([]);

    try {
      const result = await requestMonthlySavings(formCheck.requestParams, requestController.signal);
      setMonthlyResult(result);
      setArtifactFiles(result.metadata?.files ?? []);
      setMonthlyState("success");
    } catch (caughtError) {
      if (requestController.signal.aborted) return;
      if (caughtError instanceof MonthlySavingsRequestError) {
        setArtifactFiles(caughtError.artifactFiles);
      }
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : "An unexpected error occurred."
      );
      setMonthlyState("error");
    }
  };

  const isRunning = monthlyState === "running";

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (monthlyResult ? selectMonthlyView(monthlyResult, priceView) : null),
    [monthlyResult, priceView]
  );

  useRerunOnRetailChargeChange(
    retailChargePct,
    monthlyState === "success" || monthlyState === "running",
    runComparison
  );

  return (
    <>
      <MonthlyControls
        formValues={formValues}
        formErrors={formErrors}
        onChangeValues={changeFormValues}
        dataRange={dataRange}
        dataRangeErrorMessage={dataRangeErrorMessage}
        onRetryDataRange={retryDataRange}
        isRunning={isRunning}
        onSubmit={runComparison}
      />

      {monthlyState === "idle" && (
        <section className="panel empty-state">
          <h2>No comparison yet</h2>
          <p>
            Pick a start date and a monthly amount. Each month the same amount goes into a
            recurring deposit on the 1st, and into {GOLD_LABEL} on the cheapest day from the 1st to
            the 10th. Leave the date empty to start from the oldest data. Everything is valued on
            the latest date.
          </p>
        </section>
      )}

      {isRunning && (
        <section className="panel loading-panel" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div>
            <h2>Comparing monthly gold and RD</h2>
            <p>
              The first run downloads the full price history, which can take a few seconds. Later
              runs reuse it.
            </p>
          </div>
        </section>
      )}

      {monthlyState === "error" && (
        <section className="panel error-panel" role="alert">
          <h2>Comparison failed</h2>
          <p>{errorMessage}</p>
          <button type="button" className="secondary-button" onClick={runComparison}>
            Try again
          </button>
        </section>
      )}

      {monthlyState === "success" && monthlyResult && displayedResult && (
        <>
          <PriceViewBanner
            priceView={priceView}
            retailChargePct={monthlyResult.request.retail_charge_pct}
            retailDescription={`Each month's gold is bought at the retail price (+${formatPlainNumber(
              monthlyResult.request.retail_charge_pct
            )}%) and valued at the original price, the way a buyer-back roughly pays. The RD is unaffected.`}
          />
          <SavingsMonthlyDashboard monthlyResult={displayedResult} />
        </>
      )}

      {artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="monthly-metadata"
          artifactFiles={artifactFiles}
          runDetails={monthlyResult ? buildRunDetails(monthlyResult) : null}
          isRunning={isRunning}
        />
      )}
    </>
  );
}

export default SavingsMonthlyView;

import type { FormEvent } from "react";
import { RUPEE_SYMBOL } from "../../config/displayLabels";
import { INTEREST_RATE_PRESETS_PCT } from "../../config/savingsConfig";
import { BUY_RULE_OPTIONS, MONTHLY_COMPOUNDING_OPTIONS } from "../../config/savingsMonthlyConfig";
import type { MonthlyFormErrors, MonthlyFormValues } from "../../types/savingsMonthlyTypes";
import type { SavingsDataRange } from "../../types/savingsTypes";
import { FormTextField } from "../common/FormTextField";

type MonthlyControlsProps = {
  formValues: MonthlyFormValues;
  formErrors: MonthlyFormErrors;
  onChangeValues: (changedValues: Partial<MonthlyFormValues>) => void;
  dataRange: SavingsDataRange | null;
  dataRangeErrorMessage: string;
  onRetryDataRange: () => void;
  isRunning: boolean;
  onSubmit: () => void;
};

export function MonthlyControls({
  formValues,
  formErrors,
  onChangeValues,
  dataRange,
  dataRangeErrorMessage,
  onRetryDataRange,
  isRunning,
  onSubmit,
}: MonthlyControlsProps) {
  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    onSubmit();
  };

  return (
    <form className="panel savings-form" aria-label="Monthly savings settings" onSubmit={handleSubmit}>
      <div className="field-grid">
        <FormTextField
          idPrefix="monthly"
          fieldName="startDate"
          type="date"
          label="Start date"
          hint={
            dataRange
              ? `Empty uses the oldest date, ${dataRange.earliest_date}.`
              : "Empty uses the oldest date with data."
          }
          value={formValues.startDate}
          error={formErrors.startDate}
          min={dataRange?.earliest_date}
          max={dataRange?.latest_date}
          disabled={isRunning}
          onChange={(event) => onChangeValues({ startDate: event.target.value })}
        />
        <FormTextField
          idPrefix="monthly"
          fieldName="monthlyInvestmentInr"
          label={`Monthly investment (${RUPEE_SYMBOL})`}
          hint="The same amount goes to gold and to the RD each month."
          value={formValues.monthlyInvestmentInr}
          error={formErrors.monthlyInvestmentInr}
          inputMode="decimal"
          disabled={isRunning}
          onChange={(event) => onChangeValues({ monthlyInvestmentInr: event.target.value })}
        />
        <FormTextField
          idPrefix="monthly"
          fieldName="annualInterestRatePct"
          label="RD interest rate (% a year)"
          hint="One flat rate for the whole period."
          value={formValues.annualInterestRatePct}
          error={formErrors.annualInterestRatePct}
          inputMode="decimal"
          disabled={isRunning}
          onChange={(event) => onChangeValues({ annualInterestRatePct: event.target.value })}
        />
      </div>

      <div className="savings-form-options">
        <div className="chart-toolbar-group">
          <span className="chart-toolbar-label" id="monthly-rate-presets-label">
            Quick rates
          </span>
          <div role="group" aria-labelledby="monthly-rate-presets-label" className="period-picker">
            {INTEREST_RATE_PRESETS_PCT.map((presetRate) => (
              <button
                key={presetRate}
                type="button"
                className="period-option period-option-compact"
                aria-pressed={Number(formValues.annualInterestRatePct) === presetRate}
                disabled={isRunning}
                onClick={() => onChangeValues({ annualInterestRatePct: String(presetRate) })}
              >
                {presetRate}%
              </button>
            ))}
          </div>
        </div>

        <div className="chart-toolbar-group">
          <span className="chart-toolbar-label" id="monthly-compounding-label">
            RD interest added
          </span>
          <div role="radiogroup" aria-labelledby="monthly-compounding-label" className="period-picker">
            {MONTHLY_COMPOUNDING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={formValues.compounding === option.value}
                className="period-option"
                disabled={isRunning}
                onClick={() => onChangeValues({ compounding: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-toolbar-group">
          <span className="chart-toolbar-label" id="monthly-buy-rule-label">
            Gold bought on
          </span>
          <div role="radiogroup" aria-labelledby="monthly-buy-rule-label" className="period-picker">
            {BUY_RULE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={formValues.buyRule === option.value}
                className="period-option"
                disabled={isRunning}
                onClick={() => onChangeValues({ buyRule: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="savings-form-footer">
        <p className="chart-toolbar-caption" aria-live="polite">
          {dataRange ? (
            <>
              Data from {dataRange.earliest_date} to {dataRange.latest_date}
              {dataRange.is_stale && " (saved copy: refresh failed)"}.
            </>
          ) : dataRangeErrorMessage ? (
            <>
              {dataRangeErrorMessage}{" "}
              <button type="button" className="link-button" onClick={onRetryDataRange}>
                Retry
              </button>
            </>
          ) : (
            "Checking the available dates…"
          )}
        </p>
        <button type="submit" className="primary-button" disabled={isRunning}>
          {isRunning ? "Comparing…" : "Compare monthly savings"}
        </button>
      </div>
    </form>
  );
}

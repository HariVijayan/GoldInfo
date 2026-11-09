import type { ChangeEvent, FormEvent } from "react";
import { COMPOUNDING_OPTIONS, INTEREST_RATE_PRESETS_PCT } from "../../config/savingsConfig";
import { RUPEE_SYMBOL } from "../../config/displayLabels";
import type {
  SavingsDataRange,
  SavingsFormErrors,
  SavingsFormField,
  SavingsFormValues,
} from "../../types/savingsTypes";

type SavingsControlsProps = {
  formValues: SavingsFormValues;
  formErrors: SavingsFormErrors;
  onChangeValues: (changedValues: Partial<SavingsFormValues>) => void;
  dataRange: SavingsDataRange | null;
  dataRangeErrorMessage: string;
  onRetryDataRange: () => void;
  isRunning: boolean;
  onSubmit: () => void;
};

type TextFieldProps = {
  fieldName: SavingsFormField;
  label: string;
  hint: string;
  value: string;
  error?: string;
  disabled: boolean;
  inputMode?: "decimal";
  type?: "text" | "date";
  min?: string;
  max?: string;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function TextField({ fieldName, label, hint, error, ...inputProps }: TextFieldProps) {
  const inputId = `savings-${fieldName}`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={hintId}
        autoComplete="off"
        {...inputProps}
      />
      <small
        id={hintId}
        className={error ? "field-hint field-hint-error" : "field-hint"}
        role={error ? "alert" : undefined}
      >
        {error ?? hint}
      </small>
    </div>
  );
}

export function SavingsControls({
  formValues,
  formErrors,
  onChangeValues,
  dataRange,
  dataRangeErrorMessage,
  onRetryDataRange,
  isRunning,
  onSubmit,
}: SavingsControlsProps) {
  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    onSubmit();
  };

  return (
    <form className="panel savings-form" aria-label="Savings settings" onSubmit={handleSubmit}>
      <div className="field-grid">
        <TextField
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
        <TextField
          fieldName="goldGrams"
          label="Gold bought (grams)"
          hint="Priced per gram on the start date."
          value={formValues.goldGrams}
          error={formErrors.goldGrams}
          inputMode="decimal"
          disabled={isRunning}
          onChange={(event) => onChangeValues({ goldGrams: event.target.value })}
        />
        <TextField
          fieldName="inrSavingsAmount"
          label={`INR savings (${RUPEE_SYMBOL})`}
          hint="Empty uses the cost of the gold, for a like-for-like test."
          value={formValues.inrSavingsAmount}
          error={formErrors.inrSavingsAmount}
          inputMode="decimal"
          placeholder="Same as the gold's cost"
          disabled={isRunning}
          onChange={(event) => onChangeValues({ inrSavingsAmount: event.target.value })}
        />
        <TextField
          fieldName="annualInterestRatePct"
          label="Interest rate (% a year)"
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
          <span className="chart-toolbar-label" id="savings-rate-presets-label">
            Quick rates
          </span>
          <div role="group" aria-labelledby="savings-rate-presets-label" className="period-picker">
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
          <span className="chart-toolbar-label" id="savings-compounding-label">
            Interest added
          </span>
          <div role="radiogroup" aria-labelledby="savings-compounding-label" className="period-picker">
            {COMPOUNDING_OPTIONS.map((option) => (
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
          {isRunning ? "Comparing…" : "Compare savings"}
        </button>
      </div>
    </form>
  );
}

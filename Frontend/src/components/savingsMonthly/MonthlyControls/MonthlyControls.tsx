import type { FormEvent } from "react";
import { RUPEE_SYMBOL } from "../../../config/shared/displayLabels";
import { BUY_RULE_OPTIONS, MONTHLY_COMPOUNDING_OPTIONS } from "../../../config/savingsMonthly/savingsMonthlyConfig";
import type { MonthlyFormErrors, MonthlyFormValues } from "../../../types/savingsMonthly/savingsMonthlyTypes";
import type { SavingsDataRange } from "../../../types/savingsShared/savingsSharedTypes";
import { ChoiceGroup } from "../../common/ChoiceGroup";
import { FormTextField } from "../../common/FormTextField";
import { DataRangeCaption } from "../../savingsShared/DataRangeCaption";
import { RatePresetPicker } from "../../savingsShared/RatePresetPicker";

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

/** The form for the monthly comparison: start date, monthly amount, RD interest, and when gold is bought. */
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
        <RatePresetPicker
          currentRateText={formValues.annualInterestRatePct}
          onPick={(ratePct) => onChangeValues({ annualInterestRatePct: String(ratePct) })}
          disabled={isRunning}
        />
        <ChoiceGroup
          label="RD interest added"
          options={MONTHLY_COMPOUNDING_OPTIONS}
          value={formValues.compounding}
          onChange={(compounding) => onChangeValues({ compounding })}
          disabled={isRunning}
        />
        <ChoiceGroup
          label="Gold bought on"
          options={BUY_RULE_OPTIONS}
          value={formValues.buyRule}
          onChange={(buyRule) => onChangeValues({ buyRule })}
          disabled={isRunning}
        />
      </div>

      <div className="savings-form-footer">
        <DataRangeCaption dataRange={dataRange} errorMessage={dataRangeErrorMessage} onRetry={onRetryDataRange} />
        <button type="submit" className="primary-button" disabled={isRunning}>
          {isRunning ? "Comparing…" : "Compare monthly savings"}
        </button>
      </div>
    </form>
  );
}

import type { FormEvent } from "react";
import { RUPEE_SYMBOL } from "../../../config/shared/displayLabels";
import { COMPOUNDING_OPTIONS } from "../../../config/savingsShared/savingsSharedConfig";
import type { SavingsFormErrors, SavingsFormValues } from "../../../types/savings/savingsTypes";
import type { SavingsDataRange } from "../../../types/savingsShared/savingsSharedTypes";
import { ChoiceGroup } from "../../common/ChoiceGroup";
import { FormTextField } from "../../common/FormTextField";
import { DataRangeCaption } from "../../savingsShared/DataRangeCaption";
import { RatePresetPicker } from "../../savingsShared/RatePresetPicker";

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

/** The form for the lumpsum comparison: start date, gold grams, optional savings amount, interest. */
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
        <FormTextField
          idPrefix="savings"
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
          idPrefix="savings"
          fieldName="goldGrams"
          label="Gold bought (grams)"
          hint="Priced per gram on the start date."
          value={formValues.goldGrams}
          error={formErrors.goldGrams}
          inputMode="decimal"
          disabled={isRunning}
          onChange={(event) => onChangeValues({ goldGrams: event.target.value })}
        />
        <FormTextField
          idPrefix="savings"
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
        <FormTextField
          idPrefix="savings"
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
        <RatePresetPicker
          currentRateText={formValues.annualInterestRatePct}
          onPick={(ratePct) => onChangeValues({ annualInterestRatePct: String(ratePct) })}
          disabled={isRunning}
        />
        <ChoiceGroup
          label="Interest added"
          options={COMPOUNDING_OPTIONS}
          value={formValues.compounding}
          onChange={(compounding) => onChangeValues({ compounding })}
          disabled={isRunning}
        />
      </div>

      <div className="savings-form-footer">
        <DataRangeCaption dataRange={dataRange} errorMessage={dataRangeErrorMessage} onRetry={onRetryDataRange} />
        <button type="submit" className="primary-button" disabled={isRunning}>
          {isRunning ? "Comparing…" : "Compare savings"}
        </button>
      </div>
    </form>
  );
}

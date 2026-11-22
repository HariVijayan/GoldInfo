import { useCallback, useMemo, useState } from "react";
import { requestSavingsComparison } from "../../api/savings/savingsApi";
import { DEFAULT_SAVINGS_FORM_VALUES } from "../../config/savings/savingsConfig";
import type { SavingsFormErrors, SavingsFormValues, SavingsResult } from "../../types/savings/savingsTypes";
import { selectSavingsView } from "../../utils/savings/savingsPriceView";
import { validateSavingsForm } from "../../utils/savings/savingsInputValidation";
import { useSavingsDataRange } from "../savingsShared/useSavingsDataRange";
import { useAbortableRun } from "../shared/useAbortableRun";
import { useRerunOnRetailChargeChange } from "../shared/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../shared/useRetailPricing";

/** Everything the Savings (Lumpsum) tab needs: its form, its run, and what to show. */
export function useSavingsRun() {
  const { retailChargePct, priceView } = useRetailPricing();
  const [formValues, setFormValues] = useState<SavingsFormValues>(DEFAULT_SAVINGS_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<SavingsFormErrors>({});
  const dataRange = useSavingsDataRange();
  const run = useAbortableRun<SavingsResult>();
  const { start } = run;

  const changeFormValues = useCallback((changedValues: Partial<SavingsFormValues>) => {
    setFormValues((currentValues) => ({ ...currentValues, ...changedValues }));
    // Clear the error of whatever the user is editing.
    setFormErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      for (const fieldName of Object.keys(changedValues) as (keyof SavingsFormErrors)[]) {
        delete remainingErrors[fieldName];
      }
      return remainingErrors;
    });
  }, []);

  const runComparison = useCallback(() => {
    const formCheck = validateSavingsForm(formValues, dataRange.dataRange, retailChargePct);
    setFormErrors(formCheck.errors);
    const requestParams = formCheck.requestParams;
    if (requestParams === null) return Promise.resolve();
    return start(({ signal }) => requestSavingsComparison(requestParams, signal));
  }, [start, formValues, dataRange.dataRange, retailChargePct]);

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (run.result ? selectSavingsView(run.result, priceView) : null),
    [run.result, priceView]
  );

  useRerunOnRetailChargeChange(retailChargePct, run.hasResultOrRun, runComparison);

  return { run, formValues, formErrors, changeFormValues, runComparison, dataRange, displayedResult };
}

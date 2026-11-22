import { useCallback, useMemo, useState } from "react";
import { requestMonthlySavings } from "../../api/savingsMonthly/savingsMonthlyApi";
import { DEFAULT_MONTHLY_FORM_VALUES } from "../../config/savingsMonthly/savingsMonthlyConfig";
import type {
  MonthlyFormErrors,
  MonthlyFormValues,
  MonthlyResult,
} from "../../types/savingsMonthly/savingsMonthlyTypes";
import { validateMonthlyForm } from "../../utils/savingsMonthly/savingsMonthlyInputValidation";
import { selectMonthlyView } from "../../utils/savingsMonthly/monthlyPriceView";
import { useSavingsDataRange } from "../savingsShared/useSavingsDataRange";
import { useAbortableRun } from "../shared/useAbortableRun";
import { useRerunOnRetailChargeChange } from "../shared/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../shared/useRetailPricing";

/** Everything the Savings (Monthly) tab needs: its form, its run, and what to show. */
export function useSavingsMonthlyRun() {
  const { retailChargePct, priceView } = useRetailPricing();
  const [formValues, setFormValues] = useState<MonthlyFormValues>(DEFAULT_MONTHLY_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<MonthlyFormErrors>({});
  const dataRange = useSavingsDataRange();
  const run = useAbortableRun<MonthlyResult>();
  const { start } = run;

  const changeFormValues = useCallback((changedValues: Partial<MonthlyFormValues>) => {
    setFormValues((currentValues) => ({ ...currentValues, ...changedValues }));
    // Clear the error of whatever the user is editing.
    setFormErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      for (const fieldName of Object.keys(changedValues) as (keyof MonthlyFormErrors)[]) {
        delete remainingErrors[fieldName];
      }
      return remainingErrors;
    });
  }, []);

  const runComparison = useCallback(() => {
    const formCheck = validateMonthlyForm(formValues, dataRange.dataRange, retailChargePct);
    setFormErrors(formCheck.errors);
    const requestParams = formCheck.requestParams;
    if (requestParams === null) return Promise.resolve();
    return start(({ signal }) => requestMonthlySavings(requestParams, signal));
  }, [start, formValues, dataRange.dataRange, retailChargePct]);

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (run.result ? selectMonthlyView(run.result, priceView) : null),
    [run.result, priceView]
  );

  useRerunOnRetailChargeChange(retailChargePct, run.hasResultOrRun, runComparison);

  return { run, formValues, formErrors, changeFormValues, runComparison, dataRange, displayedResult };
}

import { isRecord, requireThat } from "../apiGuards";
import { API_ROUTES } from "../apiRoutes";
import { requestJson } from "../httpClient";
import type { SavingsRequestParams, SavingsResult } from "../../types/savings/savingsTypes";

function parseSavingsResult(responseBody: unknown): SavingsResult {
  requireThat(
    isRecord(responseBody) &&
      responseBody.status === "success" &&
      isRecord(responseBody.views) &&
      isRecord(responseBody.views.original) &&
      isRecord(responseBody.views.original.summary) &&
      isRecord(responseBody.views.retail) &&
      isRecord(responseBody.views.retail.summary),
    "The server response did not contain a comparison."
  );
  return responseBody as unknown as SavingsResult;
}

export function requestSavingsComparison(
  requestParams: SavingsRequestParams,
  signal: AbortSignal
): Promise<SavingsResult> {
  return requestJson(API_ROUTES.savings, {
    method: "POST",
    body: {
      start_date: requestParams.startDate,
      gold_grams: requestParams.goldGrams,
      inr_savings_amount: requestParams.inrSavingsAmount,
      annual_interest_rate_pct: requestParams.annualInterestRatePct,
      compounding: requestParams.compounding,
      retail_charge_pct: requestParams.retailChargePct,
    },
    signal,
    parseResult: parseSavingsResult,
  });
}

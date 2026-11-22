import { isRecord, requireThat } from "../apiGuards";
import { API_ROUTES } from "../apiRoutes";
import { requestJson } from "../httpClient";
import type { MonthlyRequestParams, MonthlyResult } from "../../types/savingsMonthly/savingsMonthlyTypes";

function parseMonthlyResult(responseBody: unknown): MonthlyResult {
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
  return responseBody as unknown as MonthlyResult;
}

export function requestMonthlySavings(
  requestParams: MonthlyRequestParams,
  signal: AbortSignal
): Promise<MonthlyResult> {
  return requestJson(API_ROUTES.savingsMonthly, {
    method: "POST",
    body: {
      start_date: requestParams.startDate,
      monthly_investment_inr: requestParams.monthlyInvestmentInr,
      annual_interest_rate_pct: requestParams.annualInterestRatePct,
      compounding: requestParams.compounding,
      buy_rule: requestParams.buyRule,
      retail_charge_pct: requestParams.retailChargePct,
    },
    signal,
    parseResult: parseMonthlyResult,
  });
}

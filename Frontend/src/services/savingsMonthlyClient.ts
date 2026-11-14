import { API_ROUTES, buildApiUrl } from "../config/apiRoutes";
import type { ArtifactFile, RunMetadata } from "../types/analysisTypes";
import type { MonthlyRequestParams, MonthlyResult } from "../types/savingsMonthlyTypes";

export class MonthlySavingsRequestError extends Error {
  readonly artifactFiles: ArtifactFile[];

  constructor(message: string, artifactFiles: ArtifactFile[] = []) {
    super(message);
    this.artifactFiles = artifactFiles;
  }
}

export async function requestMonthlySavings(
  requestParams: MonthlyRequestParams,
  abortSignal: AbortSignal
): Promise<MonthlyResult> {
  const response = await fetch(buildApiUrl(API_ROUTES.savingsMonthly), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_date: requestParams.startDate,
      monthly_investment_inr: requestParams.monthlyInvestmentInr,
      annual_interest_rate_pct: requestParams.annualInterestRatePct,
      compounding: requestParams.compounding,
      buy_rule: requestParams.buyRule,
      retail_charge_pct: requestParams.retailChargePct,
    }),
    signal: abortSignal,
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new MonthlySavingsRequestError(
      `Server returned HTTP ${response.status} with an unreadable response.`
    );
  }

  if (!response.ok) {
    const errorBody = responseBody as { message?: string; metadata?: RunMetadata };
    throw new MonthlySavingsRequestError(
      errorBody.message ?? `Server returned HTTP ${response.status}.`,
      errorBody.metadata?.files ?? []
    );
  }

  const monthlyResult = responseBody as MonthlyResult;
  if (
    monthlyResult.status !== "success" ||
    !monthlyResult.views?.original?.summary ||
    !monthlyResult.views?.retail?.summary
  ) {
    throw new MonthlySavingsRequestError("The server response did not contain a comparison.");
  }

  return monthlyResult;
}

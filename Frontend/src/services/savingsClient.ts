import { API_ROUTES, buildApiUrl } from "../config/apiRoutes";
import type { ArtifactFile, RunMetadata } from "../types/analysisTypes";
import type { SavingsDataRange, SavingsRequestParams, SavingsResult } from "../types/savingsTypes";
import { readErrorMessage } from "./apiErrors";

export class SavingsRequestError extends Error {
  readonly artifactFiles: ArtifactFile[];

  constructor(message: string, artifactFiles: ArtifactFile[] = []) {
    super(message);
    this.artifactFiles = artifactFiles;
  }
}

export async function fetchSavingsDataRange(abortSignal: AbortSignal): Promise<SavingsDataRange> {
  const response = await fetch(buildApiUrl(API_ROUTES.savingsDataRange), { signal: abortSignal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const dataRange = (await response.json()) as SavingsDataRange;
  if (dataRange.status !== "success" || !dataRange.earliest_date || !dataRange.latest_date) {
    throw new Error("The server response did not contain the available date range.");
  }

  return dataRange;
}

export async function requestSavingsComparison(
  requestParams: SavingsRequestParams,
  abortSignal: AbortSignal
): Promise<SavingsResult> {
  const response = await fetch(buildApiUrl(API_ROUTES.savings), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_date: requestParams.startDate,
      gold_grams: requestParams.goldGrams,
      inr_savings_amount: requestParams.inrSavingsAmount,
      annual_interest_rate_pct: requestParams.annualInterestRatePct,
      compounding: requestParams.compounding,
      retail_charge_pct: requestParams.retailChargePct,
    }),
    signal: abortSignal,
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new SavingsRequestError(
      `Server returned HTTP ${response.status} with an unreadable response.`
    );
  }

  if (!response.ok) {
    const errorBody = responseBody as { message?: string; metadata?: RunMetadata };
    throw new SavingsRequestError(
      errorBody.message ?? `Server returned HTTP ${response.status}.`,
      errorBody.metadata?.files ?? []
    );
  }

  const savingsResult = responseBody as SavingsResult;
  if (
    savingsResult.status !== "success" ||
    !savingsResult.views?.original?.summary ||
    !savingsResult.views?.retail?.summary
  ) {
    throw new SavingsRequestError("The server response did not contain a comparison.");
  }

  return savingsResult;
}

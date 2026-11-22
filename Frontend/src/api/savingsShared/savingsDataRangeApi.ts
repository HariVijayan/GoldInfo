import { isRecord, requireThat } from "../apiGuards";
import { API_ROUTES } from "../apiRoutes";
import { requestJson } from "../httpClient";
import type { SavingsDataRange } from "../../types/savingsShared/savingsSharedTypes";

function parseDataRange(responseBody: unknown): SavingsDataRange {
  requireThat(
    isRecord(responseBody) &&
      responseBody.status === "success" &&
      typeof responseBody.earliest_date === "string" &&
      typeof responseBody.latest_date === "string",
    "The server response did not contain the available date range."
  );
  return responseBody as unknown as SavingsDataRange;
}

/** Both savings tabs use the same market data, so they share this lookup. */
export function fetchSavingsDataRange(signal: AbortSignal): Promise<SavingsDataRange> {
  return requestJson(API_ROUTES.savingsDataRange, { signal, parseResult: parseDataRange });
}

import { isRecord, requireThat } from "../apiGuards";
import { API_ROUTES } from "../apiRoutes";
import { requestJson } from "../httpClient";
import type { ForecastFrequency, ForecastResult } from "../../types/forecast/forecastTypes";

function parseForecastResult(responseBody: unknown): ForecastResult {
  requireThat(
    isRecord(responseBody) &&
      responseBody.status === "success" &&
      isRecord(responseBody.forecast) &&
      Array.isArray(responseBody.forecast.points) &&
      isRecord(responseBody.history) &&
      Array.isArray(responseBody.history.points) &&
      isRecord(responseBody.retail),
    "The server response did not contain a forecast."
  );
  return responseBody as unknown as ForecastResult;
}

export function requestForecast(
  horizonWeeks: number,
  frequency: ForecastFrequency,
  retailChargePct: number,
  signal: AbortSignal
): Promise<ForecastResult> {
  return requestJson(API_ROUTES.forecast, {
    method: "POST",
    body: { horizon_weeks: horizonWeeks, frequency, retail_charge_pct: retailChargePct },
    signal,
    parseResult: parseForecastResult,
  });
}

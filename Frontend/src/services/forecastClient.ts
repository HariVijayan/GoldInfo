import { FORECAST_URL } from "../config/forecastConfig";
import type { ArtifactFile, RunMetadata } from "../types/analysisTypes";
import type { ForecastFrequency, ForecastResult } from "../types/forecastTypes";

export class ForecastRequestError extends Error {
  readonly artifactFiles: ArtifactFile[];

  constructor(message: string, artifactFiles: ArtifactFile[] = []) {
    super(message);
    this.artifactFiles = artifactFiles;
  }
}

export async function requestForecast(
  horizonWeeks: number,
  frequency: ForecastFrequency,
  abortSignal: AbortSignal
): Promise<ForecastResult> {
  const response = await fetch(FORECAST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ horizon_weeks: horizonWeeks, frequency }),
    signal: abortSignal,
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new ForecastRequestError(
      `Server returned HTTP ${response.status} with an unreadable response.`
    );
  }

  if (!response.ok) {
    const errorBody = responseBody as { message?: string; metadata?: RunMetadata };
    throw new ForecastRequestError(
      errorBody.message ?? `Server returned HTTP ${response.status}.`,
      errorBody.metadata?.files ?? []
    );
  }

  const forecastResult = responseBody as ForecastResult;
  if (
    forecastResult.status !== "success" ||
    !Array.isArray(forecastResult.forecast?.points) ||
    !Array.isArray(forecastResult.history?.points)
  ) {
    throw new ForecastRequestError("The server response did not contain a forecast.");
  }

  return forecastResult;
}

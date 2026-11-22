import { DEFAULT_ANALYSIS_GOAL } from "../../config/analysis/analysisConfig";
import type { AgentEvent, AgentResult } from "../../types/analysis/analysisTypes";
import type { ArtifactFile } from "../../types/shared/artifactTypes";
import { ApiRequestError } from "../apiErrors";
import { isArtifactFile, isRecord } from "../apiGuards";
import { API_ROUTES } from "../apiRoutes";
import { openEventStream } from "../httpClient";
import { readServerSentEvents } from "./serverSentEvents";

export type AnalysisStreamHandlers = {
  onStatusEvent: (agentEvent: AgentEvent) => void;
  onArtifactFile: (artifactFile: ArtifactFile) => void;
};

function isAgentEvent(candidate: unknown): candidate is AgentEvent {
  return isRecord(candidate) && typeof candidate.type === "string" && typeof candidate.message === "string";
}

function parseFinalResult(payload: unknown): AgentResult {
  if (!isRecord(payload)) {
    throw new ApiRequestError("stream", "The server sent an unreadable result.");
  }
  if (payload.status === "error") {
    throw new ApiRequestError(
      "stream",
      typeof payload.interpretation === "string" && payload.interpretation
        ? payload.interpretation
        : "Analysis failed."
    );
  }
  if (!isRecord(payload.analysis) || typeof payload.interpretation !== "string") {
    throw new ApiRequestError("stream", "The server response did not contain an analysis.");
  }
  return payload as unknown as AgentResult;
}

export function streamGoldAnalysis(
  periodValue: string,
  modelId: string,
  retailChargePct: number,
  streamHandlers: AnalysisStreamHandlers,
  signal: AbortSignal
): Promise<AgentResult> {
  const requestBody = {
    goal: DEFAULT_ANALYSIS_GOAL,
    period: periodValue,
    // An empty id lets the server use its default model.
    model: modelId || undefined,
    retail_charge_pct: retailChargePct,
  };

  return openEventStream(API_ROUTES.analyzeStream, requestBody, signal, async (streamBody) => {
    let finalResult: AgentResult | null = null;

    await readServerSentEvents(streamBody, ({ eventName, payload }) => {
      if (eventName === "status" && isAgentEvent(payload)) {
        streamHandlers.onStatusEvent(payload);
      } else if (eventName === "artifact" && isArtifactFile(payload)) {
        streamHandlers.onArtifactFile(payload);
      } else if (eventName === "final") {
        finalResult = parseFinalResult(payload);
      } else if (eventName === "error") {
        throw new ApiRequestError(
          "stream",
          isRecord(payload) && typeof payload.message === "string" && payload.message
            ? payload.message.slice(0, 500)
            : "Analysis failed."
        );
      }
    });

    if (!finalResult) {
      throw new ApiRequestError("stream", "The analysis ended before a result was returned. Please try again.");
    }
    return finalResult;
  });
}

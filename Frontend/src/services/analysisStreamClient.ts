import { ANALYSIS_STREAM_URL, DEFAULT_ANALYSIS_GOAL } from "../config/analysisConfig";
import type { AgentEvent, AgentResult, ArtifactFile } from "../types/analysisTypes";

type ParsedServerEvent = { eventName: string; payload: unknown };

function parseServerSentBlock(rawBlock: string): ParsedServerEvent | null {
  let eventName = "";
  const dataLines: string[] = [];

  for (const line of rawBlock.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const payloadText = dataLines.join("\n");
  if (!eventName || !payloadText) {
    return null;
  }

  try {
    return { eventName, payload: JSON.parse(payloadText) };
  } catch {
    throw new Error(`The server sent an unreadable "${eventName}" event.`);
  }
}

function validateFinalResult(finalResult: AgentResult): AgentResult {
  if (finalResult.status === "error") {
    throw new Error(finalResult.interpretation || "Analysis failed.");
  }
  if (!finalResult.analysis) {
    throw new Error("The server response did not contain analysis metrics.");
  }
  return finalResult;
}

export async function streamGoldAnalysis(
  periodValue: string,
  streamHandlers: {
    onStatusEvent: (agentEvent: AgentEvent) => void;
    onArtifactFile: (artifactFile: ArtifactFile) => void;
  },
  abortSignal: AbortSignal
): Promise<AgentResult> {
  const response = await fetch(ANALYSIS_STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal: DEFAULT_ANALYSIS_GOAL, period: periodValue }),
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}.`);
  }
  if (!response.body) {
    throw new Error("Streaming response body is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pendingText = "";
  let finalResult: AgentResult | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    pendingText += decoder.decode(value, { stream: true });
    const completeBlocks = pendingText.split("\n\n");
    pendingText = completeBlocks.pop() ?? "";

    for (const rawBlock of completeBlocks) {
      const parsedEvent = parseServerSentBlock(rawBlock);
      if (!parsedEvent) continue;

      if (parsedEvent.eventName === "status") {
        streamHandlers.onStatusEvent(parsedEvent.payload as AgentEvent);
      } else if (parsedEvent.eventName === "artifact") {
        streamHandlers.onArtifactFile(parsedEvent.payload as ArtifactFile);
      } else if (parsedEvent.eventName === "final") {
        finalResult = validateFinalResult(parsedEvent.payload as AgentResult);
      } else if (parsedEvent.eventName === "error") {
        const errorPayload = parsedEvent.payload as { message?: string };
        throw new Error(errorPayload.message ?? "Analysis failed.");
      }
    }
  }

  if (!finalResult) {
    throw new Error("The analysis ended before a result was returned. Please try again.");
  }
  return finalResult;
}

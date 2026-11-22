import { ApiRequestError } from "../apiErrors";

export type ParsedServerEvent = { eventName: string; payload: unknown };

/** The largest amount of unfinished text held while waiting for a block to end. */
const MAXIMUM_PENDING_CHARACTERS = 25_000_000;

/** Reads one "event: ... data: ..." block. Returns null for blocks with no event. */
export function parseServerSentBlock(rawBlock: string): ParsedServerEvent | null {
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
  if (!eventName || !payloadText) return null;

  try {
    return { eventName, payload: JSON.parse(payloadText) };
  } catch {
    throw new ApiRequestError("stream", `The server sent an unreadable "${eventName}" event.`);
  }
}

/** Calls onEvent for every complete event in the stream, as it arrives. */
export async function readServerSentEvents(
  streamBody: ReadableStream<Uint8Array>,
  onEvent: (serverEvent: ParsedServerEvent) => void
): Promise<void> {
  const reader = streamBody.getReader();
  const decoder = new TextDecoder();
  let pendingText = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      pendingText += decoder.decode(value, { stream: true });
      if (pendingText.length > MAXIMUM_PENDING_CHARACTERS) {
        throw new ApiRequestError("stream", "The server sent more data than the app accepts.");
      }

      const completeBlocks = pendingText.split("\n\n");
      pendingText = completeBlocks.pop() ?? "";

      for (const rawBlock of completeBlocks) {
        const parsedEvent = parseServerSentBlock(rawBlock);
        if (parsedEvent) onEvent(parsedEvent);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

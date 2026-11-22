import { ApiRequestError } from "./apiErrors";
import { isRecord, readArtifactFiles } from "./apiGuards";
import { buildApiUrl, type ApiRoutePath } from "./apiRoutes";

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const LOOKUP_REQUEST_TIMEOUT_MS = 15_000;
export const STREAM_TIMEOUT_MS = 15 * 60_000;

const MAXIMUM_ERROR_MESSAGE_LENGTH = 500;

const NETWORK_ERROR_MESSAGE =
  "Could not reach the GoldInfo server. Check that the backend is running and that its address is correct.";

type RequestOptions<Result> = {
  method?: "GET" | "POST";
  body?: unknown;
  /** The caller's signal: aborting it cancels the request silently. */
  signal: AbortSignal;
  timeoutMs?: number;
  /** Turns the parsed JSON into the result, or throws if it is unusable. */
  parseResult: (responseBody: unknown) => Result;
};

/**
 * A signal that fires when the caller aborts or the time limit passes, and
 * a way to tell the two apart. Call dispose when the request is finished.
 */
function createRequestSignal(callerSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let hasTimedOut = false;

  const abortFromCaller = () => controller.abort(callerSignal.reason);
  if (callerSignal.aborted) abortFromCaller();
  else callerSignal.addEventListener("abort", abortFromCaller, { once: true });

  const timerId = setTimeout(() => {
    hasTimedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    hasTimedOut: () => hasTimedOut,
    dispose: () => {
      clearTimeout(timerId);
      callerSignal.removeEventListener("abort", abortFromCaller);
    },
  };
}

/** The server's own message when it sent a usable one, else a generic line. */
function readServerMessage(responseBody: unknown, httpStatus: number): string {
  if (isRecord(responseBody) && typeof responseBody.message === "string") {
    const trimmedMessage = responseBody.message.trim();
    if (trimmedMessage) return trimmedMessage.slice(0, MAXIMUM_ERROR_MESSAGE_LENGTH);
  }
  return `The server returned an error (HTTP ${httpStatus}).`;
}

async function sendRequest(
  routePath: ApiRoutePath,
  method: "GET" | "POST",
  body: unknown,
  requestSignal: AbortSignal
): Promise<Response> {
  return fetch(buildApiUrl(routePath), {
    method,
    headers: body === undefined ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: requestSignal,
    // The app never needs cookies or ambient credentials.
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
}

async function failFromResponse(response: Response): Promise<never> {
  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    // The error body was not JSON: the generic message below is enough.
  }
  throw new ApiRequestError("http", readServerMessage(responseBody, response.status), {
    httpStatus: response.status,
    artifactFiles: isRecord(responseBody) ? readArtifactFiles(responseBody.metadata) : [],
  });
}

/** Runs a request and translates every failure into an ApiRequestError. */
async function runGuardedRequest<Result>(
  routePath: ApiRoutePath,
  method: "GET" | "POST",
  body: unknown,
  callerSignal: AbortSignal,
  timeoutMs: number,
  handleResponse: (response: Response) => Promise<Result>
): Promise<Result> {
  const requestSignal = createRequestSignal(callerSignal, timeoutMs);

  try {
    const response = await sendRequest(routePath, method, body, requestSignal.signal);
    if (!response.ok) return await failFromResponse(response);
    return await handleResponse(response);
  } catch (caughtError) {
    if (callerSignal.aborted) throw caughtError; // The caller cancelled: not an error to show.
    if (caughtError instanceof ApiRequestError) throw caughtError;
    if (requestSignal.hasTimedOut()) {
      throw new ApiRequestError(
        "timeout",
        "The server took too long to answer. Please try again."
      );
    }
    throw new ApiRequestError("network", NETWORK_ERROR_MESSAGE);
  } finally {
    requestSignal.dispose();
  }
}

/** One JSON request and its parsed, checked result. */
export async function requestJson<Result>(
  routePath: ApiRoutePath,
  options: RequestOptions<Result>
): Promise<Result> {
  const method = options.method ?? "GET";
  const timeoutMs =
    options.timeoutMs ?? (method === "GET" ? LOOKUP_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS);

  return runGuardedRequest(routePath, method, options.body, options.signal, timeoutMs, async (response) => {
    const contentType = response.headers.get("Content-Type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ApiRequestError("unreadable-response", "The server sent a response the app cannot read.");
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new ApiRequestError("unreadable-response", "The server sent a response the app cannot read.");
    }

    try {
      return options.parseResult(responseBody);
    } catch (parseError) {
      throw new ApiRequestError(
        "invalid-response",
        parseError instanceof Error && parseError.message
          ? parseError.message
          : "The server response was not in the expected form.",
        { artifactFiles: isRecord(responseBody) ? readArtifactFiles(responseBody.metadata) : [] }
      );
    }
  });
}

/** Opens a server-sent event stream and hands over its body reader. */
export async function openEventStream<Result>(
  routePath: ApiRoutePath,
  body: unknown,
  signal: AbortSignal,
  consumeStream: (streamBody: ReadableStream<Uint8Array>) => Promise<Result>
): Promise<Result> {
  return runGuardedRequest(routePath, "POST", body, signal, STREAM_TIMEOUT_MS, async (response) => {
    if (!response.body) {
      throw new ApiRequestError("stream", "The server did not return a readable stream.");
    }
    return consumeStream(response.body);
  });
}

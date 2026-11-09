/**
 * The backend answers every failure with { status: "error", message }.
 * This reads that message, and falls back to the HTTP status when the body
 * is missing or is not JSON.
 */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as { message?: unknown };
    if (typeof errorBody.message === "string" && errorBody.message.length > 0) {
      return errorBody.message;
    }
  } catch {
    // Fall through to the generic message.
  }
  return `Server returned HTTP ${response.status}.`;
}

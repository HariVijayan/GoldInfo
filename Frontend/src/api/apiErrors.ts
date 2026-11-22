import type { ArtifactFile } from "../types/shared/artifactTypes";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "http"
  | "unreadable-response"
  | "invalid-response"
  | "stream";

/**
 * The only error type the API layer throws. The message is always safe to
 * show to a person: it never contains a stack trace or raw server output.
 * artifactFiles carries any files the server produced before it failed.
 */
export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly httpStatus: number | null;
  readonly artifactFiles: ArtifactFile[];

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { httpStatus?: number | null; artifactFiles?: ArtifactFile[] } = {}
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.kind = kind;
    this.httpStatus = options.httpStatus ?? null;
    this.artifactFiles = options.artifactFiles ?? [];
  }
}

/** A message for any thrown value, for places that display errors. */
export function describeError(caughtError: unknown): string {
  if (caughtError instanceof Error && caughtError.message) return caughtError.message;
  return "An unexpected error occurred.";
}

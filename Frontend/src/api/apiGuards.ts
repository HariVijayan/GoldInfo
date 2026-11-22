import type { ArtifactFile } from "../types/shared/artifactTypes";

export function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}

export function isArtifactFile(candidate: unknown): candidate is ArtifactFile {
  return (
    isRecord(candidate) &&
    typeof candidate.filename === "string" &&
    typeof candidate.media_type === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.description === "string"
  );
}

/** Reads the files list of a run's metadata, dropping anything malformed. */
export function readArtifactFiles(metadata: unknown): ArtifactFile[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.files)) return [];
  return metadata.files.filter(isArtifactFile);
}

/** Throws a plain Error when a response is missing what the screen needs. */
export function requireThat(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

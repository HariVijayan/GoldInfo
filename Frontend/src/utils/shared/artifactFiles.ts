import type { ArtifactFile } from "../../types/shared/artifactTypes";

/** The only kinds of file the server produces. Anything else is saved as plain text. */
const ALLOWED_MEDIA_TYPES = new Set(["text/csv", "text/plain"]);
const ALLOWED_EXTENSIONS = new Set(["csv", "txt"]);
const FALLBACK_FILE_NAME = "goldinfo-download.txt";
const MAXIMUM_FILE_NAME_LENGTH = 100;

export function upsertArtifactFile(currentFiles: ArtifactFile[], incomingFile: ArtifactFile): ArtifactFile[] {
  const existingIndex = currentFiles.findIndex((currentFile) => currentFile.filename === incomingFile.filename);

  if (existingIndex === -1) return [...currentFiles, incomingFile];

  const updatedFiles = [...currentFiles];
  updatedFiles[existingIndex] = incomingFile;
  return updatedFiles;
}

export function formatFileSize(artifactFile: ArtifactFile): string {
  const sizeInBytes = new Blob([artifactFile.content]).size;
  return sizeInBytes < 1024 ? `${sizeInBytes} B` : `${(sizeInBytes / 1024).toFixed(1)} KB`;
}

/**
 * A file name that is safe to save: no folders, no hidden or odd characters,
 * and only a known extension. The name comes from the server, so it is
 * checked even though it is expected to be well formed.
 */
export function sanitizeDownloadFileName(requestedName: string): string {
  const lastSegment = requestedName.split(/[\\/]/).pop() ?? "";
  const cleanedName = lastSegment
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, MAXIMUM_FILE_NAME_LENGTH);

  const extension = cleanedName.includes(".") ? (cleanedName.split(".").pop() ?? "").toLowerCase() : "";
  if (!cleanedName || !ALLOWED_EXTENSIONS.has(extension)) return FALLBACK_FILE_NAME;
  return cleanedName;
}

export function chooseDownloadMediaType(requestedMediaType: string): string {
  const baseType = requestedMediaType.split(";")[0].trim().toLowerCase();
  return ALLOWED_MEDIA_TYPES.has(baseType) ? baseType : "text/plain";
}

export function downloadArtifactFile(artifactFile: ArtifactFile): void {
  const fileBlob = new Blob([artifactFile.content], {
    type: `${chooseDownloadMediaType(artifactFile.media_type)};charset=utf-8`,
  });
  const temporaryUrl = URL.createObjectURL(fileBlob);
  const temporaryLink = document.createElement("a");

  temporaryLink.href = temporaryUrl;
  temporaryLink.download = sanitizeDownloadFileName(artifactFile.filename);
  temporaryLink.rel = "noopener";
  document.body.appendChild(temporaryLink);
  temporaryLink.click();
  temporaryLink.remove();

  // Revoking at once can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1000);
}

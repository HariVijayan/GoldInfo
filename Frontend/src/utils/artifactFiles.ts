import type { ArtifactFile } from "../types/analysisTypes";

export function upsertArtifactFile(
  currentFiles: ArtifactFile[],
  incomingFile: ArtifactFile
): ArtifactFile[] {
  const existingIndex = currentFiles.findIndex(
    (currentFile) => currentFile.filename === incomingFile.filename
  );

  if (existingIndex === -1) {
    return [...currentFiles, incomingFile];
  }

  const updatedFiles = [...currentFiles];
  updatedFiles[existingIndex] = incomingFile;
  return updatedFiles;
}

export function formatFileSize(artifactFile: ArtifactFile): string {
  const sizeInBytes = new Blob([artifactFile.content]).size;
  return sizeInBytes < 1024
    ? `${sizeInBytes} B`
    : `${(sizeInBytes / 1024).toFixed(1)} KB`;
}

export function downloadArtifactFile(artifactFile: ArtifactFile): void {
  const fileBlob = new Blob([artifactFile.content], {
    type: `${artifactFile.media_type};charset=utf-8`,
  });
  const temporaryUrl = URL.createObjectURL(fileBlob);
  const temporaryLink = document.createElement("a");

  temporaryLink.href = temporaryUrl;
  temporaryLink.download = artifactFile.filename;
  document.body.appendChild(temporaryLink);
  temporaryLink.click();
  temporaryLink.remove();
  URL.revokeObjectURL(temporaryUrl);
}

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, describeError } from "../../api/apiErrors";
import type { ArtifactFile, RunMetadata } from "../../types/shared/artifactTypes";
import type { RunStatus } from "../../types/shared/runTypes";
import { upsertArtifactFile } from "../../utils/shared/artifactFiles";

type RunContext = {
  /** Aborted when a newer run starts or the screen is closed. */
  signal: AbortSignal;
  /** For runs that deliver files while they work. */
  addArtifactFile: (artifactFile: ArtifactFile) => void;
};

/**
 * One request-driven run: its status, result, error message, and files.
 *
 * Starting a run cancels the one before it, so a slow old answer can never
 * overwrite a newer one. The run is also cancelled when the screen goes away.
 * Cancelled runs are silent: they never show as errors.
 */
export function useAbortableRun<Result extends { metadata?: RunMetadata }>() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([]);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => () => activeController.current?.abort(), []);

  const start = useCallback(async (execute: (context: RunContext) => Promise<Result>) => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    setStatus("running");
    setResult(null);
    setErrorMessage("");
    setArtifactFiles([]);

    try {
      const runResult = await execute({
        signal: controller.signal,
        addArtifactFile: (artifactFile) =>
          setArtifactFiles((currentFiles) => upsertArtifactFile(currentFiles, artifactFile)),
      });
      if (controller.signal.aborted) return;

      const finalFiles = runResult.metadata?.files;
      if (finalFiles && finalFiles.length > 0) setArtifactFiles(finalFiles);
      setResult(runResult);
      setStatus("success");
    } catch (caughtError) {
      if (controller.signal.aborted) return;

      if (caughtError instanceof ApiRequestError && caughtError.artifactFiles.length > 0) {
        setArtifactFiles(caughtError.artifactFiles);
      }
      setErrorMessage(describeError(caughtError));
      setStatus("error");
    }
  }, []);

  return {
    status,
    result,
    errorMessage,
    artifactFiles,
    isRunning: status === "running",
    /** True when there is a result on screen or one is on its way. */
    hasResultOrRun: status === "success" || status === "running",
    start,
  };
}

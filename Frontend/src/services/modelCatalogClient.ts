import { API_ROUTES, buildApiUrl } from "../config/apiRoutes";
import type { ModelCatalog } from "../types/modelTypes";
import { readErrorMessage } from "./apiErrors";

export async function fetchModelCatalog(abortSignal: AbortSignal): Promise<ModelCatalog> {
  const response = await fetch(buildApiUrl(API_ROUTES.models), { signal: abortSignal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const modelCatalog = (await response.json()) as ModelCatalog;
  if (modelCatalog.status !== "success" || !Array.isArray(modelCatalog.models)) {
    throw new Error("The server response did not contain a model list.");
  }

  return modelCatalog;
}

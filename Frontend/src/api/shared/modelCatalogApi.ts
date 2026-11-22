import { requireThat, isRecord } from "../apiGuards";
import { API_ROUTES } from "../apiRoutes";
import { requestJson } from "../httpClient";
import type { ModelCatalog } from "../../types/shared/modelTypes";

function parseModelCatalog(responseBody: unknown): ModelCatalog {
  requireThat(
    isRecord(responseBody) &&
      responseBody.status === "success" &&
      Array.isArray(responseBody.models) &&
      Array.isArray(responseBody.providers) &&
      typeof responseBody.default_model_id === "string",
    "The server response did not contain a model list."
  );
  return responseBody as unknown as ModelCatalog;
}

export function fetchModelCatalog(signal: AbortSignal): Promise<ModelCatalog> {
  return requestJson(API_ROUTES.models, { signal, parseResult: parseModelCatalog });
}

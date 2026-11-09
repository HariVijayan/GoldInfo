import { useCallback, useEffect, useState } from "react";
import { fetchModelCatalog } from "../services/modelCatalogClient";
import type { ModelCatalog, ModelCatalogState } from "../types/modelTypes";

/** Picks the previous choice if it still exists, else the server default. */
function chooseModelId(modelCatalog: ModelCatalog, previousModelId: string): string {
  const installedIds = modelCatalog.models.map((model) => model.model_id);
  if (previousModelId && installedIds.includes(previousModelId)) return previousModelId;
  if (installedIds.includes(modelCatalog.default_model_id)) return modelCatalog.default_model_id;
  return installedIds[0] ?? "";
}

export function useModelCatalog() {
  const [catalogState, setCatalogState] = useState<ModelCatalogState>("loading");
  const [modelCatalog, setModelCatalog] = useState<ModelCatalog | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const requestController = new AbortController();

    fetchModelCatalog(requestController.signal)
      .then((loadedCatalog) => {
        setModelCatalog(loadedCatalog);
        setSelectedModelId((previousModelId) => chooseModelId(loadedCatalog, previousModelId));
        setErrorMessage("");
        setCatalogState("ready");
      })
      .catch((caughtError: unknown) => {
        if (requestController.signal.aborted) return;
        setErrorMessage(
          caughtError instanceof Error ? caughtError.message : "The model list could not be loaded."
        );
        setCatalogState("error");
      });

    return () => requestController.abort();
  }, [reloadCount]);

  const reloadCatalog = useCallback(() => {
    setCatalogState("loading");
    setReloadCount((currentCount) => currentCount + 1);
  }, []);

  return {
    catalogState,
    modelCatalog,
    errorMessage,
    selectedModelId,
    setSelectedModelId,
    reloadCatalog,
  };
}

import { createContext } from "react";
import type { ModelCatalog, ModelCatalogState } from "../../types/shared/modelTypes";

export type ModelCatalogContextValue = {
  catalogState: ModelCatalogState;
  modelCatalog: ModelCatalog | null;
  errorMessage: string;
  /** The model used for AI overviews. Empty until the list has loaded. */
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  reloadCatalog: () => void;
};

export const ModelCatalogContext = createContext<ModelCatalogContextValue | null>(null);

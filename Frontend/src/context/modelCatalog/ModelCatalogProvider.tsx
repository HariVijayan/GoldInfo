import type { ReactNode } from "react";
import { useModelCatalog } from "../../hooks/shared/useModelCatalog";
import { ModelCatalogContext } from "./modelCatalogContext";

/** Loads the installed models once and shares the list and the choice. */
export function ModelCatalogProvider({ children }: { children: ReactNode }) {
  const modelCatalogState = useModelCatalog();
  return <ModelCatalogContext.Provider value={modelCatalogState}>{children}</ModelCatalogContext.Provider>;
}

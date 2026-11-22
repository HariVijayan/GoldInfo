import { useContext } from "react";
import { ModelCatalogContext } from "../../context/modelCatalog/modelCatalogContext";

export function useModelSelection() {
  const modelSelection = useContext(ModelCatalogContext);
  if (modelSelection === null) {
    throw new Error("useModelSelection must be used inside ModelCatalogProvider.");
  }
  return modelSelection;
}

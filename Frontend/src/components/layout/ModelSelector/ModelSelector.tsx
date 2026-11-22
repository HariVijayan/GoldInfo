import { useModelSelection } from "../../../hooks/shared/useModelSelection";
import type { AvailableModel } from "../../../types/shared/modelTypes";

function formatModelOptionLabel(model: AvailableModel): string {
  return model.parameter_size ? `${model.display_name} · ${model.parameter_size}` : model.display_name;
}

function describeToolCalling(model: AvailableModel): string {
  return model.supports_tool_calling
    ? "Supports tool calling: the model requests the data steps itself."
    : "No tool calling: the app runs the data steps and the model writes the overview.";
}

/**
 * The AI model that writes the Historical analysis overview. It lives in the
 * header so it can be changed from anywhere. The extra detail about the
 * selected model is in the tooltip, to keep the header small.
 */
export function ModelSelector() {
  const { catalogState, modelCatalog, errorMessage, selectedModelId, setSelectedModelId, reloadCatalog } =
    useModelSelection();

  const models = modelCatalog?.models ?? [];
  const selectedModel = models.find((model) => model.model_id === selectedModelId);
  const providerProblem = modelCatalog?.providers.find((provider) => !provider.is_reachable);

  let statusMessage: string | null = null;
  if (catalogState === "error") {
    statusMessage = errorMessage;
  } else if (catalogState === "ready" && models.length === 0) {
    statusMessage = providerProblem?.message ?? "No models installed. Run: ollama pull <model>";
  }

  return (
    <div className="field header-field model-selector">
      <label className="field-label" htmlFor="header-model-select">
        AI model
      </label>
      <div className="field-row">
        <select
          id="header-model-select"
          className="field-input"
          value={selectedModelId}
          title={selectedModel ? describeToolCalling(selectedModel) : undefined}
          onChange={(changeEvent) => setSelectedModelId(changeEvent.target.value)}
          disabled={catalogState !== "ready" || models.length === 0}
        >
          {catalogState === "loading" && <option value="">Loading models…</option>}
          {catalogState !== "loading" && models.length === 0 && <option value="">No model available</option>}
          {models.map((model) => (
            <option key={model.model_id} value={model.model_id}>
              {formatModelOptionLabel(model)}
            </option>
          ))}
        </select>
        {catalogState !== "loading" && (
          <button
            type="button"
            className="secondary-button icon-button"
            onClick={reloadCatalog}
            aria-label="Refresh the model list"
            title="Refresh the model list"
          >
            ↻
          </button>
        )}
      </div>
      {statusMessage && (
        <small className="field-hint field-hint-error" role="alert">
          {statusMessage}
        </small>
      )}
    </div>
  );
}

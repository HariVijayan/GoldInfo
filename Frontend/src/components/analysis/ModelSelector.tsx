import type { AvailableModel, ModelCatalog, ModelCatalogState } from "../../types/modelTypes";

type ModelSelectorProps = {
  catalogState: ModelCatalogState;
  modelCatalog: ModelCatalog | null;
  errorMessage: string;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onReload: () => void;
  disabled: boolean;
};

function formatModelOptionLabel(model: AvailableModel): string {
  return model.parameter_size ? `${model.display_name} · ${model.parameter_size}` : model.display_name;
}

function describeToolCalling(model: AvailableModel): string {
  return model.supports_tool_calling
    ? "Supports tool calling: the model requests the data steps itself."
    : "No tool calling: the app runs the data steps and the model writes the summary.";
}

export function ModelSelector({
  catalogState,
  modelCatalog,
  errorMessage,
  selectedModelId,
  onSelectModel,
  onReload,
  disabled,
}: ModelSelectorProps) {
  const models = modelCatalog?.models ?? [];
  const selectedModel = models.find((model) => model.model_id === selectedModelId);
  const providerProblem = modelCatalog?.providers.find((provider) => !provider.is_reachable);

  let statusMessage: string | null = null;
  if (catalogState === "error") {
    statusMessage = errorMessage;
  } else if (catalogState === "ready" && models.length === 0) {
    statusMessage =
      providerProblem?.message ?? "No models are installed. Install one with: ollama pull <model>";
  }

  return (
    <div className="field model-selector">
      <label className="field-label" htmlFor="analysis-model-select">
        Model
      </label>
      <div className="field-row">
        <select
          id="analysis-model-select"
          className="field-input"
          value={selectedModelId}
          onChange={(changeEvent) => onSelectModel(changeEvent.target.value)}
          disabled={disabled || catalogState !== "ready" || models.length === 0}
        >
          {catalogState === "loading" && <option value="">Loading models…</option>}
          {catalogState !== "loading" && models.length === 0 && (
            <option value="">No model available</option>
          )}
          {models.map((model) => (
            <option key={model.model_id} value={model.model_id}>
              {formatModelOptionLabel(model)}
            </option>
          ))}
        </select>
        {catalogState !== "loading" && (
          <button type="button" className="secondary-button field-button" onClick={onReload}>
            Refresh
          </button>
        )}
      </div>

      {statusMessage && (
        <small className="field-hint field-hint-error" role="alert">
          {statusMessage}
        </small>
      )}
      {!statusMessage && selectedModel && (
        <small className="field-hint">{describeToolCalling(selectedModel)}</small>
      )}
      {modelCatalog?.warnings.map((warningText) => (
        <small key={warningText} className="field-hint">
          {warningText}
        </small>
      ))}
    </div>
  );
}

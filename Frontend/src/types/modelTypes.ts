export type AvailableModel = {
  model_id: string;
  provider: string;
  display_name: string;
  supports_tool_calling: boolean;
  parameter_size: string | null;
  family: string | null;
  quantization: string | null;
  size_bytes: number | null;
};

export type ProviderStatus = {
  provider: string;
  is_reachable: boolean;
  message: string;
};

export type ModelCatalog = {
  status: "success";
  default_model_id: string;
  models: AvailableModel[];
  providers: ProviderStatus[];
  warnings: string[];
};

export type ModelCatalogState = "loading" | "ready" | "error";

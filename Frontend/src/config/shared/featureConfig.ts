import type { FeatureId } from "../../types/shared/featureTypes";

export const FEATURE_OPTIONS: { id: FeatureId; label: string }[] = [
  { id: "analysis", label: "Historical Analysis" },
  { id: "forecast", label: "Forecast" },
  { id: "savings", label: "Savings (Lumpsum)" },
  { id: "savings-monthly", label: "Savings (Monthly)" },
];

export const DEFAULT_FEATURE_ID: FeatureId = "analysis";

export function featureTabId(featureId: FeatureId): string {
  return `feature-tab-${featureId}`;
}

export function featurePanelId(featureId: FeatureId): string {
  return `feature-panel-${featureId}`;
}

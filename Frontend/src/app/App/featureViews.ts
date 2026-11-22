import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { FeatureId } from "../../types/shared/featureTypes";

/**
 * Each tab is loaded the first time it is opened, so the page starts with
 * only what it shows. The chart library travels with the tab that needs it.
 */
export const FEATURE_VIEWS: Record<FeatureId, LazyExoticComponent<ComponentType>> = {
  analysis: lazy(() => import("../../views/AnalysisView")),
  forecast: lazy(() => import("../../views/ForecastView")),
  savings: lazy(() => import("../../views/SavingsView")),
  "savings-monthly": lazy(() => import("../../views/SavingsMonthlyView")),
};

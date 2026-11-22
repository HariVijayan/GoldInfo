import { FEATURE_OPTIONS, featurePanelId, featureTabId } from "../../../config/shared/featureConfig";
import type { FeatureId } from "../../../types/shared/featureTypes";

type FeatureTabsProps = {
  activeFeatureId: FeatureId;
  onSelectFeature: (featureId: FeatureId) => void;
};

/** The four features, as tabs. */
export function FeatureTabs({ activeFeatureId, onSelectFeature }: FeatureTabsProps) {
  return (
    <div className="tab-list view-tabs" role="tablist" aria-label="Features">
      {FEATURE_OPTIONS.map((feature) => (
        <button
          key={feature.id}
          type="button"
          role="tab"
          id={featureTabId(feature.id)}
          aria-selected={activeFeatureId === feature.id}
          aria-controls={featurePanelId(feature.id)}
          className="tab-button"
          onClick={() => onSelectFeature(feature.id)}
        >
          {feature.label}
        </button>
      ))}
    </div>
  );
}

import { Suspense, useState } from "react";
import { LoadingPanel } from "../../components/common/LoadingPanel";
import { AppFooter } from "../../components/layout/AppFooter";
import { AppHeader } from "../../components/layout/AppHeader";
import { ErrorBoundary } from "../../components/layout/ErrorBoundary";
import { FeatureTabs } from "../../components/layout/FeatureTabs";
import { PriceViewNotice } from "../../components/layout/PriceViewNotice";
import { SkipLink } from "../../components/layout/SkipLink";
import {
  DEFAULT_FEATURE_ID,
  FEATURE_OPTIONS,
  featurePanelId,
  featureTabId,
} from "../../config/shared/featureConfig";
import type { FeatureId } from "../../types/shared/featureTypes";
import { AppProviders } from "../AppProviders";
import { FEATURE_VIEWS } from "./featureViews";

/**
 * The page, top to bottom: the fixed header, the price view notice, the
 * four feature tabs, the open tab, and the footer.
 *
 * A tab is created the first time it is opened and then kept (hidden when
 * another tab is shown), so what you entered and the result you got are
 * still there when you come back.
 */
function App() {
  const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>(DEFAULT_FEATURE_ID);
  const [openedFeatureIds, setOpenedFeatureIds] = useState<ReadonlySet<FeatureId>>(
    () => new Set([DEFAULT_FEATURE_ID])
  );

  const selectFeature = (featureId: FeatureId) => {
    setActiveFeatureId(featureId);
    setOpenedFeatureIds((currentIds) => (currentIds.has(featureId) ? currentIds : new Set(currentIds).add(featureId)));
  };

  return (
    <AppProviders>
      <SkipLink />
      <AppHeader />

      <main id="main-content" className="container app-main" tabIndex={-1}>
        <PriceViewNotice featureId={activeFeatureId} />
        <FeatureTabs activeFeatureId={activeFeatureId} onSelectFeature={selectFeature} />

        {FEATURE_OPTIONS.filter((feature) => openedFeatureIds.has(feature.id)).map((feature) => {
          const FeatureView = FEATURE_VIEWS[feature.id];
          return (
            <div
              key={feature.id}
              className="view"
              role="tabpanel"
              id={featurePanelId(feature.id)}
              aria-labelledby={featureTabId(feature.id)}
              hidden={activeFeatureId !== feature.id}
            >
              <ErrorBoundary sectionName={feature.label}>
                <Suspense fallback={<LoadingPanel title={`Loading ${feature.label}`} message="One moment." />}>
                  <FeatureView />
                </Suspense>
              </ErrorBoundary>
            </div>
          );
        })}
      </main>

      <AppFooter />
    </AppProviders>
  );
}

export default App;

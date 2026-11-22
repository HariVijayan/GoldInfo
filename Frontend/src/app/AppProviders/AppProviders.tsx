import type { ReactNode } from "react";
import { ModelCatalogProvider } from "../../context/modelCatalog/ModelCatalogProvider";
import { RetailPricingProvider } from "../../context/retailPricing/RetailPricingProvider";

/** Everything shared across tabs: the retail charge and view, and the AI model choice. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <RetailPricingProvider>
      <ModelCatalogProvider>{children}</ModelCatalogProvider>
    </RetailPricingProvider>
  );
}

import { GOLD_LABEL } from "../../../config/shared/displayLabels";
import { ModelSelector } from "../ModelSelector";
import { RetailPricingControls } from "../RetailPricingControls";

/**
 * The fixed top bar: title, the AI model, and the retail charge with its
 * Original / Retail switch. It stays in view while the page scrolls, so
 * the switch is always one click away.
 */
export function AppHeader() {
  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <div className="app-header-brand">
          <h1>GoldInfo</h1>
          <p>{GOLD_LABEL} trends in rupees</p>
        </div>
        <div className="app-header-controls">
          <ModelSelector />
          <RetailPricingControls />
        </div>
      </div>
    </header>
  );
}

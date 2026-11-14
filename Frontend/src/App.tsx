import { useState } from "react";
import "./App.css";
import AnalysisView from "./views/AnalysisView";
import { GOLD_LABEL } from "./config/displayLabels";
import ForecastView from "./views/ForecastView";
import SavingsMonthlyView from "./views/SavingsMonthlyView";
import SavingsView from "./views/SavingsView";
import { RetailPricingControls } from "./components/layout/RetailPricingControls";
import { RetailPricingProvider } from "./context/RetailPricingProvider";

type ActiveView = "analysis" | "forecast" | "savings" | "savings-monthly";

const VIEW_OPTIONS: { value: ActiveView; label: string }[] = [
  { value: "analysis", label: "Historical analysis" },
  { value: "forecast", label: "Forecast" },
  { value: "savings", label: "Savings" },
  { value: "savings-monthly", label: "Savings (Monthly)" },
];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>("analysis");

  return (
    <RetailPricingProvider>
    <main className="app">
      <div className="container">
        <header className="page-header page-header-row">
          <div>
            <h1>GoldInfo</h1>
            <p>{GOLD_LABEL} price analysis, forecasting and savings comparison, run locally.</p>
          </div>
          <RetailPricingControls />
        </header>

        <div className="tab-list view-tabs" role="tablist" aria-label="Views">
          {VIEW_OPTIONS.map((viewOption) => (
            <button
              key={viewOption.value}
              type="button"
              role="tab"
              id={`view-tab-${viewOption.value}`}
              aria-selected={activeView === viewOption.value}
              aria-controls={`view-panel-${viewOption.value}`}
              className="tab-button"
              onClick={() => setActiveView(viewOption.value)}
            >
              {viewOption.label}
            </button>
          ))}
        </div>

        {/* Both views stay mounted so results survive switching tabs. */}
        <div
          className="view"
          role="tabpanel"
          id="view-panel-analysis"
          aria-labelledby="view-tab-analysis"
          hidden={activeView !== "analysis"}
        >
          <AnalysisView />
        </div>
        <div
          className="view"
          role="tabpanel"
          id="view-panel-forecast"
          aria-labelledby="view-tab-forecast"
          hidden={activeView !== "forecast"}
        >
          <ForecastView />
        </div>
        <div
          className="view"
          role="tabpanel"
          id="view-panel-savings"
          aria-labelledby="view-tab-savings"
          hidden={activeView !== "savings"}
        >
          <SavingsView />
        </div>
        <div
          className="view"
          role="tabpanel"
          id="view-panel-savings-monthly"
          aria-labelledby="view-tab-savings-monthly"
          hidden={activeView !== "savings-monthly"}
        >
          <SavingsMonthlyView />
        </div>
      </div>
    </main>
    </RetailPricingProvider>
  );
}

export default App;

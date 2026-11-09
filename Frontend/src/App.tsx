import { useState } from "react";
import "./App.css";
import AnalysisView from "./views/AnalysisView";
import { GOLD_LABEL } from "./config/displayLabels";
import ForecastView from "./views/ForecastView";
import SavingsView from "./views/SavingsView";

type ActiveView = "analysis" | "forecast" | "savings";

const VIEW_OPTIONS: { value: ActiveView; label: string }[] = [
  { value: "analysis", label: "Historical analysis" },
  { value: "forecast", label: "Forecast" },
  { value: "savings", label: "Savings" },
];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>("analysis");

  return (
    <main className="app">
      <div className="container">
        <header className="page-header">
          <h1>GoldInfo</h1>
          <p>{GOLD_LABEL} price analysis, forecasting and savings comparison, run locally.</p>
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
      </div>
    </main>
  );
}

export default App;

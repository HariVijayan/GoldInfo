import { useState } from "react";
import "./App.css";
import AnalysisView from "./views/AnalysisView";
import ForecastView from "./views/ForecastView";

type ActiveView = "analysis" | "forecast";

const VIEW_OPTIONS: { value: ActiveView; label: string }[] = [
  { value: "analysis", label: "Historical analysis" },
  { value: "forecast", label: "Forecast" },
];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>("analysis");

  return (
    <main className="app">
      <div className="container">
        <header className="page-header">
          <h1>GoldInfo</h1>
          <p>Gold price analysis and forecasting, run locally.</p>
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
      </div>
    </main>
  );
}

export default App;

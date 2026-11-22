import { useState } from "react";
import {
  LONG_MOVING_AVERAGE_WINDOW,
  SHORT_MOVING_AVERAGE_WINDOW,
} from "../../../config/analysis/analysisChartConfig";
import type { AnalysisChartScope } from "../../../types/analysis/analysisChartTypes";
import type { AnalysisDashboardModel } from "../../../utils/analysis/analysisDashboardModel";
import { ChartPanel } from "../../common/ChartPanel";
import { PriceHistoryChart } from "../PriceHistoryChart";

type PriceHistoryPanelProps = { model: AnalysisDashboardModel; scope: AnalysisChartScope };

/** The main price chart, with switches for the two moving averages. */
export function PriceHistoryPanel({ model, scope }: PriceHistoryPanelProps) {
  const [showShortAverage, setShowShortAverage] = useState(true);
  const [showLongAverage, setShowLongAverage] = useState(false);

  const priceToggles = (
    <div className="toggle-group">
      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showShortAverage && model.hasShortAverage}
          disabled={!model.hasShortAverage}
          onChange={(changeEvent) => setShowShortAverage(changeEvent.target.checked)}
        />
        {SHORT_MOVING_AVERAGE_WINDOW}-day average
      </label>
      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showLongAverage && model.hasLongAverage}
          disabled={!model.hasLongAverage}
          onChange={(changeEvent) => setShowLongAverage(changeEvent.target.checked)}
        />
        {LONG_MOVING_AVERAGE_WINDOW}-day average
      </label>
    </div>
  );

  return (
    <ChartPanel
      title={scope.seriesOption.label}
      subtitle={`Daily closing price over ${scope.rangePhrase}.`}
      controls={priceToggles}
    >
      <PriceHistoryChart
        chartPoints={model.priceChartPoints}
        seriesOption={scope.seriesOption}
        windowHigh={model.windowHigh}
        windowLow={model.windowLow}
        showShortAverage={showShortAverage && model.hasShortAverage}
        showLongAverage={showLongAverage && model.hasLongAverage}
      />
    </ChartPanel>
  );
}

import { useCallback, useMemo, useState } from "react";
import { requestForecast } from "../../api/forecast/forecastApi";
import {
  DEFAULT_FORECAST_FREQUENCY,
  DEFAULT_FORECAST_HORIZON_WEEKS,
  DEFAULT_FORECAST_SERIES_KEY,
  DEFAULT_HISTORY_SHOWN_WEEKS,
} from "../../config/forecast/forecastConfig";
import type { ForecastFrequency, ForecastResult, ForecastSeriesKey } from "../../types/forecast/forecastTypes";
import { applyForecastPriceView } from "../../utils/forecast/forecastPriceView";
import { useAbortableRun } from "../shared/useAbortableRun";
import { useRerunOnRetailChargeChange } from "../shared/useRerunOnRetailChargeChange";
import { useRetailPricing } from "../shared/useRetailPricing";

/** Everything the Forecast tab needs: its inputs, its run, and what to show. */
export function useForecastRun() {
  const { retailChargePct, priceView } = useRetailPricing();
  const [horizonWeeks, setHorizonWeeks] = useState<number>(DEFAULT_FORECAST_HORIZON_WEEKS);
  const [frequency, setFrequency] = useState<ForecastFrequency>(DEFAULT_FORECAST_FREQUENCY);
  const [historyWeeksShown, setHistoryWeeksShown] = useState<number>(DEFAULT_HISTORY_SHOWN_WEEKS);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<ForecastSeriesKey>(DEFAULT_FORECAST_SERIES_KEY);
  const run = useAbortableRun<ForecastResult>();
  const { start } = run;

  // The server sends both views; this only picks the one to show.
  const displayedResult = useMemo(
    () => (run.result ? applyForecastPriceView(run.result, priceView) : null),
    [run.result, priceView]
  );

  const runForecast = useCallback(
    () => start(({ signal }) => requestForecast(horizonWeeks, frequency, retailChargePct, signal)),
    [start, horizonWeeks, frequency, retailChargePct]
  );

  useRerunOnRetailChargeChange(retailChargePct, run.hasResultOrRun, runForecast);

  return {
    run,
    runForecast,
    horizonWeeks,
    setHorizonWeeks,
    frequency,
    setFrequency,
    historyWeeksShown,
    setHistoryWeeksShown,
    selectedSeriesKey,
    setSelectedSeriesKey,
    displayedResult,
  };
}

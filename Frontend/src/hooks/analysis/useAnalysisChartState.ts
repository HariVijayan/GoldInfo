import { useCallback, useMemo, useState } from "react";
import { CHART_RANGE_OPTIONS, DEFAULT_CHART_RANGE_KEY } from "../../config/shared/chartRangeConfig";
import { DEFAULT_PRICE_SERIES_KEY } from "../../config/shared/priceSeriesConfig";
import type { ChartRangeKey } from "../../types/shared/chartTypes";
import type { PricePoint, PriceSeriesKey } from "../../types/shared/priceSeriesTypes";
import { isRangeCoveredByData } from "../../utils/shared/chartRange";

/** Which price series and time range the analysis charts show. */
export function useAnalysisChartState(pricePoints: PricePoint[]) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<PriceSeriesKey>(DEFAULT_PRICE_SERIES_KEY);
  const [selectedRangeKey, setSelectedRangeKey] = useState<ChartRangeKey>(DEFAULT_CHART_RANGE_KEY);

  /** A new period may cover fewer ranges, so a new run starts from everything fetched. */
  const resetRange = useCallback(() => setSelectedRangeKey(DEFAULT_CHART_RANGE_KEY), []);

  const coveredRangeKeys = useMemo(() => {
    if (pricePoints.length === 0) return new Set<ChartRangeKey>([DEFAULT_CHART_RANGE_KEY]);

    const firstDate = pricePoints[0].date;
    const lastDate = pricePoints[pricePoints.length - 1].date;
    return new Set<ChartRangeKey>(
      CHART_RANGE_OPTIONS.filter((rangeOption) =>
        isRangeCoveredByData(firstDate, lastDate, rangeOption)
      ).map((rangeOption) => rangeOption.key)
    );
  }, [pricePoints]);

  return {
    selectedSeriesKey,
    setSelectedSeriesKey,
    selectedRangeKey,
    setSelectedRangeKey,
    resetRange,
    coveredRangeKeys,
  };
}

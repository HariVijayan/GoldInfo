import { PRICE_SERIES_OPTIONS } from "../../../config/shared/priceSeriesConfig";
import type { EndOfHorizonSummary, ForecastSeriesKey } from "../../../types/forecast/forecastTypes";
import { ForecastSummaryCard } from "../ForecastSummaryCard";

type ForecastSeriesCardsProps = {
  endOfHorizon: Record<ForecastSeriesKey, EndOfHorizonSummary>;
  selectedSeriesKey: ForecastSeriesKey;
  onSelectSeries: (seriesKey: ForecastSeriesKey) => void;
};

/** One card per price. Choosing a card picks which price the charts show. */
export function ForecastSeriesCards({ endOfHorizon, selectedSeriesKey, onSelectSeries }: ForecastSeriesCardsProps) {
  return (
    <section className="forecast-cards span-both" role="radiogroup" aria-label="Choose a price to chart">
      {PRICE_SERIES_OPTIONS.map((option) => (
        <ForecastSummaryCard
          key={option.key}
          seriesOption={option}
          summary={endOfHorizon[option.key]}
          isSelected={selectedSeriesKey === option.key}
          onSelect={() => onSelectSeries(option.key)}
        />
      ))}
    </section>
  );
}

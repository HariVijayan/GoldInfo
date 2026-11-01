import { GOLD_LABEL, INR_LABEL } from "../../config/displayLabels";
import { getPriceSeriesOption } from "../../config/priceSeriesConfig";
import type { AnalysisMetrics } from "../../types/analysisTypes";
import { formatDate, formatRupees } from "../../utils/formatters";
import { RangeGauge } from "./RangeGauge";

type AnalysisHeroProps = {
  metrics: AnalysisMetrics;
  selectedPeriodLabel: string;
};

export function AnalysisHero({ metrics, selectedPeriodLabel }: AnalysisHeroProps) {
  const unitDescription = getPriceSeriesOption("gold_inr_per_gram").unitDescription;

  return (
    <section className="panel hero-panel" aria-label="Latest price">
      <p className="hero-label">
        Latest {GOLD_LABEL} price in {INR_LABEL}, {formatDate(metrics.latest_observation_date)}
      </p>
      <p className="hero-price">
        {formatRupees(metrics.latest_price)} <span className="hero-unit">{unitDescription}</span>
      </p>
      <p className="hero-coverage">
        {selectedPeriodLabel} selected. Data covers {formatDate(metrics.period_start)} to{" "}
        {formatDate(metrics.period_end)} across {metrics.observation_count.toLocaleString("en-IN")}{" "}
        observations.
      </p>

      <RangeGauge
        formatValue={formatRupees}
        historicalLow={metrics.historical_low}
        historicalLowDate={metrics.historical_low_date}
        historicalHigh={metrics.historical_high}
        historicalHighDate={metrics.historical_high_date}
        rangePositionPercent={metrics.range_position_pct}
      />
    </section>
  );
}

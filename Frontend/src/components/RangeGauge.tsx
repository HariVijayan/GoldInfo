import { clampPercent, formatDate, formatPercent, formatPrice } from "../utils/formatters";

type RangeGaugeProps = {
  unit: string;
  historicalLow: number;
  historicalLowDate: string;
  historicalHigh: number;
  historicalHighDate: string;
  rangePositionPercent: number | null;
};

export function RangeGauge({
  unit,
  historicalLow,
  historicalLowDate,
  historicalHigh,
  historicalHighDate,
  rangePositionPercent,
}: RangeGaugeProps) {
  const markerPercent = clampPercent(rangePositionPercent);

  return (
    <div className="range-gauge">
      <p className="range-gauge-summary">
        Trading at <strong>{formatPercent(rangePositionPercent).replace("+", "")}</strong> of the
        way up its range for this period.
      </p>

      <div
        className="range-track"
        role="meter"
        aria-label="Position within historical range"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(markerPercent)}
      >
        <div className="range-fill" style={{ width: `${markerPercent}%` }} />
        <div className="range-marker" style={{ left: `${markerPercent}%` }} />
      </div>

      <div className="range-ends">
        <div>
          <span className="range-end-label">Low</span>
          <span className="range-end-price">
            {formatPrice(historicalLow)} {unit}
          </span>
          <small>{formatDate(historicalLowDate)}</small>
        </div>
        <div className="range-end-right">
          <span className="range-end-label">High</span>
          <span className="range-end-price">
            {formatPrice(historicalHigh)} {unit}
          </span>
          <small>{formatDate(historicalHighDate)}</small>
        </div>
      </div>
    </div>
  );
}

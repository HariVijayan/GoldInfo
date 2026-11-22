import type { ChartTooltipEntry, ToneBarDatum } from "../../../types/shared/chartTypes";

type BarValueTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipEntry>;
  seriesName: string;
  formatValue: (value: number) => string;
};

/** Tooltip for bar charts: the bar's label, value, and optional detail line. */
export function BarValueTooltip({ active, payload, seriesName, formatValue }: BarValueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const bar = payload[0].payload as ToneBarDatum;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{bar.label}</p>
      <p>
        {seriesName}: <strong>{formatValue(bar.value)}</strong>
      </p>
      {bar.detail && <small>{bar.detail}</small>}
    </div>
  );
}

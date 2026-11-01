import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PRICE_SERIES_OPTIONS } from "../../config/priceSeriesConfig";
import type { PricePoint } from "../../types/priceSeriesTypes";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateNiceAxis } from "../../utils/forecastChartData";
import { formatPercent } from "../../utils/formatters";
import { ChartLegend } from "./ChartLegend";
import { LineValueTooltip } from "./ChartTooltip";

type IndexedComparisonChartProps = {
  /** All three series rebased so the first point is 100. */
  points: PricePoint[];
  /** Optional vertical marker, such as where actual data ends. */
  markerDate?: string;
  markerLabel?: string;
  ariaLabel: string;
  height?: number;
};

export function IndexedComparisonChart({
  points,
  markerDate,
  markerLabel,
  ariaLabel,
  height = 280,
}: IndexedComparisonChartProps) {
  const yAxis = useMemo(
    () =>
      calculateNiceAxis(
        points.flatMap((point) => PRICE_SERIES_OPTIONS.map((option) => point[option.key]))
      ),
    [points]
  );

  const formatDateTick = useMemo(
    () =>
      createDateTickFormatter(
        points.length > 1 ? calculateSpanInDays(points[0].date, points[points.length - 1].date) : 0
      ),
    [points]
  );

  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            minTickGap={56}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <YAxis
            domain={yAxis.domain}
            ticks={yAxis.ticks}
            allowDataOverflow
            width={48}
            tickFormatter={(tickValue: number) => tickValue.toFixed(0)}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            content={
              <LineValueTooltip
                formatLabel={formatLongDate}
                formatValue={(value) => `${value.toFixed(1)} (${formatPercent(value - 100)})`}
              />
            }
          />
          <ReferenceLine y={100} stroke="var(--color-ink-muted)" strokeDasharray="2 4" />
          {markerDate && (
            <ReferenceLine
              x={markerDate}
              stroke="var(--color-ink-muted)"
              strokeDasharray="2 4"
              label={{
                value: markerLabel,
                position: "insideTopLeft",
                fill: "var(--color-ink-muted)",
                fontSize: 11,
              }}
            />
          )}
          {PRICE_SERIES_OPTIONS.map((seriesOption) => (
            <Line
              key={seriesOption.key}
              dataKey={seriesOption.key}
              name={seriesOption.shortLabel}
              stroke={seriesOption.colorVariable}
              strokeWidth={seriesOption.key === "gold_inr_per_gram" ? 2.25 : 1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <ChartLegend
        items={PRICE_SERIES_OPTIONS.map((seriesOption) => ({
          label: seriesOption.shortLabel,
          colorVariable: seriesOption.colorVariable,
          variant: "line",
        }))}
      />
    </div>
  );
}

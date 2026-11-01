import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "../../types/priceSeriesTypes";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateNiceAxis } from "../../utils/forecastChartData";
import { LineValueTooltip } from "./ChartTooltip";

type AreaTrendChartProps = {
  points: SeriesPoint[];
  seriesName: string;
  colorVariable: string;
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  /** The value the area is filled towards, such as 0 for a drawdown. */
  baselineValue: number;
  ariaLabel: string;
  height?: number;
};

export function AreaTrendChart({
  points,
  seriesName,
  colorVariable,
  formatValue,
  formatAxisValue,
  baselineValue,
  ariaLabel,
  height = 200,
}: AreaTrendChartProps) {
  // The baseline is always inside the axis, so the fill sits on a round tick.
  const yAxis = useMemo(
    () => calculateNiceAxis([...points.map((point) => point.value), baselineValue], 4),
    [points, baselineValue]
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
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            width={56}
            tickFormatter={formatAxisValue}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            content={
              <LineValueTooltip
                formatLabel={formatLongDate}
                formatValue={(value) => formatValue(value)}
              />
            }
          />
          <ReferenceLine y={baselineValue} stroke="var(--color-ink-muted)" strokeDasharray="2 4" />
          <Area
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={colorVariable}
            strokeWidth={1.75}
            fill={colorVariable}
            fillOpacity={0.16}
            baseValue={baselineValue}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

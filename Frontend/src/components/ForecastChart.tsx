import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../types/forecastTypes";
import {
  calculateYAxisDomain,
  formatChartDate,
  formatLongDate,
} from "../utils/forecastChartData";
import { formatPrice } from "../utils/formatters";

type ForecastChartProps = {
  chartPoints: ChartPoint[];
  lastHistoryDate: string;
  unitLabel: string;
  intervalPercent: number;
};

type ForecastTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ChartPoint }>;
  unitLabel: string;
  intervalPercent: number;
};

function ForecastTooltip({ active, payload, unitLabel, intervalPercent }: ForecastTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const chartPoint = payload[0].payload;
  const isForecastPoint =
    chartPoint.forecastValue !== undefined && chartPoint.historyValue === undefined;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{formatLongDate(chartPoint.date)}</p>
      {isForecastPoint ? (
        <>
          <p>
            Forecast: <strong>{formatPrice(chartPoint.forecastValue)}</strong> {unitLabel}
          </p>
          {chartPoint.band && (
            <small>
              {intervalPercent}% range: {formatPrice(chartPoint.band[0])} to{" "}
              {formatPrice(chartPoint.band[1])}
            </small>
          )}
        </>
      ) : (
        <p>
          Actual: <strong>{formatPrice(chartPoint.historyValue)}</strong> {unitLabel}
        </p>
      )}
    </div>
  );
}

export function ForecastChart({
  chartPoints,
  lastHistoryDate,
  unitLabel,
  intervalPercent,
}: ForecastChartProps) {
  const yAxisDomain = useMemo(() => calculateYAxisDomain(chartPoints), [chartPoints]);
  const axisFractionDigits = yAxisDomain[1] - yAxisDomain[0] < 20 ? 1 : 0;

  return (
    <div
      className="chart-frame"
      role="img"
      aria-label={`Line chart of ${unitLabel} actual prices and forecast with an ${intervalPercent} percent range`}
    >
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartPoints} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            minTickGap={56}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            domain={yAxisDomain}
            allowDataOverflow
            width={68}
            tickFormatter={(tickValue: number) =>
              tickValue.toLocaleString("en-IN", { maximumFractionDigits: axisFractionDigits })
            }
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            content={<ForecastTooltip unitLabel={unitLabel} intervalPercent={intervalPercent} />}
          />
          <Area
            dataKey="band"
            stroke="none"
            fill="var(--color-gold)"
            fillOpacity={0.2}
            isAnimationActive={false}
            activeDot={false}
          />
          <ReferenceLine
            x={lastHistoryDate}
            stroke="var(--color-ink-muted)"
            strokeDasharray="2 4"
            label={{ value: "Latest data", position: "insideTopLeft", fill: "var(--color-ink-muted)", fontSize: 12 }}
          />
          <Line
            dataKey="historyValue"
            stroke="var(--color-ink)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="forecastValue"
            stroke="var(--color-gold)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <ul className="chart-legend" aria-hidden="true">
        <li><span className="legend-swatch legend-actual" /> Actual</li>
        <li><span className="legend-swatch legend-forecast" /> Forecast</li>
        <li><span className="legend-swatch legend-band" /> {intervalPercent}% range</li>
      </ul>
    </div>
  );
}

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
import type { PriceSeriesOption } from "../../config/priceSeriesConfig";
import type { ChartPoint } from "../../types/forecastTypes";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateForecastChartAxis } from "../../utils/forecastChartData";
import { createAxisTickFormatter, formatSeriesValue } from "../../utils/formatters";
import { ChartLegend } from "../common/ChartLegend";

type ForecastChartProps = {
  chartPoints: ChartPoint[];
  lastHistoryDate: string;
  seriesOption: PriceSeriesOption;
  intervalPercent: number;
};

type ForecastTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ChartPoint }>;
  seriesOption: PriceSeriesOption;
  intervalPercent: number;
};

function ForecastTooltip({ active, payload, seriesOption, intervalPercent }: ForecastTooltipProps) {
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
            Forecast: <strong>{formatSeriesValue(seriesOption, chartPoint.forecastValue)}</strong>{" "}
            {seriesOption.unitDescription}
          </p>
          {chartPoint.band && (
            <small>
              {intervalPercent}% range: {formatSeriesValue(seriesOption, chartPoint.band[0])} to{" "}
              {formatSeriesValue(seriesOption, chartPoint.band[1])}
            </small>
          )}
        </>
      ) : (
        <p>
          Actual: <strong>{formatSeriesValue(seriesOption, chartPoint.historyValue)}</strong>{" "}
          {seriesOption.unitDescription}
        </p>
      )}
    </div>
  );
}

export function ForecastChart({
  chartPoints,
  lastHistoryDate,
  seriesOption,
  intervalPercent,
}: ForecastChartProps) {
  const yAxis = useMemo(() => calculateForecastChartAxis(chartPoints), [chartPoints]);
  const formatAxisTick = useMemo(
    () => createAxisTickFormatter(yAxis.tickStep, seriesOption.valuePrefix),
    [yAxis.tickStep, seriesOption.valuePrefix]
  );
  const formatDateTick = useMemo(
    () =>
      createDateTickFormatter(
        chartPoints.length > 1
          ? calculateSpanInDays(chartPoints[0].date, chartPoints[chartPoints.length - 1].date)
          : 0
      ),
    [chartPoints]
  );

  return (
    <div
      className="chart-frame"
      role="img"
      aria-label={`Line chart of ${seriesOption.label}: actual prices and forecast with an ${intervalPercent} percent range`}
    >
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartPoints} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            minTickGap={56}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            domain={yAxis.domain}
            ticks={yAxis.ticks}
            allowDataOverflow
            width={68}
            tickFormatter={formatAxisTick}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            content={<ForecastTooltip seriesOption={seriesOption} intervalPercent={intervalPercent} />}
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

      <ChartLegend
        items={[
          { label: "Actual", colorVariable: "var(--color-ink)", variant: "line" },
          { label: "Forecast", colorVariable: "var(--color-gold)", variant: "dashed" },
          { label: `${intervalPercent}% range`, colorVariable: "var(--color-gold)", variant: "band" },
        ]}
      />
    </div>
  );
}

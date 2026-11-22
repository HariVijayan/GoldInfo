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
import type { PriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import type { PriceChartPoint } from "../../../types/shared/chartTypes";
import {
  LONG_AVERAGE_NAME,
  PRICE_NAME,
  SHORT_AVERAGE_NAME,
  buildPriceLegendItems,
  chooseExtremeLabelSides,
} from "../../../utils/analysis/priceChartLayout";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../../utils/shared/chartDates";
import { calculateNiceAxis } from "../../../utils/forecast/forecastChartData";
import { createAxisTickFormatter, formatSeriesValue } from "../../../utils/shared/formatters";
import { ChartLegend } from "../../common/ChartLegend";
import { LineValueTooltip } from "../../common/LineValueTooltip";

type PriceHistoryChartProps = {
  chartPoints: PriceChartPoint[];
  seriesOption: PriceSeriesOption;
  windowHigh: number;
  windowLow: number;
  showShortAverage: boolean;
  showLongAverage: boolean;
};

export function PriceHistoryChart({
  chartPoints,
  seriesOption,
  windowHigh,
  windowLow,
  showShortAverage,
  showLongAverage,
}: PriceHistoryChartProps) {
  const yAxis = useMemo(
    () =>
      calculateNiceAxis(
        chartPoints.flatMap((chartPoint) => [
          chartPoint.price,
          ...(showShortAverage && chartPoint.shortAverage !== undefined
            ? [chartPoint.shortAverage]
            : []),
          ...(showLongAverage && chartPoint.longAverage !== undefined
            ? [chartPoint.longAverage]
            : []),
        ])
      ),
    [chartPoints, showShortAverage, showLongAverage]
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

  const formatAxisTick = useMemo(
    () => createAxisTickFormatter(yAxis.tickStep, seriesOption.valuePrefix),
    [yAxis.tickStep, seriesOption.valuePrefix]
  );

  const labelSides = useMemo(() => chooseExtremeLabelSides(chartPoints), [chartPoints]);
  const legendItems = buildPriceLegendItems(seriesOption, showShortAverage, showLongAverage);

  const referenceLabelStyle = { fill: "var(--color-ink-muted)", fontSize: 11 };

  return (
    <div
      className="chart-frame"
      role="img"
      aria-label={`Line chart of ${seriesOption.label}, from a high of ${formatSeriesValue(
        seriesOption,
        windowHigh
      )} to a low of ${formatSeriesValue(seriesOption, windowLow)}`}
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
            content={
              <LineValueTooltip
                formatLabel={formatLongDate}
                formatValue={(value) => formatSeriesValue(seriesOption, value)}
              />
            }
          />
          <ReferenceLine
            y={windowHigh}
            stroke="var(--color-positive)"
            strokeDasharray="2 4"
            strokeOpacity={0.7}
            label={{
              value: `High ${formatSeriesValue(seriesOption, windowHigh)}`,
              position: `insideTop${labelSides.high}`,
              ...referenceLabelStyle,
            }}
          />
          <ReferenceLine
            y={windowLow}
            stroke="var(--color-negative)"
            strokeDasharray="2 4"
            strokeOpacity={0.7}
            label={{
              value: `Low ${formatSeriesValue(seriesOption, windowLow)}`,
              position: `insideBottom${labelSides.low}`,
              ...referenceLabelStyle,
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            name={PRICE_NAME}
            stroke={seriesOption.colorVariable}
            strokeWidth={2}
            fill={seriesOption.colorVariable}
            fillOpacity={0.14}
            dot={false}
            isAnimationActive={false}
          />
          {showShortAverage && (
            <Line
              dataKey="shortAverage"
              name={SHORT_AVERAGE_NAME}
              stroke="var(--color-ink)"
              strokeWidth={1.4}
              strokeDasharray="5 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {showLongAverage && (
            <Line
              dataKey="longAverage"
              name={LONG_AVERAGE_NAME}
              stroke="var(--color-ink-muted)"
              strokeWidth={1.4}
              strokeDasharray="2 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <ChartLegend items={legendItems} />
    </div>
  );
}

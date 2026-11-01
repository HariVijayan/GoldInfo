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
import {
  LONG_MOVING_AVERAGE_WINDOW,
  SHORT_MOVING_AVERAGE_WINDOW,
} from "../../config/analysisChartConfig";
import type { PriceSeriesOption } from "../../config/priceSeriesConfig";
import type { LegendItem, PriceChartPoint } from "../../types/chartTypes";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateNiceAxis } from "../../utils/forecastChartData";
import { createAxisTickFormatter, formatSeriesValue } from "../../utils/formatters";
import { ChartLegend } from "../common/ChartLegend";
import { LineValueTooltip } from "../common/ChartTooltip";

type PriceHistoryChartProps = {
  chartPoints: PriceChartPoint[];
  seriesOption: PriceSeriesOption;
  windowHigh: number;
  windowLow: number;
  showShortAverage: boolean;
  showLongAverage: boolean;
};

const PRICE_NAME = "Price";
const SHORT_AVERAGE_NAME = `${SHORT_MOVING_AVERAGE_WINDOW}-day average`;
const LONG_AVERAGE_NAME = `${LONG_MOVING_AVERAGE_WINDOW}-day average`;

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

  // Put each label on the side away from where the extreme happened, so the
  // price line never runs through the text. The extremes are located among
  // the points actually drawn, because thinning can drop the exact high or low.
  const labelSides = useMemo(() => {
    let highIndex = 0;
    let lowIndex = 0;
    chartPoints.forEach((chartPoint, pointIndex) => {
      if (chartPoint.price > chartPoints[highIndex].price) highIndex = pointIndex;
      if (chartPoint.price < chartPoints[lowIndex].price) lowIndex = pointIndex;
    });
    const middleIndex = (chartPoints.length - 1) / 2;
    return {
      high: highIndex > middleIndex ? "Left" : "Right",
      low: lowIndex > middleIndex ? "Left" : "Right",
    } as const;
  }, [chartPoints]);

  const legendItems: LegendItem[] = [
    { label: PRICE_NAME, colorVariable: seriesOption.colorVariable, variant: "line" },
    ...(showShortAverage
      ? [{ label: SHORT_AVERAGE_NAME, colorVariable: "var(--color-ink)", variant: "dashed" as const }]
      : []),
    ...(showLongAverage
      ? [{ label: LONG_AVERAGE_NAME, colorVariable: "var(--color-ink-muted)", variant: "dashed" as const }]
      : []),
  ];

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

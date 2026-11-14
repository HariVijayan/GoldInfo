import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateNiceAxis } from "../../utils/forecastChartData";
import { formatRupees } from "../../utils/formatters";
import type { CostComparisonPoint } from "../../utils/savingsMonthlyDashboardModel";
import { formatCompactRupees } from "../../utils/savingsFormatters";
import { ChartLegend } from "../common/ChartLegend";
import { LineValueTooltip } from "../common/ChartTooltip";

const MARKET_NAME = "Market price";
const AVERAGE_NAME = "Your average cost";

export function CostComparisonChart({ points }: { points: CostComparisonPoint[] }) {
  const yAxis = useMemo(
    () =>
      calculateNiceAxis(
        points.flatMap((point) =>
          point.averageCost === null ? [point.marketPrice] : [point.marketPrice, point.averageCost]
        )
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
    <div className="chart-frame" role="img" aria-label="Gold market price per gram and the average cost paid so far">
      <ResponsiveContainer width="100%" height={260}>
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
            width={64}
            tickFormatter={formatCompactRupees}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            content={<LineValueTooltip formatLabel={formatLongDate} formatValue={(value) => formatRupees(value)} />}
          />
          <Line dataKey="marketPrice" name={MARKET_NAME} stroke="var(--color-gold)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
          <Line
            dataKey="averageCost"
            name={AVERAGE_NAME}
            stroke="var(--color-series-usd)"
            strokeWidth={2.25}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: MARKET_NAME, colorVariable: "var(--color-gold)", variant: "line" },
          { label: AVERAGE_NAME, colorVariable: "var(--color-series-usd)", variant: "line" },
        ]}
      />
    </div>
  );
}

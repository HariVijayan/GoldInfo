import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GOLD_LABEL } from "../../config/displayLabels";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateNiceAxis } from "../../utils/forecastChartData";
import { formatRupees } from "../../utils/formatters";
import type { MonthlyGrowthPoint } from "../../utils/savingsMonthlyDashboardModel";
import { formatCompactRupees } from "../../utils/savingsFormatters";
import { ChartLegend } from "../common/ChartLegend";
import { LineValueTooltip } from "../common/ChartTooltip";

const INVESTED_NAME = "Paid in";
const RD_NAME = "RD";

export function MonthlyGrowthChart({ points }: { points: MonthlyGrowthPoint[] }) {
  const yAxis = useMemo(
    () =>
      calculateNiceAxis(
        points.flatMap((point) => [point.investedInr, point.rdValue, point.goldValue])
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
    <div className="chart-frame" role="img" aria-label="Money paid in, and the value of the gold and the RD, over time">
      <ResponsiveContainer width="100%" height={300}>
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
          <Line
            dataKey="investedInr"
            name={INVESTED_NAME}
            stroke="var(--color-ink-muted)"
            strokeDasharray="5 4"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
          <Line dataKey="rdValue" name={RD_NAME} stroke="var(--color-series-usd)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="goldValue" name={GOLD_LABEL} stroke="var(--color-gold)" strokeWidth={2.25} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: INVESTED_NAME, colorVariable: "var(--color-ink-muted)", variant: "line" },
          { label: RD_NAME, colorVariable: "var(--color-series-usd)", variant: "line" },
          { label: GOLD_LABEL, colorVariable: "var(--color-gold)", variant: "line" },
        ]}
      />
    </div>
  );
}

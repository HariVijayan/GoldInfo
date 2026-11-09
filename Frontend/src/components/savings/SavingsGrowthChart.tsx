import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GOLD_LABEL } from "../../config/displayLabels";
import { calculateSpanInDays, createDateTickFormatter, formatLongDate } from "../../utils/chartDates";
import { calculateNiceAxis } from "../../utils/forecastChartData";
import { formatRupees } from "../../utils/formatters";
import type { GrowthChartPoint } from "../../utils/savingsDashboardModel";
import { formatCompactRupees } from "../../utils/savingsFormatters";
import { ChartLegend } from "../common/ChartLegend";
import { LineValueTooltip } from "../common/ChartTooltip";

const GOLD_SERIES_NAME = GOLD_LABEL;
const SAVINGS_SERIES_NAME = "INR savings";

export function SavingsGrowthChart({ points }: { points: GrowthChartPoint[] }) {
  const [useLogScale, setUseLogScale] = useState(false);

  const yAxis = useMemo(
    () => calculateNiceAxis(points.flatMap((point) => [point.goldValue, point.savingsValue])),
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
    <div className="chart-frame" role="img" aria-label="Value of the gold and of the INR savings over time">
      <label className="toggle-option chart-inline-toggle">
        <input
          type="checkbox"
          checked={useLogScale}
          onChange={(changeEvent) => setUseLogScale(changeEvent.target.checked)}
        />
        Log scale (equal slopes mean equal growth rates)
      </label>
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
          {useLogScale ? (
            <YAxis
              scale="log"
              domain={["auto", "auto"]}
              width={64}
              tickFormatter={formatCompactRupees}
              tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
              stroke="var(--color-border)"
            />
          ) : (
            <YAxis
              domain={yAxis.domain}
              ticks={yAxis.ticks}
              allowDataOverflow
              width={64}
              tickFormatter={formatCompactRupees}
              tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
              stroke="var(--color-border)"
            />
          )}
          <Tooltip
            content={<LineValueTooltip formatLabel={formatLongDate} formatValue={(value) => formatRupees(value)} />}
          />
          <Line
            dataKey="goldValue"
            name={GOLD_SERIES_NAME}
            stroke="var(--color-gold)"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="savingsValue"
            name={SAVINGS_SERIES_NAME}
            stroke="var(--color-series-usd)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: GOLD_SERIES_NAME, colorVariable: "var(--color-gold)", variant: "line" },
          { label: SAVINGS_SERIES_NAME, colorVariable: "var(--color-series-usd)", variant: "line" },
        ]}
      />
    </div>
  );
}

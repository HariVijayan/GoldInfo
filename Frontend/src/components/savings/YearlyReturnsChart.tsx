import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GOLD_LABEL } from "../../config/displayLabels";
import type { YearlyBarDatum } from "../../utils/savingsDashboardModel";
import { formatSignedPercent } from "../../utils/savingsFormatters";
import { ChartLegend } from "../common/ChartLegend";
import { LineValueTooltip } from "../common/ChartTooltip";

const GOLD_SERIES_NAME = GOLD_LABEL;
const SAVINGS_SERIES_NAME = "INR savings";

export function YearlyReturnsChart({ bars }: { bars: YearlyBarDatum[] }) {
  return (
    <div className="chart-frame" role="img" aria-label="Yearly change of the gold and of the INR savings">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={bars} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={8}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <YAxis
            width={52}
            tickFormatter={(tickValue: number) => `${tickValue.toFixed(0)}%`}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            cursor={{ fill: "var(--color-border)", fillOpacity: 0.35 }}
            content={
              <LineValueTooltip
                formatLabel={(label) => `Year ${label}`}
                formatValue={(value) => formatSignedPercent(value)}
              />
            }
          />
          <ReferenceLine y={0} stroke="var(--color-ink-muted)" />
          <Bar
            dataKey="goldChangePct"
            name={GOLD_SERIES_NAME}
            fill="var(--color-gold)"
            maxBarSize={18}
            isAnimationActive={false}
          />
          <Bar
            dataKey="savingsChangePct"
            name={SAVINGS_SERIES_NAME}
            fill="var(--color-series-usd)"
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
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

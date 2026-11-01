import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TONE_COLOR_VARIABLES } from "../../config/toneColors";
import type { ToneBarDatum } from "../../types/chartTypes";
import { BarValueTooltip } from "./ChartTooltip";

type ToneBarChartProps = {
  bars: ToneBarDatum[];
  seriesName: string;
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  ariaLabel: string;
  height?: number;
  /** Draws a line at zero; leave off for charts that count things. */
  showZeroLine?: boolean;
};

/** Bar chart whose bars take their colour from their tone: up, down, or flat. */
export function ToneBarChart({
  bars,
  seriesName,
  formatValue,
  formatAxisValue,
  ariaLabel,
  height = 220,
  showZeroLine = true,
}: ToneBarChartProps) {
  return (
    <div className="chart-frame" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={bars} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={10}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <YAxis
            width={52}
            tickFormatter={formatAxisValue}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            cursor={{ fill: "var(--color-border)", fillOpacity: 0.35 }}
            content={<BarValueTooltip seriesName={seriesName} formatValue={formatValue} />}
          />
          {showZeroLine && <ReferenceLine y={0} stroke="var(--color-ink-muted)" />}
          <Bar dataKey="value" maxBarSize={38} radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {bars.map((bar, barIndex) => (
              <Cell key={`${bar.label}-${barIndex}`} fill={TONE_COLOR_VARIABLES[bar.tone]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

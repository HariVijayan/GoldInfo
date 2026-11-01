import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { ShareSlice } from "../../types/chartTypes";
import { formatShare } from "../../utils/formatters";

type ShareDonutChartProps = {
  slices: ShareSlice[];
  centerValue: string;
  centerCaption: string;
  ariaLabel: string;
};

/** A donut with its own legend, so exact counts never depend on hovering. */
export function ShareDonutChart({
  slices,
  centerValue,
  centerCaption,
  ariaLabel,
}: ShareDonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="donut-layout" role="img" aria-label={ariaLabel}>
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="66%"
              outerRadius="96%"
              paddingAngle={slices.filter((slice) => slice.value > 0).length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.colorVariable} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-hidden="true">
          <strong>{centerValue}</strong>
          <span>{centerCaption}</span>
        </div>
      </div>

      <ul className="donut-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <span className="donut-legend-swatch" style={{ backgroundColor: slice.colorVariable }} />
            <span className="donut-legend-label">{slice.label}</span>
            <span className="donut-legend-value">
              {slice.value.toLocaleString("en-IN")}
              <small>{total > 0 ? ` (${formatShare((slice.value / total) * 100, 0)})` : ""}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

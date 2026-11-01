import type { CSSProperties } from "react";
import type { LegendItem } from "../../types/chartTypes";

/** Decorative: the same information is in the chart's accessible label. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="chart-legend" aria-hidden="true">
      {items.map((item) => (
        <li key={item.label}>
          <span
            className={`legend-swatch legend-${item.variant}`}
            style={{ "--swatch-color": item.colorVariable } as CSSProperties}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

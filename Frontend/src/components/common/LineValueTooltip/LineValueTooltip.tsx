import type { ChartTooltipEntry } from "../../../types/shared/chartTypes";

type LineValueTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipEntry>;
  label?: string | number;
  formatLabel: (label: string) => string;
  formatValue: (value: number, entryName: string) => string;
};

/** Tooltip for charts with a dated x axis: lists every series at that date. */
export function LineValueTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: LineValueTooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;

  const visibleEntries = payload.filter(
    (entry) => typeof entry.value === "number" && Number.isFinite(entry.value)
  );
  if (visibleEntries.length === 0) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{formatLabel(String(label))}</p>
      {visibleEntries.map((entry) => {
        const entryName = String(entry.name ?? "");
        return (
          <p key={entryName} className="chart-tooltip-row">
            <span
              className="chart-tooltip-swatch"
              style={{ backgroundColor: entry.stroke ?? entry.color }}
              aria-hidden="true"
            />
            <span className="chart-tooltip-name">{entryName}</span>
            <strong>{formatValue(entry.value as number, entryName)}</strong>
          </p>
        );
      })}
    </div>
  );
}

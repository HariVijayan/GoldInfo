import type { ChangeTone } from "../types/analysisTypes";

type MetricCardProps = {
  metricTitle: string;
  metricValue: string;
  metricCaption?: string;
  changeTone?: ChangeTone;
};

export function MetricCard({
  metricTitle,
  metricValue,
  metricCaption,
  changeTone = "neutral",
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <h3>{metricTitle}</h3>
      <p className={`metric-value tone-${changeTone}`}>{metricValue}</p>
      {metricCaption && <small>{metricCaption}</small>}
    </article>
  );
}

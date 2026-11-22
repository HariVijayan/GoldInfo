import type { ReactNode } from "react";

type ChartPanelSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** One chart inside a panel that groups several related charts. */
export function ChartPanelSection({ title, subtitle, children }: ChartPanelSectionProps) {
  return (
    <div className="chart-panel-section">
      <div className="chart-panel-titles">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

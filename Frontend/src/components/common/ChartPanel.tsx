import type { ReactNode } from "react";

type ChartPanelProps = {
  title: string;
  subtitle?: string;
  /** Rendered on the right of the heading, for example a filter. */
  controls?: ReactNode;
  children: ReactNode;
};

/** Shared frame so every chart has the same heading, spacing, and padding. */
export function ChartPanel({ title, subtitle, controls, children }: ChartPanelProps) {
  return (
    <section className="panel chart-panel" aria-label={title}>
      <header className="chart-panel-header">
        <div className="chart-panel-titles">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {controls}
      </header>
      {children}
    </section>
  );
}

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

/** Shown in place of a chart when the data cannot support it. */
export function ChartEmptyMessage({ message }: { message: string }) {
  return (
    <p className="chart-empty" role="status">
      {message}
    </p>
  );
}

import type { ReactNode } from "react";

type ChartPanelProps = {
  title: string;
  subtitle?: string;
  /** Rendered on the right of the heading, for example a filter. */
  controls?: ReactNode;
  /**
   * "full" spans both dashboard columns (every chart). "single" stays in one
   * column, for statistics and other text-heavy panels.
   */
  span?: "full" | "single";
  children: ReactNode;
};

/** Shared frame so every chart has the same heading, spacing, and padding. */
export function ChartPanel({ title, subtitle, controls, span = "full", children }: ChartPanelProps) {
  const className = span === "full" ? "panel chart-panel span-both" : "panel chart-panel";

  return (
    <section className={className} aria-label={title}>
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

import type { ReactNode } from "react";

/**
 * The result area of every tab: a two-column grid on wide screens that
 * becomes one column on narrow ones (breakpoint in styles/dashboard.css).
 * Direct children decide how wide they are:
 *   - charts, the AI overview and tables span both columns;
 *   - statistics and other text-heavy panels take one column and sit side
 *     by side.
 */
export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="dashboard-grid">{children}</div>;
}

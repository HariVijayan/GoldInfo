import type { ReactNode } from "react";

type DashboardLayoutProps = {
  primaryColumn: ReactNode;
  secondaryColumn: ReactNode;
};

/**
 * The two-column dashboard used by both tabs. The columns sit side by side
 * on wide screens and stack, primary first, on narrow ones. The breakpoint
 * lives in one place: the .dashboard-grid rules in App.css.
 */
export function DashboardLayout({ primaryColumn, secondaryColumn }: DashboardLayoutProps) {
  return (
    <div className="dashboard-grid">
      <div className="dashboard-column">{primaryColumn}</div>
      <div className="dashboard-column">{secondaryColumn}</div>
    </div>
  );
}

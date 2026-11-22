import type { ReactNode } from "react";

type DashboardSectionProps = {
  /** "full" spans both columns, "single" takes one. */
  span: "full" | "single";
  children: ReactNode;
};

/** Sets how many columns of the DashboardGrid its content takes. */
export function DashboardSection({ span, children }: DashboardSectionProps) {
  return <div className={span === "full" ? "dashboard-section span-both" : "dashboard-section"}>{children}</div>;
}

import type { ReactNode } from "react";

type CollapsiblePanelProps = {
  /** Stable prefix used to link the toggle button to its content. */
  panelId: string;
  title: string;
  /** Short text shown on the right of the header, useful while collapsed. */
  summary?: string;
  statusBadge?: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * A panel whose body can be folded away. The parent owns the expanded state
 * so it can also collapse or open the panel when something happens, for
 * example when a run finishes. Collapsed content is not rendered at all.
 */
export function CollapsiblePanel({
  panelId,
  title,
  summary,
  statusBadge,
  isExpanded,
  onToggle,
  children,
}: CollapsiblePanelProps) {
  const headingId = `${panelId}-heading`;
  const bodyId = `${panelId}-body`;

  return (
    <section
      className={isExpanded ? "panel collapsible-panel is-expanded" : "panel collapsible-panel"}
      aria-labelledby={headingId}
    >
      <h2 className="collapsible-heading" id={headingId}>
        <button
          type="button"
          className="collapsible-toggle"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? bodyId : undefined}
          onClick={onToggle}
        >
          <span className="collapsible-chevron" aria-hidden="true" />
          <span className="collapsible-title">{title}</span>
          {statusBadge}
          {summary && <span className="collapsible-summary">{summary}</span>}
        </button>
      </h2>

      {isExpanded && (
        <div className="collapsible-body" id={bodyId}>
          {children}
        </div>
      )}
    </section>
  );
}

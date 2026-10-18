import type { AgentEvent } from "../types/analysisTypes";

type ProgressTimelineProps = {
  agentEvents: AgentEvent[];
  isRunning: boolean;
};

export function ProgressTimeline({ agentEvents, isRunning }: ProgressTimelineProps) {
  if (agentEvents.length === 0) {
    return null;
  }

  return (
    <section className="panel" aria-label="Agent progress">
      <div className="section-heading">
        <h2>Agent progress</h2>
        {isRunning && <span className="badge badge-running">Working</span>}
      </div>

      <ol className="timeline" aria-live="polite">
        {agentEvents.map((agentEvent, eventIndex) => {
          const isLatestEvent = eventIndex === agentEvents.length - 1;
          return (
            <li
              key={`${agentEvent.timestamp ?? "event"}-${eventIndex}`}
              className={isRunning && isLatestEvent ? "timeline-item is-active" : "timeline-item"}
            >
              <span className="timeline-type">{agentEvent.type}</span>
              <span className="timeline-message">{agentEvent.message}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

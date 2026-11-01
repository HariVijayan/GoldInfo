import { useState } from "react";
import type { AgentEvent, AnalysisState } from "../../types/analysisTypes";
import { CollapsiblePanel } from "../common/CollapsiblePanel";

type ProgressTimelineProps = {
  agentEvents: AgentEvent[];
  analysisState: AnalysisState;
};

/** Open while the agent works, and open after a failure so the cause is visible. */
function shouldBeExpandedFor(analysisState: AnalysisState): boolean {
  return analysisState === "running" || analysisState === "error";
}

function calculateRunSeconds(agentEvents: AgentEvent[]): number | null {
  const firstTimestamp = agentEvents[0]?.timestamp;
  const lastTimestamp = agentEvents[agentEvents.length - 1]?.timestamp;
  if (!firstTimestamp || !lastTimestamp) return null;

  const elapsedMilliseconds = new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime();
  return Number.isFinite(elapsedMilliseconds) && elapsedMilliseconds >= 0
    ? Math.round(elapsedMilliseconds / 1000)
    : null;
}

export function ProgressTimeline({ agentEvents, analysisState }: ProgressTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(shouldBeExpandedFor(analysisState));
  const [previousAnalysisState, setPreviousAnalysisState] = useState(analysisState);

  // Fold the log away when a run finishes, open it when a run starts or fails.
  // Adjusting state during render avoids a flash of the old layout.
  if (previousAnalysisState !== analysisState) {
    setPreviousAnalysisState(analysisState);
    setIsExpanded(shouldBeExpandedFor(analysisState));
  }

  if (agentEvents.length === 0) {
    return null;
  }

  const isRunning = analysisState === "running";
  const runSeconds = calculateRunSeconds(agentEvents);
  const stepCountLabel = `${agentEvents.length} ${agentEvents.length === 1 ? "step" : "steps"}`;
  const summary =
    isRunning || runSeconds === null ? stepCountLabel : `${stepCountLabel} in ${runSeconds}s`;

  return (
    <CollapsiblePanel
      panelId="agent-progress"
      title="Agent progress"
      summary={summary}
      statusBadge={
        isRunning ? (
          <span className="badge badge-running">Working</span>
        ) : analysisState === "error" ? (
          <span className="badge badge-error">Failed</span>
        ) : (
          <span className="badge badge-success">Complete</span>
        )
      }
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
    >
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
    </CollapsiblePanel>
  );
}

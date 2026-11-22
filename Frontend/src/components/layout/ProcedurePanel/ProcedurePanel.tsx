import { PROCEDURE_CONTENT } from "../../../config/procedure/procedureContent";
import { FEATURE_OPTIONS } from "../../../config/shared/featureConfig";
import type { FeatureId } from "../../../types/shared/featureTypes";
import { CollapsiblePanel } from "../../common/CollapsiblePanel";

type ProcedurePanelProps = {
  featureId: FeatureId;
  isExpanded: boolean;
  onToggle: () => void;
};

/** Static explanation of a tab: its purpose, what goes in, how it works, what comes out. */
export function ProcedurePanel({ featureId, isExpanded, onToggle }: ProcedurePanelProps) {
  const content = PROCEDURE_CONTENT[featureId];
  const featureLabel = FEATURE_OPTIONS.find((feature) => feature.id === featureId)?.label ?? featureId;

  return (
    <CollapsiblePanel
      panelId={`procedure-${featureId}`}
      title="Procedure"
      summary={featureLabel}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="procedure">
        <p className="procedure-purpose">{content.purpose}</p>

        <div className="procedure-columns">
          <section aria-label="What goes in">
            <h3>What goes in</h3>
            <ul>
              {content.goesIn.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section aria-label="How it works">
            <h3>How it works</h3>
            <ol>
              {content.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section aria-label="What comes out">
            <h3>What comes out</h3>
            <ul>
              {content.comesOut.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </CollapsiblePanel>
  );
}

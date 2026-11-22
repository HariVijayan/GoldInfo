import { PERIOD_OPTIONS } from "../../../config/analysis/analysisConfig";
import { ChoiceGroup } from "../../common/ChoiceGroup";

type AnalysisControlsProps = {
  selectedPeriod: string;
  onSelectPeriod: (periodValue: string) => void;
  isRunning: boolean;
  canAnalyze: boolean;
  onAnalyze: () => void;
};

/** The history period and the button that starts the analysis. */
export function AnalysisControls({ selectedPeriod, onSelectPeriod, isRunning, canAnalyze, onAnalyze }: AnalysisControlsProps) {
  return (
    <section className="panel controls" aria-label="Analysis settings">
      <div className="control-groups">
        <ChoiceGroup
          label="History period"
          options={PERIOD_OPTIONS}
          value={selectedPeriod}
          onChange={onSelectPeriod}
          disabled={isRunning}
        />
      </div>

      <button type="button" className="primary-button" onClick={onAnalyze} disabled={!canAnalyze}>
        {isRunning ? "Analyzing…" : "Analyze"}
      </button>
    </section>
  );
}

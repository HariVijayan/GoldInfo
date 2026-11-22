import { FORECAST_FREQUENCY_OPTIONS, FORECAST_HORIZON_OPTIONS } from "../../../config/forecast/forecastConfig";
import type { ForecastFrequency } from "../../../types/forecast/forecastTypes";
import { ChoiceGroup } from "../../common/ChoiceGroup";

type ForecastControlsProps = {
  horizonWeeks: number;
  onSelectHorizon: (horizonWeeks: number) => void;
  frequency: ForecastFrequency;
  onSelectFrequency: (frequency: ForecastFrequency) => void;
  isRunning: boolean;
  onGenerate: () => void;
};

/** How far ahead to forecast, how detailed, and the button that starts it. */
export function ForecastControls({
  horizonWeeks,
  onSelectHorizon,
  frequency,
  onSelectFrequency,
  isRunning,
  onGenerate,
}: ForecastControlsProps) {
  return (
    <section className="panel controls" aria-label="Forecast settings">
      <div className="control-groups">
        <ChoiceGroup
          label="Look ahead"
          options={FORECAST_HORIZON_OPTIONS}
          value={horizonWeeks}
          onChange={onSelectHorizon}
          disabled={isRunning}
        />
        <ChoiceGroup
          label="Detail"
          options={FORECAST_FREQUENCY_OPTIONS}
          value={frequency}
          onChange={onSelectFrequency}
          disabled={isRunning}
        />
      </div>

      <button type="button" className="primary-button" onClick={onGenerate} disabled={isRunning}>
        {isRunning ? "Forecasting…" : "Generate forecast"}
      </button>
    </section>
  );
}

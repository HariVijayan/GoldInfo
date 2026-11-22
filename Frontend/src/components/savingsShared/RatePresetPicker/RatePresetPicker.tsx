import { useId } from "react";
import { INTEREST_RATE_PRESETS_PCT } from "../../../config/savingsShared/savingsSharedConfig";

type RatePresetPickerProps = {
  /** The rate currently typed, as text. A preset lights up when it matches. */
  currentRateText: string;
  onPick: (ratePct: number) => void;
  disabled: boolean;
};

/** Quick-pick buttons for common interest rates. */
export function RatePresetPicker({ currentRateText, onPick, disabled }: RatePresetPickerProps) {
  const labelId = useId();

  return (
    <div className="chart-toolbar-group">
      <span className="chart-toolbar-label" id={labelId}>
        Quick rates
      </span>
      <div role="group" aria-labelledby={labelId} className="period-picker">
        {INTEREST_RATE_PRESETS_PCT.map((presetRate) => (
          <button
            key={presetRate}
            type="button"
            className="period-option period-option-compact"
            aria-pressed={Number(currentRateText) === presetRate}
            disabled={disabled}
            onClick={() => onPick(presetRate)}
          >
            {presetRate}%
          </button>
        ))}
      </div>
    </div>
  );
}

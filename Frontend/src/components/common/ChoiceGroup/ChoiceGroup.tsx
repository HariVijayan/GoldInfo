import { useId } from "react";

type ChoiceOption<Value extends string | number> = { value: Value; label: string };

type ChoiceGroupProps<Value extends string | number> = {
  /** Visible label above the options. When omitted, ariaLabel names the group. */
  label?: string;
  ariaLabel?: string;
  options: ReadonlyArray<ChoiceOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
  disabled?: boolean;
};

/** One-of-several buttons, such as a period picker. Exposed to assistive tech as a radio group. */
export function ChoiceGroup<Value extends string | number>({
  label,
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
}: ChoiceGroupProps<Value>) {
  const labelId = useId();

  const group = (
    <div
      role="radiogroup"
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      className="period-picker"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className="period-option"
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  if (!label) return group;

  return (
    <div className="chart-toolbar-group">
      <span className="chart-toolbar-label" id={labelId}>
        {label}
      </span>
      {group}
    </div>
  );
}

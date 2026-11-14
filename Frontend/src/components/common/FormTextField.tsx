import type { ChangeEvent } from "react";

type FormTextFieldProps = {
  /** Used with idPrefix to build unique element ids. */
  fieldName: string;
  idPrefix: string;
  label: string;
  hint: string;
  value: string;
  error?: string;
  disabled: boolean;
  inputMode?: "decimal";
  type?: "text" | "date";
  min?: string;
  max?: string;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

/** A labelled input with a hint that turns into an error message. */
export function FormTextField({ fieldName, idPrefix, label, hint, error, ...inputProps }: FormTextFieldProps) {
  const inputId = `${idPrefix}-${fieldName}`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={hintId}
        autoComplete="off"
        {...inputProps}
      />
      <small
        id={hintId}
        className={error ? "field-hint field-hint-error" : "field-hint"}
        role={error ? "alert" : undefined}
      >
        {error ?? hint}
      </small>
    </div>
  );
}

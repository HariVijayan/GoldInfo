import type { SavingsDataRange } from "../../../types/savingsShared/savingsSharedTypes";

type DataRangeCaptionProps = {
  dataRange: SavingsDataRange | null;
  errorMessage: string;
  onRetry: () => void;
};

/** Which dates have market data, shown under the savings forms. */
export function DataRangeCaption({ dataRange, errorMessage, onRetry }: DataRangeCaptionProps) {
  return (
    <p className="chart-toolbar-caption" aria-live="polite">
      {dataRange ? (
        <>
          Data from {dataRange.earliest_date} to {dataRange.latest_date}.
        </>
      ) : errorMessage ? (
        <>
          {errorMessage}{" "}
          <button type="button" className="link-button" onClick={onRetry}>
            Retry
          </button>
        </>
      ) : (
        "Checking the available dates…"
      )}
    </p>
  );
}

/** Shown in place of a chart when the data cannot support it. */
export function ChartEmptyMessage({ message }: { message: string }) {
  return (
    <p className="chart-empty" role="status">
      {message}
    </p>
  );
}

type ErrorPanelProps = { title: string; message: string; onRetry: () => void };

/** Shown when a request failed, with a way to try again. */
export function ErrorPanel({ title, message, onRetry }: ErrorPanelProps) {
  return (
    <section className="panel error-panel" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <button type="button" className="secondary-button" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

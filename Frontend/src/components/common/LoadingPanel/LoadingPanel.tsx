type LoadingPanelProps = { title: string; message: string };

/** Shown while a request is running. */
export function LoadingPanel({ title, message }: LoadingPanelProps) {
  return (
    <section className="panel loading-panel" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

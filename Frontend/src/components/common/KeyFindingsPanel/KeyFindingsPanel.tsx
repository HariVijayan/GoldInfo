type KeyFindingsPanelProps = { findings: string[] };

/** A short bulleted list of what the numbers say, in plain language. One column wide. */
export function KeyFindingsPanel({ findings }: KeyFindingsPanelProps) {
  return (
    <section className="panel" aria-label="Key findings">
      <h2 className="section-heading-text">Key findings</h2>
      <ul className="takeaway-list">
        {findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
    </section>
  );
}

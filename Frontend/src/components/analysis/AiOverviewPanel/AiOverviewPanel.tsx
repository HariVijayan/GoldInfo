type AiOverviewPanelProps = {
  interpretation: string;
  /** Which prices the text describes, for example "Retail". */
  viewLabel: string;
  modelName: string;
};

/**
 * The AI-written summary. It spans both dashboard columns and the text
 * flows in two columns on wide screens, so a long overview stays easy to scan.
 */
export function AiOverviewPanel({ interpretation, viewLabel, modelName }: AiOverviewPanelProps) {
  const overviewParagraphs = interpretation.split(/\n{2,}/).filter(Boolean);

  return (
    <section className="panel ai-overview span-both" aria-label="AI Overview">
      <div className="section-heading">
        <h2>AI Overview</h2>
        <div className="ai-overview-tags">
          <span className="badge badge-view">{viewLabel} prices</span>
          {modelName && <span className="badge badge-quiet">{modelName}</span>}
        </div>
      </div>
      <div className="ai-overview-text">
        {overviewParagraphs.map((paragraphText, paragraphIndex) => (
          <p key={paragraphIndex}>{paragraphText}</p>
        ))}
      </div>
    </section>
  );
}

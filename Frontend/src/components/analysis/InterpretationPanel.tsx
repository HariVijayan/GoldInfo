import { GOLD_LABEL } from "../../config/displayLabels";

export function InterpretationPanel({ interpretation }: { interpretation: string }) {
  const interpretationParagraphs = interpretation.split(/\n{2,}/).filter(Boolean);

  return (
    <section className="panel" aria-label="Written analysis">
      <div className="section-heading">
        <h2>{GOLD_LABEL} analysis</h2>
        <span className="badge badge-success">Complete</span>
      </div>
      <div className="analysis-text">
        {interpretationParagraphs.map((paragraphText, paragraphIndex) => (
          <p key={paragraphIndex}>{paragraphText}</p>
        ))}
      </div>
    </section>
  );
}

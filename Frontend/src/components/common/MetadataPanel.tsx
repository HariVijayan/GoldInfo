import { Fragment, useState } from "react";
import type { ArtifactFile } from "../../types/analysisTypes";
import { downloadArtifactFile, formatFileSize } from "../../utils/artifactFiles";
import { CollapsiblePanel } from "./CollapsiblePanel";

type DetailsTab = "files" | "run-details";

export type RunDetailItem = { label: string; value: string };

type MetadataPanelProps = {
  /** Must be unique on the page: both tabs stay mounted at the same time. */
  panelId: string;
  artifactFiles: ArtifactFile[];
  runDetails: RunDetailItem[] | null;
  isRunning: boolean;
};

export function MetadataPanel({ panelId, artifactFiles, runDetails, isRunning }: MetadataPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailsTab>("files");
  const visibleTab: DetailsTab = runDetails ? activeTab : "files";

  const fileCountLabel = `${artifactFiles.length} downloadable ${
    artifactFiles.length === 1 ? "file" : "files"
  }`;

  return (
    <CollapsiblePanel
      panelId={panelId}
      title="Metadata"
      summary={isRunning ? `${fileCountLabel} so far` : fileCountLabel}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
    >
      <div className="tab-list" role="tablist" aria-label="Metadata sections">
        <button
          type="button"
          role="tab"
          id={`${panelId}-tab-files`}
          aria-selected={visibleTab === "files"}
          aria-controls={`${panelId}-panel-files`}
          className="tab-button"
          onClick={() => setActiveTab("files")}
        >
          Files ({artifactFiles.length})
        </button>
        {runDetails && (
          <button
            type="button"
            role="tab"
            id={`${panelId}-tab-run-details`}
            aria-selected={visibleTab === "run-details"}
            aria-controls={`${panelId}-panel-run-details`}
            className="tab-button"
            onClick={() => setActiveTab("run-details")}
          >
            Run details
          </button>
        )}
      </div>

      {visibleTab === "files" && (
        <div role="tabpanel" id={`${panelId}-panel-files`} aria-labelledby={`${panelId}-tab-files`}>
          <p className="tab-intro">
            The data behind the results. Download any file to inspect it in a spreadsheet or text
            editor.
            {isRunning && " More files appear as the agent works."}
          </p>

          <ul className="file-list">
            {artifactFiles.map((artifactFile) => (
              <li key={artifactFile.filename} className="file-row">
                <div className="file-info">
                  <span className="file-name">{artifactFile.filename}</span>
                  <span className="file-description">{artifactFile.description}</span>
                  <small>
                    {artifactFile.row_count !== null && `${artifactFile.row_count} rows, `}
                    {formatFileSize(artifactFile)}
                  </small>
                </div>
                <button
                  type="button"
                  className="secondary-button file-download-button"
                  onClick={() => downloadArtifactFile(artifactFile)}
                  aria-label={`Download ${artifactFile.filename}`}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {visibleTab === "run-details" && runDetails && (
        <div
          role="tabpanel"
          id={`${panelId}-panel-run-details`}
          aria-labelledby={`${panelId}-tab-run-details`}
        >
          <dl className="details-list">
            {runDetails.map((detailItem) => (
              <Fragment key={detailItem.label}>
                <dt>{detailItem.label}</dt>
                <dd>{detailItem.value}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      )}
    </CollapsiblePanel>
  );
}

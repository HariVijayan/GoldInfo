import { Fragment, useState } from "react";
import type { ArtifactFile } from "../types/analysisTypes";
import { downloadArtifactFile, formatFileSize } from "../utils/artifactFiles";

type DetailsTab = "metadata" | "run-details";

export type RunDetailItem = { label: string; value: string };

type MetadataPanelProps = {
  artifactFiles: ArtifactFile[];
  runDetails: RunDetailItem[] | null;
  isRunning: boolean;
};

export function MetadataPanel({ artifactFiles, runDetails, isRunning }: MetadataPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailsTab>("metadata");
  const visibleTab: DetailsTab = runDetails ? activeTab : "metadata";

  return (
    <section className="panel" aria-label="Run metadata">
      <div className="tab-list" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-metadata"
          aria-selected={visibleTab === "metadata"}
          aria-controls="panel-metadata"
          className="tab-button"
          onClick={() => setActiveTab("metadata")}
        >
          Metadata ({artifactFiles.length})
        </button>
        {runDetails && (
          <button
            type="button"
            role="tab"
            id="tab-run-details"
            aria-selected={visibleTab === "run-details"}
            aria-controls="panel-run-details"
            className="tab-button"
            onClick={() => setActiveTab("run-details")}
          >
            Run details
          </button>
        )}
      </div>

      {visibleTab === "metadata" && (
        <div role="tabpanel" id="panel-metadata" aria-labelledby="tab-metadata">
          <p className="tab-intro">
            The data behind the analysis. Download any file to inspect it in a spreadsheet or text editor.
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
        <div role="tabpanel" id="panel-run-details" aria-labelledby="tab-run-details">
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
    </section>
  );
}

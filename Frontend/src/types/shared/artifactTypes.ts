export type ArtifactFile = {
  filename: string;
  media_type: string;
  description: string;
  row_count: number | null;
  content: string;
};

export type RunMetadata = {
  generated_at?: string;
  file_count: number;
  files: ArtifactFile[];
};

/** One label and value in a run's details list. */
export type RunDetailItem = { label: string; value: string };

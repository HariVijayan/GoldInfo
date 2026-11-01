import type { ChangeTone } from "../types/analysisTypes";

/** One place that decides what up, down, and flat look like in every chart. */
export const TONE_COLOR_VARIABLES: Record<ChangeTone, string> = {
  positive: "var(--color-positive)",
  negative: "var(--color-negative)",
  neutral: "var(--color-gold)",
};

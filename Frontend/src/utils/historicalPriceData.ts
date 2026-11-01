import type { ProcessedGoldData } from "../types/analysisTypes";
import type { PricePoint } from "../types/priceSeriesTypes";

/**
 * Joins the backend's aligned datasets into one row per date holding all
 * three prices. Rows with a missing or non-finite value are skipped rather
 * than drawn as zero.
 */
export function buildHistoricalPricePoints(
  processedData: ProcessedGoldData | null | undefined
): PricePoint[] {
  if (!processedData?.gold_inr_per_ounce || !processedData.gold_inr_per_gram) {
    return [];
  }

  const pricePerGramByDate = new Map<string, number>(
    processedData.gold_inr_per_gram.map((observation) => [
      observation.date,
      observation.gold_inr_per_gram,
    ])
  );

  const pricePoints: PricePoint[] = [];

  for (const observation of processedData.gold_inr_per_ounce) {
    const goldInrPerGram = pricePerGramByDate.get(observation.date);
    if (goldInrPerGram === undefined) continue;

    const candidatePoint: PricePoint = {
      date: observation.date,
      gold_inr_per_gram: goldInrPerGram,
      gold_usd_per_ounce: observation.gold_usd_per_ounce,
      inr_per_usd: observation.inr_per_usd,
    };

    const hasOnlyFiniteValues = [
      candidatePoint.gold_inr_per_gram,
      candidatePoint.gold_usd_per_ounce,
      candidatePoint.inr_per_usd,
    ].every((value) => Number.isFinite(value));

    if (hasOnlyFiniteValues) pricePoints.push(candidatePoint);
  }

  return pricePoints.sort((first, second) => first.date.localeCompare(second.date));
}

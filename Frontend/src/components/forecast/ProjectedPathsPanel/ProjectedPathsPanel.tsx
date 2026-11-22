import type { ComponentProps } from "react";
import { GOLD_LABEL, INR_LABEL } from "../../../config/shared/displayLabels";
import { ChartPanel } from "../../common/ChartPanel";
import { IndexedComparisonChart } from "../../common/IndexedComparisonChart";

type ProjectedPathsPanelProps = {
  indexedPath: ComponentProps<typeof IndexedComparisonChart>["points"];
  anchorDate: string;
};

/** All three prices on one scale, each starting at 100 on the latest data. */
export function ProjectedPathsPanel({ indexedPath, anchorDate }: ProjectedPathsPanelProps) {
  return (
    <ChartPanel
      title="Projected paths, side by side"
      subtitle={`Every line starts at 100 on the latest data. ${GOLD_LABEL} in ${INR_LABEL} is the dollar price of gold combined with the exchange rate.`}
    >
      <IndexedComparisonChart
        points={indexedPath}
        markerDate={anchorDate}
        markerLabel="Latest data"
        ariaLabel="Line chart comparing the forecast path of gold in rupees, gold in dollars and the exchange rate, each starting at 100"
      />
    </ChartPanel>
  );
}

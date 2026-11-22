import { HISTORY_SHOWN_OPTIONS } from "../../../config/forecast/forecastConfig";
import type { PriceSeriesOption } from "../../../config/shared/priceSeriesConfig";
import type { ForecastChartModel } from "../../../utils/forecast/forecastChartData";
import { formatLongDate } from "../../../utils/shared/chartDates";
import { ChoiceGroup } from "../../common/ChoiceGroup";
import { ForecastChart } from "../ForecastChart";

type ForecastMainChartPanelProps = {
  seriesOption: PriceSeriesOption;
  chartModel: ForecastChartModel;
  intervalPercent: number;
  historyWeeksShown: number;
  onSelectHistoryWeeks: (historyWeeks: number) => void;
  footnote: { steps: number; frequency: string; startDate: string; endDate: string; observationsUsed: number; historyStart: string };
};

const HISTORY_OPTIONS = HISTORY_SHOWN_OPTIONS.map((option) => ({ value: option.value, label: `${option.label} back` }));

/** The forecast chart for the chosen price, with how much history to show beside it. */
export function ForecastMainChartPanel({
  seriesOption,
  chartModel,
  intervalPercent,
  historyWeeksShown,
  onSelectHistoryWeeks,
  footnote,
}: ForecastMainChartPanelProps) {
  return (
    <section className="panel chart-panel span-both" aria-label={seriesOption.label}>
      <header className="chart-panel-header">
        <div className="chart-panel-titles">
          <h2>{seriesOption.label}</h2>
        </div>
        <ChoiceGroup
          ariaLabel="History shown"
          options={HISTORY_OPTIONS}
          value={historyWeeksShown}
          onChange={onSelectHistoryWeeks}
        />
      </header>

      <ForecastChart
        chartPoints={chartModel.chartPoints}
        lastHistoryDate={chartModel.lastHistoryDate}
        seriesOption={seriesOption}
        intervalPercent={intervalPercent}
      />

      <p className="chart-footnote">
        {footnote.steps} {footnote.frequency} points from {formatLongDate(footnote.startDate)} to{" "}
        {formatLongDate(footnote.endDate)}, trained on {footnote.observationsUsed} {footnote.frequency} observations (
        {formatLongDate(footnote.historyStart)} onward).
      </p>
    </section>
  );
}

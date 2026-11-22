import type { FeatureId } from "../../types/shared/featureTypes";

/**
 * What each tab does, written once and shown as-is. It is static on purpose:
 * it describes the method, not any particular result. If a backend pipeline
 * changes, update the matching entry here.
 */
export type ProcedureContent = {
  purpose: string;
  goesIn: string[];
  steps: string[];
  comesOut: string[];
};

export const PROCEDURE_CONTENT: Record<FeatureId, ProcedureContent> = {
  analysis: {
    purpose:
      "See how the price of gold in rupees per gram has moved over a period you choose, and get a short written summary of it from an AI model.",
    goesIn: [
      "A history period, from 1 month to the longest available.",
      "The AI model that writes the overview, and the retail charge, both in the header.",
    ],
    steps: [
      "Download gold futures prices (US dollars per troy ounce) and the USD to INR exchange rate.",
      "Line up the dates, then convert to rupees per gram.",
      "Calculate the statistics: latest price, recent changes, highest and lowest, and where the price sits in its range. This is done twice: once for the original price and once with the retail charge added.",
      "The AI model writes one overview for each view from those numbers. It does not invent figures.",
    ],
    comesOut: [
      "An AI Overview in plain language.",
      "Charts for price, what moved it, drawdown, volatility, period changes, daily moves and seasonality, with a time range control.",
      "Key statistics, and downloadable files with the data.",
    ],
  },
  forecast: {
    purpose:
      "Look at where gold in rupees, gold in dollars and the exchange rate might head over the weeks ahead, with a range that shows how uncertain that is. It shows a possible direction, not a promise.",
    goesIn: [
      "How far ahead to look, in weeks.",
      "How detailed the forecast is: daily or weekly points.",
      "The retail charge in the header.",
    ],
    steps: [
      "Download the full price history for gold and the exchange rate.",
      "Train a statistical model on each series using its own recent changes and momentum.",
      "Project each series forward and widen an 80% range the further ahead it looks. Gold in rupees per gram is derived from the other two.",
      "Test the method on past data by repeatedly forecasting a period it has not seen, and record how far off it was.",
    ],
    comesOut: [
      "Forecast cards and a chart with the 80% range for each price.",
      "Side-by-side paths, how the range widens, and expected change by the end and by each period.",
      "A table of every forecast point, and downloadable files.",
    ],
  },
  savings: {
    purpose:
      "Compare putting a one-time amount of gold against the same money in an interest-bearing savings account, from a past date to today.",
    goesIn: [
      "A start date in the past. Leave it empty for the oldest date with data.",
      "How many grams of gold you buy, and optionally a savings amount. Leave the amount empty to match the gold's cost.",
      "The savings interest rate and how often interest is added, and the retail charge in the header.",
    ],
    steps: [
      "Buy the gold on the start date, or the next trading day. In the Retail view the price includes the retail charge.",
      "Put the same money into savings and add interest at your rate up to today.",
      "Value the gold at today's original price, since that is roughly what a buyer-back pays.",
      "Compare growth, and try every other start date to see how much timing mattered.",
    ],
    comesOut: [
      "The value of each side today, the gain, and the yearly rate.",
      "Charts for value over time, gold's lead, year-by-year change and falls from the peak.",
      "Statistics such as the interest rate savings needed to match gold, how rupee weakness added to gold's gain, and rolling holding periods.",
    ],
  },
  "savings-monthly": {
    purpose:
      "Compare investing the same amount in gold every month against paying it into a monthly recurring deposit (RD), from a past date to today.",
    goesIn: [
      "A start date in the past. Leave it empty for the oldest date with data.",
      "The amount invested each month, the RD interest rate and how often it compounds.",
      "When each month's gold is bought: the cheapest day from the 1st to the 10th, or the first trading day. The retail charge is in the header.",
    ],
    steps: [
      "Each month the RD receives the amount on the 1st and grows until today.",
      "Each month the same amount buys gold on the day your rule picks. In the Retail view the price includes the retail charge.",
      "Months whose buying window has not finished yet are left out for both sides, so both get identical installments.",
      "Add up all the gold bought, value it at today's original price, and compare it with the RD balance.",
    ],
    comesOut: [
      "The value of each side today and the yearly return on the money paid in.",
      "Charts for value over time, gold's lead over the RD, and your average cost per gram against the market.",
      "Year-end snapshots, a table of every installment, and downloadable files.",
    ],
  },
};

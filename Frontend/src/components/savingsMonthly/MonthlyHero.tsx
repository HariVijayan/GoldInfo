import { GOLD_LABEL } from "../../config/displayLabels";
import { formatLongDate } from "../../utils/chartDates";
import { formatRupees, getChangeTone } from "../../utils/formatters";
import type { MonthlyViewedResult } from "../../utils/priceViewSelectors";
import {
  describeInterest,
  formatGrams,
  formatPlainNumber,
  formatRate,
  formatSignedPercent,
  formatYears,
} from "../../utils/savingsFormatters";
import { formatMonthLabel } from "../../utils/savingsMonthlyFormatters";

type CardProps = {
  label: string;
  value: string;
  startLine: string;
  noteLine?: string;
  changePct: number | null;
  xirrPct: number | null;
};

function HoldingCard({ label, value, startLine, noteLine, changePct, xirrPct }: CardProps) {
  return (
    <article className="savings-card">
      <h3>{label}</h3>
      <p className="savings-card-value">{value}</p>
      <p className="savings-card-start">{startLine}</p>
      {noteLine && <p className="savings-card-start">{noteLine}</p>}
      <p className={`savings-card-change tone-${getChangeTone(changePct)}`}>
        {formatSignedPercent(changePct)} <small>({formatRate(xirrPct)} a year)</small>
      </p>
    </article>
  );
}

export function MonthlyHero({ monthlyResult }: { monthlyResult: MonthlyViewedResult }) {
  const { summary, request } = monthlyResult;
  const { gold, inr_rd: rd, comparison } = summary;
  const paidRetail = gold.purchase_charge_pct > 0;
  const gapText = formatRupees(Math.abs(comparison.final_value_gap_inr));

  const verdict =
    comparison.leader === "tie"
      ? { text: "Gold and the RD finished level.", tone: "neutral" }
      : comparison.leader === "gold"
        ? { text: `Gold finished ahead by ${gapText}.`, tone: "positive" }
        : { text: `The RD finished ahead by ${gapText}.`, tone: "negative" };

  return (
    <section className="panel savings-hero" aria-label="Result">
      <h2>
        {formatRupees(request.monthly_investment_inr)} a month since{" "}
        {formatMonthLabel(summary.first_deposit_date.slice(0, 7))}
      </h2>
      <p className="hero-coverage">
        {summary.installment_count} installments over {formatYears(summary.holding_years)}, valued on{" "}
        {formatLongDate(request.end_date)}. Total paid in {formatRupees(summary.total_invested_inr)}.
      </p>

      <div className="savings-compare">
        <HoldingCard
          label={`${GOLD_LABEL}, ${formatGrams(gold.total_grams)} g`}
          value={formatRupees(gold.current_value_inr)}
          startLine={`Average cost ${formatRupees(gold.average_cost_per_gram)} a gram`}
          noteLine={
            paidRetail
              ? `Bought at retail (+${formatPlainNumber(gold.purchase_charge_pct)}%), valued at the original price`
              : undefined
          }
          changePct={gold.return_pct}
          xirrPct={gold.xirr_pct}
        />
        <HoldingCard
          label={`RD, ${describeInterest(request.annual_interest_rate_pct, request.compounding)}`}
          value={formatRupees(rd.maturity_value_inr)}
          startLine={`Interest earned ${formatRupees(rd.interest_earned_inr)}`}
          changePct={rd.return_pct}
          xirrPct={rd.xirr_pct}
        />
      </div>

      <p className={`savings-verdict tone-${verdict.tone}`}>{verdict.text}</p>
    </section>
  );
}

import { GOLD_LABEL } from "../../config/displayLabels";
import type { SavingsViewedResult } from "../../utils/priceViewSelectors";
import { formatLongDate } from "../../utils/chartDates";
import { formatRupees, getChangeTone } from "../../utils/formatters";
import {
  describeInterest,
  formatGrams,
  formatPlainNumber,
  formatRate,
  formatSignedPercent,
  formatYears,
} from "../../utils/savingsFormatters";

type HoldingCardProps = {
  label: string;
  value: string;
  startLine: string;
  noteLine?: string;
  changePct: number | null;
  cagrPct: number | null;
};

function HoldingCard({ label, value, startLine, noteLine, changePct, cagrPct }: HoldingCardProps) {
  return (
    <article className="savings-card">
      <h3>{label}</h3>
      <p className="savings-card-value">{value}</p>
      <p className="savings-card-start">{startLine}</p>
      {noteLine && <p className="savings-card-start">{noteLine}</p>}
      <p className={`savings-card-change tone-${getChangeTone(changePct)}`}>
        {formatSignedPercent(changePct)} <small>({formatRate(cagrPct)} a year)</small>
      </p>
    </article>
  );
}

function describeVerdict(savingsResult: SavingsViewedResult): { text: string; tone: string } {
  const { comparison } = savingsResult.summary;
  const gapText = Math.abs(comparison.change_gap_points ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  });

  if (comparison.leader === "tie") return { text: "Gold and savings finished level.", tone: "neutral" };
  return comparison.leader === "gold"
    ? { text: `Gold finished ahead by ${gapText} percentage points.`, tone: "positive" }
    : { text: `Savings finished ahead by ${gapText} percentage points.`, tone: "negative" };
}

export function SavingsHero({ savingsResult }: { savingsResult: SavingsViewedResult }) {
  const { summary, request } = savingsResult;
  const verdict = describeVerdict(savingsResult);
  const paidRetail = summary.gold.purchase_charge_pct > 0;

  return (
    <section className="panel savings-hero" aria-label="Result">
      <h2>Gold or savings since {formatLongDate(request.effective_start_date)}</h2>
      <p className="hero-coverage">
        {formatYears(summary.holding_years)} to {formatLongDate(request.end_date)}.
      </p>

      <div className="savings-compare">
        <HoldingCard
          label={`${GOLD_LABEL}, ${formatGrams(summary.gold.grams)} g`}
          value={formatRupees(summary.gold.current_value_inr)}
          startLine={`Bought for ${formatRupees(summary.gold.invested_inr)}${
            paidRetail ? ` (retail, +${formatPlainNumber(summary.gold.purchase_charge_pct)}%)` : ""
          }`}
          noteLine={
            paidRetail ? `Valued at the original price, ${formatRupees(summary.gold.end_price_per_gram)} a gram` : undefined
          }
          changePct={summary.gold.change_pct}
          cagrPct={summary.gold.cagr_pct}
        />
        <HoldingCard
          label={`INR savings, ${describeInterest(request.annual_interest_rate_pct, request.compounding)}`}
          value={formatRupees(summary.inr_savings.final_value_inr)}
          startLine={`Started with ${formatRupees(summary.inr_savings.principal_inr)}`}
          changePct={summary.inr_savings.change_pct}
          cagrPct={summary.inr_savings.cagr_pct}
        />
      </div>

      <p className={`savings-verdict tone-${verdict.tone}`}>{verdict.text}</p>
    </section>
  );
}

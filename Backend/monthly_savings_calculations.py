"""
Pure calculations for the monthly-investment comparison: a fixed rupee
amount put into gold every month versus the same amount paid into a
recurring deposit (RD).

No network access and no knowledge of the API layer.

Rules (all deliberate, all stated in the response warnings)
-----------------------------------------------------------
* RD installment: paid on the 1st of each month. If the chosen start date
  is later than the 1st, the first RD installment is paid on that date.
* Gold installment: the same amount is spent on one trading day between the
  1st and the 10th of that month, chosen by the buying rule. Until then the
  money is set aside, so it still counts as part of the gold portfolio.
* A month is used only if its whole buying window lies inside the data and
  inside the chosen range. Choosing the cheapest day of a window that has
  not finished could not be done in real life. RD skips the same months, so
  both sides always receive identical installments.
* Gold is bought at the market price times the purchase multiplier (1 for
  the original view, 1.15 for a 15 percent retail charge) and always valued
  at the market price.
* RD interest uses the formulas in savings_calculations: each installment
  grows from its payment date to the valuation date.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

from savings_calculations import (
    DAYS_PER_YEAR,
    calculate_savings_growth_factor,
    finite_or_none,
)

BUY_RULE_LOWEST_IN_WINDOW = "lowest_in_window"
BUY_RULE_FIRST_TRADING_DAY = "first_trading_day"
SUPPORTED_BUY_RULES = (BUY_RULE_LOWEST_IN_WINDOW, BUY_RULE_FIRST_TRADING_DAY)

# The buying window is the 1st through this day of each month.
BUY_WINDOW_LAST_DAY = 10

SKIP_WINDOW_ALREADY_PASSED = "window_already_passed"
SKIP_WINDOW_NOT_FINISHED = "window_not_finished"
SKIP_NO_DATA_IN_WINDOW = "no_data_in_window"

# Search limits for the rate solvers (fractions: 1.0 is 100 percent).
XIRR_LOWER_RATE = -0.99
XIRR_UPPER_RATE = 100.0
BREAK_EVEN_LOWER_RATE = -0.5
BREAK_EVEN_UPPER_RATE = 1.0
SOLVER_ITERATIONS = 200


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

def build_installment_schedule(
    market_prices: pd.Series,
    first_allowed_date: pd.Timestamp,
    last_available_date: pd.Timestamp,
    buy_rule: str,
) -> tuple[pd.DataFrame, list[dict[str, str]]]:
    """
    One row per usable month, plus a list of months that were left out.

    market_prices is the market INR price per gram indexed by trading day.
    Columns: month, deposit_date, buy_date, market_price,
    first_day_buy_date, first_day_price. The first-day columns are always
    filled so the timing advantage of the cheapest-day rule can be measured.
    """

    rows: list[dict] = []
    skipped_months: list[dict[str, str]] = []

    for month in pd.period_range(first_allowed_date, last_available_date, freq="M"):
        month_label = str(month)
        month_start = month.start_time
        window_end = pd.Timestamp(month.year, month.month, BUY_WINDOW_LAST_DAY)
        window_start = max(month_start, first_allowed_date)

        if window_start > window_end:
            skipped_months.append(
                {"month": month_label, "reason": SKIP_WINDOW_ALREADY_PASSED}
            )
            continue

        if window_end > last_available_date:
            skipped_months.append(
                {"month": month_label, "reason": SKIP_WINDOW_NOT_FINISHED}
            )
            continue

        window_prices = market_prices.loc[window_start:window_end]
        if window_prices.empty:
            skipped_months.append(
                {"month": month_label, "reason": SKIP_NO_DATA_IN_WINDOW}
            )
            continue

        first_day_date = window_prices.index[0]
        # idxmin returns the earliest date when several days tie.
        chosen_date = (
            window_prices.idxmin()
            if buy_rule == BUY_RULE_LOWEST_IN_WINDOW
            else first_day_date
        )

        rows.append(
            {
                "month": month_label,
                "deposit_date": window_start,
                "buy_date": chosen_date,
                "market_price": float(window_prices.loc[chosen_date]),
                "first_day_buy_date": first_day_date,
                "first_day_price": float(window_prices.loc[first_day_date]),
            }
        )

    return pd.DataFrame(rows), skipped_months


# ---------------------------------------------------------------------------
# Recurring deposit
# ---------------------------------------------------------------------------

def calculate_rd_values(
    deposit_dates: pd.DatetimeIndex,
    valuation_dates: pd.DatetimeIndex,
    monthly_amount: float,
    annual_rate: float,
    compounding: str,
) -> np.ndarray:
    """
    Recurring-deposit balance on each valuation date. Only installments
    already paid by that date count; each grows from its own payment date.
    """

    elapsed_years = (
        np.asarray(
            (valuation_dates.values[:, None] - deposit_dates.values[None, :])
            / np.timedelta64(1, "D"),
            dtype=float,
        )
        / DAYS_PER_YEAR
    )
    has_been_paid = elapsed_years >= 0

    growth_factors = calculate_savings_growth_factor(
        annual_rate, compounding, np.where(has_been_paid, elapsed_years, 0.0)
    )
    return monthly_amount * (growth_factors * has_been_paid).sum(axis=1)


# ---------------------------------------------------------------------------
# Portfolio timeline
# ---------------------------------------------------------------------------

def build_portfolio_timeline(
    trading_dates: pd.DatetimeIndex,
    market_prices: np.ndarray,
    installments: pd.DataFrame,
    grams_bought: np.ndarray,
    monthly_amount: float,
    annual_rate: float,
    compounding: str,
) -> pd.DataFrame:
    """
    Daily value of both sides from the first payment to the last date.

    Money paid on the 1st but not yet spent on gold is counted as cash in
    the gold portfolio, so the gold line does not dip between the 1st and
    the buying day.
    """

    deposit_dates = pd.DatetimeIndex(installments["deposit_date"])
    buy_dates = pd.DatetimeIndex(installments["buy_date"])

    deposited_counts = np.searchsorted(deposit_dates.values, trading_dates.values, side="right")
    bought_counts = np.searchsorted(buy_dates.values, trading_dates.values, side="right")

    cumulative_grams = np.concatenate([[0.0], np.cumsum(grams_bought)])
    grams_held = cumulative_grams[bought_counts]
    deposited_inr = monthly_amount * deposited_counts
    spent_on_gold_inr = monthly_amount * bought_counts
    cash_waiting_inr = deposited_inr - spent_on_gold_inr

    with np.errstate(divide="ignore", invalid="ignore"):
        average_cost_per_gram = np.where(grams_held > 0, spent_on_gold_inr / grams_held, np.nan)

    timeline = pd.DataFrame(
        {
            "gold_price_per_gram": market_prices,
            "invested_inr": deposited_inr,
            "rd_value": calculate_rd_values(
                deposit_dates, trading_dates, monthly_amount, annual_rate, compounding
            ),
            "grams_held": grams_held,
            "gold_value": grams_held * market_prices + cash_waiting_inr,
            "average_cost_per_gram": average_cost_per_gram,
        },
        index=pd.DatetimeIndex(trading_dates, name="date"),
    )

    # Start at the first payment: nothing exists before it.
    return timeline.loc[timeline["invested_inr"] > 0]


def thin_to_weekly(timeline: pd.DataFrame) -> pd.DataFrame:
    """Last trading day of each week, plus the very first row."""

    weeks = timeline.index.to_period("W")
    keep = np.append(weeks[1:] != weeks[:-1], True)
    keep[0] = True
    return timeline.loc[keep]


# ---------------------------------------------------------------------------
# Rates
# ---------------------------------------------------------------------------

def calculate_xirr(
    payment_dates: pd.DatetimeIndex,
    payment_amount: float,
    final_date: pd.Timestamp,
    final_value: float,
) -> float | None:
    """
    Yearly rate that makes equal payments on the given dates grow into
    final_value (money-weighted return, Actual/365.25). A fraction, or None
    when no rate in the search range fits.
    """

    if final_value <= 0 or payment_amount <= 0 or len(payment_dates) == 0:
        return None

    payment_years = np.asarray(
        (payment_dates.values - payment_dates.values[0]) / np.timedelta64(1, "D"),
        dtype=float,
    ) / DAYS_PER_YEAR
    final_years = (final_date - payment_dates[0]) / pd.Timedelta(days=1) / DAYS_PER_YEAR

    def net_present_value(rate: float) -> float:
        discount = 1.0 + rate
        return float(
            final_value * discount ** (-final_years)
            - payment_amount * np.sum(discount ** (-payment_years))
        )

    return _bisect_decreasing(net_present_value, XIRR_LOWER_RATE, XIRR_UPPER_RATE)


def calculate_break_even_rd_rate(
    target_value: float,
    deposit_dates: pd.DatetimeIndex,
    final_date: pd.Timestamp,
    monthly_amount: float,
    compounding: str,
) -> float | None:
    """The flat nominal RD rate whose final balance equals target_value."""

    if target_value <= 0:
        return None

    def balance_gap(rate: float) -> float:
        balance = calculate_rd_values(
            deposit_dates, pd.DatetimeIndex([final_date]), monthly_amount, rate, compounding
        )[0]
        return float(target_value - balance)

    # The balance rises with the rate, so the gap falls as the rate rises.
    return _bisect_decreasing(balance_gap, BREAK_EVEN_LOWER_RATE, BREAK_EVEN_UPPER_RATE)


def _bisect_decreasing(function, lower: float, upper: float) -> float | None:
    """Root of a decreasing function, or None if it is not bracketed."""

    lower_value, upper_value = function(lower), function(upper)
    if not (math.isfinite(lower_value) and math.isfinite(upper_value)):
        return None
    if lower_value < 0 or upper_value > 0:
        return None

    for _ in range(SOLVER_ITERATIONS):
        middle = (lower + upper) / 2
        if function(middle) > 0:
            lower = middle
        else:
            upper = middle
    return (lower + upper) / 2


# ---------------------------------------------------------------------------
# Statistics on the daily timeline
# ---------------------------------------------------------------------------

def find_lead_extremes(timeline: pd.DataFrame) -> dict:
    """The day gold was furthest ahead of, and furthest behind, the RD."""

    lead = timeline["gold_value"] - timeline["rd_value"]
    best_date, worst_date = lead.idxmax(), lead.idxmin()
    return {
        "max_gold_lead": {"date": best_date.date().isoformat(), "value": float(lead.loc[best_date])},
        "max_gold_shortfall": {"date": worst_date.date().isoformat(), "value": float(lead.loc[worst_date])},
    }


def calculate_share_of_days_gold_ahead_pct(timeline: pd.DataFrame) -> float | None:
    if len(timeline) == 0:
        return None
    return finite_or_none((timeline["gold_value"] > timeline["rd_value"]).mean() * 100)


def build_year_end_rows(timeline: pd.DataFrame) -> list[dict]:
    """Portfolio snapshot at the end of each calendar year (and at the end)."""

    rows: list[dict] = []
    for year in range(timeline.index[0].year, timeline.index[-1].year + 1):
        year_slice = timeline.loc[: pd.Timestamp(year, 12, 31)]
        if year_slice.empty or year_slice.index[-1].year != year:
            continue
        snapshot_date = year_slice.index[-1]
        snapshot = year_slice.iloc[-1]
        lead = float(snapshot["gold_value"] - snapshot["rd_value"])
        rows.append(
            {
                "year": year,
                "as_of_date": snapshot_date.date().isoformat(),
                "invested_inr": float(snapshot["invested_inr"]),
                "gold_value": float(snapshot["gold_value"]),
                "rd_value": float(snapshot["rd_value"]),
                "lead_inr": lead,
                "gold_ahead": bool(lead > 0),
            }
        )
    return rows

"""
Pure calculations for the gold-versus-INR-savings comparison.

No network access and no knowledge of the API layer. Every function takes
plain numbers, arrays, or frames and returns plain Python values, so each
one can be checked on its own.

Conventions
-----------
* Rates are fractions here (0.065 is 6.5 percent). Percentages are returned
  as numbers such as 6.5 meaning 6.5 percent.
* Elapsed time is measured in actual days divided by 365.25.
* Interest follows the formula, so between compounding dates the balance
  rises smoothly instead of in steps. Final values at whole compounding
  periods match a bank's maturity amount.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

DAYS_PER_YEAR = 365.25
TRADING_DAYS_PER_YEAR = 252

SIMPLE_INTEREST = "simple"
COMPOUNDING_PERIODS_PER_YEAR: dict[str, int] = {
    "monthly": 12,
    "quarterly": 4,
    "half_yearly": 2,
    "yearly": 1,
}
SUPPORTED_COMPOUNDING_MODES = (
    SIMPLE_INTEREST,
    *COMPOUNDING_PERIODS_PER_YEAR,
)

HOLDING_PERIOD_WINDOW_YEARS = (1, 3, 5, 10)

# The first and last calendar years count as full when the data begins or
# ends within this many days of the year boundary.
FULL_YEAR_TOLERANCE_DAYS = 7

GOLD_PRICE_COLUMN = "gold_price_per_gram"
GOLD_VALUE_COLUMN = "gold_value"
INR_VALUE_COLUMN = "inr_value"


def finite_or_none(number: float | None) -> float | None:
    """JSON cannot carry NaN or infinity, so those become None."""

    if number is None:
        return None
    converted_number = float(number)
    return converted_number if math.isfinite(converted_number) else None


def to_percent(fraction: float | None) -> float | None:
    converted_fraction = finite_or_none(fraction)
    return None if converted_fraction is None else converted_fraction * 100


# ---------------------------------------------------------------------------
# Interest
# ---------------------------------------------------------------------------

def calculate_savings_growth_factor(
    annual_rate: float,
    compounding: str,
    elapsed_years: np.ndarray | float,
) -> np.ndarray | float:
    """Return balance divided by principal after the elapsed time."""

    if compounding == SIMPLE_INTEREST:
        return 1.0 + annual_rate * elapsed_years

    periods_per_year = COMPOUNDING_PERIODS_PER_YEAR[compounding]
    return (1.0 + annual_rate / periods_per_year) ** (
        periods_per_year * elapsed_years
    )


def calculate_effective_annual_yield(
    annual_rate: float,
    compounding: str,
) -> float | None:
    """The yearly gain after compounding. None for simple interest."""

    if compounding == SIMPLE_INTEREST:
        return None
    return float(calculate_savings_growth_factor(annual_rate, compounding, 1.0)) - 1.0


def calculate_break_even_annual_rate(
    target_value: float,
    principal: float,
    compounding: str,
    holding_years: float,
) -> float | None:
    """The nominal yearly rate at which savings would reach target_value."""

    if holding_years <= 0 or principal <= 0 or target_value <= 0:
        return None

    value_ratio = target_value / principal

    if compounding == SIMPLE_INTEREST:
        return (value_ratio - 1.0) / holding_years

    periods_per_year = COMPOUNDING_PERIODS_PER_YEAR[compounding]
    return periods_per_year * (
        value_ratio ** (1.0 / (periods_per_year * holding_years)) - 1.0
    )


def calculate_annualized_growth(
    start_value: float,
    end_value: float,
    holding_years: float,
) -> float | None:
    """Compound annual growth rate as a fraction."""

    if holding_years <= 0 or start_value <= 0 or end_value <= 0:
        return None
    return (end_value / start_value) ** (1.0 / holding_years) - 1.0


# ---------------------------------------------------------------------------
# Value timeline
# ---------------------------------------------------------------------------

def build_value_timeline(
    dates: pd.DatetimeIndex,
    gold_price_per_gram: np.ndarray,
    gold_grams: float,
    inr_principal: float,
    annual_rate: float,
    compounding: str,
) -> pd.DataFrame:
    """Daily value of the gold holding and of the savings balance."""

    elapsed_years = np.asarray(
        (dates - dates[0]) / pd.Timedelta(days=1), dtype=float
    ) / DAYS_PER_YEAR

    return pd.DataFrame(
        {
            GOLD_PRICE_COLUMN: gold_price_per_gram,
            GOLD_VALUE_COLUMN: gold_grams * gold_price_per_gram,
            INR_VALUE_COLUMN: inr_principal
            * calculate_savings_growth_factor(
                annual_rate, compounding, elapsed_years
            ),
        },
        index=pd.DatetimeIndex(dates, name="date"),
    )


# ---------------------------------------------------------------------------
# Holding statistics
# ---------------------------------------------------------------------------

def find_extreme_value(values: pd.Series, find_highest: bool) -> dict:
    extreme_date = values.idxmax() if find_highest else values.idxmin()
    return {
        "date": extreme_date.date().isoformat(),
        "value": float(values.loc[extreme_date]),
    }


def calculate_max_drawdown(values: pd.Series) -> dict:
    """Worst fall from a running peak, as a negative percentage."""

    running_peak = values.cummax()
    drawdowns = values / running_peak - 1.0
    trough_date = drawdowns.idxmin()
    peak_date = values.loc[:trough_date].idxmax()

    return {
        "max_drawdown_pct": float(drawdowns.min() * 100),
        "peak_date": peak_date.date().isoformat(),
        "trough_date": trough_date.date().isoformat(),
    }


def calculate_annualized_volatility_pct(values: pd.Series) -> float | None:
    log_returns = np.log(values).diff().dropna()
    if len(log_returns) < 2:
        return None
    return finite_or_none(
        log_returns.std(ddof=1) * math.sqrt(TRADING_DAYS_PER_YEAR) * 100
    )


def calculate_share_of_days_gold_ahead_pct(
    timeline: pd.DataFrame,
    gold_cost: float,
    inr_principal: float,
) -> float | None:
    """
    Share of days after the start on which gold's growth multiple beat the
    savings multiple. Multiples, not rupee values, so differing budgets
    still compare fairly. Gold's multiple starts from what was paid, which
    in the retail view is more than the day-one market value.
    """

    if len(timeline) < 2:
        return None

    gold_multiple = timeline[GOLD_VALUE_COLUMN] / gold_cost
    savings_multiple = timeline[INR_VALUE_COLUMN] / inr_principal

    return float((gold_multiple.iloc[1:] > savings_multiple.iloc[1:]).mean() * 100)


# ---------------------------------------------------------------------------
# Currency effect
# ---------------------------------------------------------------------------

def decompose_currency_effect(
    window_frame: pd.DataFrame,
    purchase_cost_multiplier: float = 1.0,
) -> dict:
    """
    Split gold's rupee return into its parts:

        (1 + inr return) = (1 + usd gold) x (1 + usd/inr) x (1 + retail cost)

    The retail cost effect is the one-off loss from paying the retail charge
    on purchase and valuing the gold at the market price. It is zero in the
    original view, where the multiplier is 1.
    """

    first_row = window_frame.iloc[0]
    last_row = window_frame.iloc[-1]

    gold_usd_change = last_row["gold_usd_per_ounce"] / first_row["gold_usd_per_ounce"] - 1
    usd_inr_change = last_row["inr_per_usd"] / first_row["inr_per_usd"] - 1
    retail_cost_effect = 1.0 / purchase_cost_multiplier - 1.0
    gold_inr_change = (
        last_row["gold_inr_per_gram"]
        / (first_row["gold_inr_per_gram"] * purchase_cost_multiplier)
        - 1
    )

    return {
        "start_gold_usd_per_ounce": float(first_row["gold_usd_per_ounce"]),
        "end_gold_usd_per_ounce": float(last_row["gold_usd_per_ounce"]),
        "start_inr_per_usd": float(first_row["inr_per_usd"]),
        "end_inr_per_usd": float(last_row["inr_per_usd"]),
        "gold_usd_change_pct": to_percent(gold_usd_change),
        "usd_inr_change_pct": to_percent(usd_inr_change),
        "retail_cost_effect_pct": to_percent(retail_cost_effect),
        "gold_inr_change_pct": to_percent(gold_inr_change),
    }


# ---------------------------------------------------------------------------
# Calendar years
# ---------------------------------------------------------------------------

def _last_position_on_or_before(index: pd.DatetimeIndex, boundary: pd.Timestamp) -> int:
    return int(index.searchsorted(boundary, side="right")) - 1


def build_calendar_year_rows(timeline: pd.DataFrame, gold_cost: float) -> list[dict]:
    """
    Year-by-year change of both holdings. Each year runs from the last
    observation of the previous year, so the years chain without gaps. The
    first year starts from what was paid for the gold, so a retail charge
    shows up as a drag in the year of purchase.
    """

    index = timeline.index
    first_date, last_date = index[0], index[-1]
    rows: list[dict] = []

    for year in range(first_date.year, last_date.year + 1):
        start_position = (
            0
            if year == first_date.year
            else _last_position_on_or_before(index, pd.Timestamp(year - 1, 12, 31))
        )
        end_position = _last_position_on_or_before(index, pd.Timestamp(year, 12, 31))

        if end_position <= start_position:
            continue

        gold_values = timeline[GOLD_VALUE_COLUMN]
        savings_values = timeline[INR_VALUE_COLUMN]
        start_gold_value = gold_cost if start_position == 0 else gold_values.iloc[start_position]
        gold_change = gold_values.iloc[end_position] / start_gold_value - 1
        savings_change = (
            savings_values.iloc[end_position] / savings_values.iloc[start_position] - 1
        )

        starts_late = year == first_date.year and (
            first_date - pd.Timestamp(year, 1, 1)
        ).days > FULL_YEAR_TOLERANCE_DAYS
        ends_early = year == last_date.year and (
            pd.Timestamp(year, 12, 31) - last_date
        ).days > FULL_YEAR_TOLERANCE_DAYS

        rows.append(
            {
                "year": year,
                "period_start": index[start_position].date().isoformat(),
                "period_end": index[end_position].date().isoformat(),
                "is_partial_year": bool(starts_late or ends_early),
                "gold_change_pct": to_percent(gold_change),
                "inr_savings_change_pct": to_percent(savings_change),
                "gold_beat_savings": bool(gold_change > savings_change),
            }
        )

    return rows


# ---------------------------------------------------------------------------
# Rolling holding periods
# ---------------------------------------------------------------------------

def build_holding_period_outcomes(
    timeline: pd.DataFrame,
    annual_rate: float,
    compounding: str,
    purchase_cost_multiplier: float = 1.0,
) -> list[dict]:
    """
    For each window length, every possible start date inside the selected
    range is treated as a purchase date held for that long. This shows how
    much the result depends on when you started. Windows overlap, so the
    counts are not independent samples. The multiplier is what is paid per
    unit of market value on purchase (1.15 for a 15 percent retail charge);
    gold is always valued at the market price.
    """

    dates = timeline.index
    gold_prices = timeline[GOLD_PRICE_COLUMN].to_numpy()
    holding_years = (dates[-1] - dates[0]).days / DAYS_PER_YEAR
    outcomes: list[dict] = []

    for window_years in HOLDING_PERIOD_WINDOW_YEARS:
        if window_years > holding_years:
            continue

        window_end_targets = dates + pd.DateOffset(years=window_years)
        has_full_window = np.asarray(window_end_targets <= dates[-1])
        if not has_full_window.any():
            continue

        start_positions = np.flatnonzero(has_full_window)
        end_positions = (
            dates.searchsorted(window_end_targets[has_full_window], side="right") - 1
        )

        elapsed_years = (
            np.asarray(dates[end_positions] - dates[start_positions], dtype="timedelta64[D]")
            .astype(float)
            / DAYS_PER_YEAR
        )

        gold_returns = (
            gold_prices[end_positions]
            / (gold_prices[start_positions] * purchase_cost_multiplier)
            - 1.0
        )
        savings_returns = (
            calculate_savings_growth_factor(annual_rate, compounding, elapsed_years) - 1.0
        )
        gold_annualized = (1.0 + gold_returns) ** (1.0 / elapsed_years) - 1.0

        outcomes.append(
            {
                "years": window_years,
                "window_count": int(len(start_positions)),
                "gold_gain_share_pct": float((gold_returns > 0).mean() * 100),
                "gold_beat_savings_share_pct": float(
                    (gold_returns > savings_returns).mean() * 100
                ),
                "median_gold_cagr_pct": to_percent(np.median(gold_annualized)),
                "worst_gold_cagr_pct": to_percent(gold_annualized.min()),
                "best_gold_cagr_pct": to_percent(gold_annualized.max()),
            }
        )

    return outcomes

"""
Savings comparison orchestration: one amount of gold bought on a date
versus the same money kept in an interest-bearing INR account.

Reads the cached aligned history, validates the request, runs the pure
calculations, and assembles the API response and artifacts.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any
from uuid import uuid4

import numpy as np
import pandas as pd

from artifacts import (
    ArtifactFile,
    build_run_metadata,
    build_savings_report_artifact,
    build_savings_timeline_artifact,
)
from market_history_cache import (
    GOLD_INR_PER_GRAM_COLUMN,
    MarketHistoryUnavailableError,
    get_aligned_market_history,
)
from retail_pricing import (
    DEFAULT_RETAIL_CHARGE_PCT,
    VIEW_ORIGINAL,
    VIEW_RETAIL,
    format_charge_label,
    retail_multiplier,
    validate_retail_charge_pct,
)
from savings_calculations import (
    GOLD_PRICE_COLUMN,
    GOLD_VALUE_COLUMN,
    INR_VALUE_COLUMN,
    SUPPORTED_COMPOUNDING_MODES,
    build_calendar_year_rows,
    build_holding_period_outcomes,
    build_value_timeline,
    calculate_annualized_growth,
    calculate_annualized_volatility_pct,
    calculate_break_even_annual_rate,
    calculate_effective_annual_yield,
    calculate_max_drawdown,
    calculate_share_of_days_gold_ahead_pct,
    decompose_currency_effect,
    DAYS_PER_YEAR,
    find_extreme_value,
    finite_or_none,
    to_percent,
)

logger = logging.getLogger("goldinfo.savings")

DEFAULT_GOLD_GRAMS = 1.0
DEFAULT_ANNUAL_INTEREST_RATE_PCT = 6.5
DEFAULT_COMPOUNDING = "quarterly"

MAXIMUM_GOLD_GRAMS = 1_000_000.0
MAXIMUM_INR_SAVINGS_AMOUNT = 1_000_000_000_000.0
MAXIMUM_ANNUAL_INTEREST_RATE_PCT = 50.0

# Differences smaller than this many percentage points count as a tie.
TIE_TOLERANCE_PERCENTAGE_POINTS = 0.005

TIMELINE_PRICE_DECIMALS = 4
TIMELINE_VALUE_DECIMALS = 2

def build_static_caveats(retail_charge_pct: float) -> list[str]:
    charge_label = format_charge_label(retail_charge_pct)
    day_one_loss_pct = (1 - 1 / retail_multiplier(retail_charge_pct)) * 100

    return [
        "Gold is priced from COMEX gold futures (GC=F) converted to rupees "
        "at the market USD/INR rate. The Original view uses that "
        "international reference price for buying and selling.",
        f"The Retail view assumes the gold is bought at that price plus a "
        f"flat {charge_label}% (import duty, GST, making charges, dealer "
        "spread) and valued at the original price, because a buyer-back "
        f"pays roughly the market rate. The gold is therefore worth "
        f"{day_one_loss_pct:.1f}% less than its cost on day one. Real "
        "charges vary by shop, season, and offers.",
        "The savings balance uses one flat interest rate for the whole "
        "period. Real bank rates changed many times between 2004 and "
        "today, and interest income may be taxable. Taxes are not "
        "modelled.",
        "Neither holding is adjusted for inflation. Both figures are in "
        "nominal rupees.",
        "Rolling holding-period windows overlap, so their counts describe "
        "how outcomes varied with the start date, not independent trials.",
        "This is a look at the past. It does not predict future returns "
        "and is not financial advice.",
    ]


class SavingsError(Exception):
    """Expected savings failure. Carries any artifacts produced so far."""

    def __init__(self, message: str, http_status_code: int = 502):
        super().__init__(message)
        self.http_status_code = http_status_code
        self.run_metadata: dict[str, Any] | None = None


def load_aligned_history():
    try:
        return get_aligned_market_history()
    except MarketHistoryUnavailableError as exc:
        raise SavingsError(str(exc), http_status_code=502) from exc


def get_savings_data_range() -> dict[str, Any]:
    """The first and last date a comparison can use."""

    history = load_aligned_history()
    frame = history.aligned_frame

    return {
        "status": "success",
        "earliest_date": frame.index[0].date().isoformat(),
        "latest_date": frame.index[-1].date().isoformat(),
        "aligned_observations": int(len(frame)),
        "data_fetched_at": history.fetched_at.isoformat(timespec="seconds"),
        "is_stale": history.is_stale,
    }


def _validate_inputs(
    gold_grams: float,
    inr_savings_amount: float | None,
    annual_interest_rate_pct: float,
    compounding: str,
) -> None:
    if not 0 < gold_grams <= MAXIMUM_GOLD_GRAMS:
        raise SavingsError(
            f"gold_grams must be greater than 0 and at most "
            f"{MAXIMUM_GOLD_GRAMS:g}.",
            http_status_code=422,
        )
    if inr_savings_amount is not None and not (
        0 < inr_savings_amount <= MAXIMUM_INR_SAVINGS_AMOUNT
    ):
        raise SavingsError(
            f"inr_savings_amount must be greater than 0 and at most "
            f"{MAXIMUM_INR_SAVINGS_AMOUNT:g}.",
            http_status_code=422,
        )
    if not 0 <= annual_interest_rate_pct <= MAXIMUM_ANNUAL_INTEREST_RATE_PCT:
        raise SavingsError(
            f"annual_interest_rate_pct must be between 0 and "
            f"{MAXIMUM_ANNUAL_INTEREST_RATE_PCT:g}.",
            http_status_code=422,
        )
    if compounding not in SUPPORTED_COMPOUNDING_MODES:
        raise SavingsError(
            f"compounding must be one of "
            f"{', '.join(SUPPORTED_COMPOUNDING_MODES)}.",
            http_status_code=422,
        )


def find_start_position(
    frame: pd.DataFrame,
    requested_start_date: date | None,
    warnings: list[str],
) -> int:
    """First observation on or after the requested date (a buyer cannot
    purchase before the date they chose)."""

    first_date = frame.index[0]
    last_date = frame.index[-1]

    if requested_start_date is None:
        return 0

    requested_timestamp = pd.Timestamp(requested_start_date)

    if requested_timestamp > last_date:
        raise SavingsError(
            f"start_date {requested_start_date.isoformat()} is after the "
            f"latest available data ({last_date.date().isoformat()}).",
            http_status_code=422,
        )

    if requested_timestamp < first_date:
        warnings.insert(
            0,
            f"Data starts on {first_date.date().isoformat()}, so that "
            f"date was used instead of {requested_start_date.isoformat()}.",
        )
        return 0

    start_position = int(frame.index.searchsorted(requested_timestamp, side="left"))

    if frame.index[start_position] != requested_timestamp:
        warnings.insert(
            0,
            f"{requested_start_date.isoformat()} has no market data "
            f"(weekend or holiday). The next trading day, "
            f"{frame.index[start_position].date().isoformat()}, was used.",
        )

    return start_position


def _build_summary(
    *,
    timeline: pd.DataFrame,
    gold_grams: float,
    gold_cost: float,
    inr_principal: float,
    annual_rate: float,
    compounding: str,
    holding_years: float,
    holding_days: int,
    purchase_cost_multiplier: float,
) -> dict[str, Any]:
    market_start_price = float(timeline[GOLD_PRICE_COLUMN].iloc[0])
    market_end_price = float(timeline[GOLD_PRICE_COLUMN].iloc[-1])
    purchase_price = market_start_price * purchase_cost_multiplier
    gold_final = float(timeline[GOLD_VALUE_COLUMN].iloc[-1])
    savings_final = float(timeline[INR_VALUE_COLUMN].iloc[-1])

    # Growth multiples do not depend on how much was invested, so they are
    # the fair basis when the two starting amounts differ.
    gold_growth_multiple = gold_final / gold_cost
    savings_growth_multiple = savings_final / inr_principal

    gold_change = gold_growth_multiple - 1.0
    savings_change = savings_growth_multiple - 1.0
    change_gap_points = (gold_change - savings_change) * 100

    if abs(change_gap_points) < TIE_TOLERANCE_PERCENTAGE_POINTS:
        leader = "tie"
    else:
        leader = "gold" if change_gap_points > 0 else "inr_savings"

    gold_drawdown = calculate_max_drawdown(timeline[GOLD_VALUE_COLUMN])

    # What the savings could buy: always at the price a buyer pays.
    gold_equivalent_grams_at_start = inr_principal / purchase_price
    gold_equivalent_grams_now = savings_final / (
        market_end_price * purchase_cost_multiplier
    )

    return {
        "holding_days": holding_days,
        "holding_years": holding_years,
        "same_budget": bool(np.isclose(gold_cost, inr_principal, rtol=1e-9)),
        "gold": {
            "grams": gold_grams,
            # Price paid per gram, and the price the holding is valued at.
            "start_price_per_gram": purchase_price,
            "end_price_per_gram": market_end_price,
            "purchase_charge_pct": (purchase_cost_multiplier - 1.0) * 100,
            "invested_inr": gold_cost,
            "current_value_inr": gold_final,
            "gain_inr": gold_final - gold_cost,
            "change_pct": to_percent(gold_change),
            "cagr_pct": to_percent(
                calculate_annualized_growth(gold_cost, gold_final, holding_years)
            ),
            "highest_value": find_extreme_value(timeline[GOLD_VALUE_COLUMN], True),
            "lowest_value": find_extreme_value(timeline[GOLD_VALUE_COLUMN], False),
            **gold_drawdown,
            "annualized_volatility_pct": calculate_annualized_volatility_pct(
                timeline[GOLD_VALUE_COLUMN]
            ),
        },
        "inr_savings": {
            "principal_inr": inr_principal,
            "final_value_inr": savings_final,
            "interest_earned_inr": savings_final - inr_principal,
            "change_pct": to_percent(savings_change),
            "cagr_pct": to_percent(
                calculate_annualized_growth(inr_principal, savings_final, holding_years)
            ),
            "effective_annual_yield_pct": to_percent(
                calculate_effective_annual_yield(annual_rate, compounding)
            ),
        },
        "comparison": {
            "leader": leader,
            "change_gap_points": finite_or_none(change_gap_points),
            # Absolute rupees: only like-for-like when the budgets match.
            "final_value_gap_inr": gold_final - savings_final,
            "gold_to_savings_growth_ratio": finite_or_none(
                gold_growth_multiple / savings_growth_multiple
            ),
            "break_even_annual_rate_pct": to_percent(
                calculate_break_even_annual_rate(
                    inr_principal * gold_growth_multiple,
                    inr_principal,
                    compounding,
                    holding_years,
                )
            ),
            "share_of_days_gold_ahead_pct": calculate_share_of_days_gold_ahead_pct(
                timeline, gold_cost, inr_principal
            ),
            "gold_equivalent_grams_at_start": gold_equivalent_grams_at_start,
            "gold_equivalent_grams_now": gold_equivalent_grams_now,
            "gold_purchasing_power_change_pct": to_percent(
                gold_equivalent_grams_now / gold_equivalent_grams_at_start - 1.0
            ),
        },
    }


def _build_timeline_rows(timeline: pd.DataFrame) -> list[dict[str, Any]]:
    rounded_timeline = timeline.round(
        {
            GOLD_PRICE_COLUMN: TIMELINE_PRICE_DECIMALS,
            GOLD_VALUE_COLUMN: TIMELINE_VALUE_DECIMALS,
            INR_VALUE_COLUMN: TIMELINE_VALUE_DECIMALS,
        }
    )
    return [
        {
            "date": row_date.date().isoformat(),
            GOLD_PRICE_COLUMN: float(row[GOLD_PRICE_COLUMN]),
            GOLD_VALUE_COLUMN: float(row[GOLD_VALUE_COLUMN]),
            INR_VALUE_COLUMN: float(row[INR_VALUE_COLUMN]),
        }
        for row_date, row in rounded_timeline.iterrows()
    ]


def _build_view(
    *,
    window_frame: pd.DataFrame,
    purchase_cost_multiplier: float,
    gold_grams: float,
    user_inr_amount: float | None,
    annual_rate: float,
    compounding: str,
    holding_years: float,
    holding_days: int,
) -> dict[str, Any]:
    """
    One complete result. Gold is bought at the market price times the
    purchase multiplier (1 for the original view) and always valued at the
    market price, which is also what a seller would roughly receive.
    """

    market_prices = window_frame[GOLD_INR_PER_GRAM_COLUMN].to_numpy()
    gold_cost = gold_grams * float(market_prices[0]) * purchase_cost_multiplier
    inr_principal = gold_cost if user_inr_amount is None else user_inr_amount

    timeline = build_value_timeline(
        window_frame.index,
        market_prices,
        gold_grams,
        inr_principal,
        annual_rate,
        compounding,
    )

    if not np.all(np.isfinite(timeline.to_numpy())):
        raise SavingsError(
            "The calculation produced non-finite values.", http_status_code=500
        )

    return {
        "summary": _build_summary(
            timeline=timeline,
            gold_grams=gold_grams,
            gold_cost=gold_cost,
            inr_principal=inr_principal,
            annual_rate=annual_rate,
            compounding=compounding,
            holding_years=holding_years,
            holding_days=holding_days,
            purchase_cost_multiplier=purchase_cost_multiplier,
        ),
        "currency_effect": decompose_currency_effect(
            window_frame, purchase_cost_multiplier
        ),
        "calendar_years": build_calendar_year_rows(timeline, gold_cost),
        "holding_period_outcomes": build_holding_period_outcomes(
            timeline, annual_rate, compounding, purchase_cost_multiplier
        ),
        "timeline": {"points": _build_timeline_rows(timeline)},
    }


def _execute_savings_comparison(
    run_id: str,
    requested_start_date: date | None,
    gold_grams: float,
    inr_savings_amount: float | None,
    annual_interest_rate_pct: float,
    compounding: str,
    retail_charge_pct: float,
    artifact_files: dict[str, ArtifactFile],
) -> dict[str, Any]:
    _validate_inputs(
        gold_grams, inr_savings_amount, annual_interest_rate_pct, compounding
    )

    history = load_aligned_history()
    frame = history.aligned_frame
    warnings: list[str] = []

    start_position = find_start_position(frame, requested_start_date, warnings)

    if start_position >= len(frame) - 1:
        raise SavingsError(
            "The start date is too recent: at least one trading day must "
            "pass between the purchase and the latest data.",
            http_status_code=422,
        )

    window_frame = frame.iloc[start_position:].copy()
    effective_start_date = window_frame.index[0]
    end_date = window_frame.index[-1]

    holding_days = int((end_date - effective_start_date).days)
    holding_years = holding_days / DAYS_PER_YEAR
    annual_rate = annual_interest_rate_pct / 100

    shared_arguments = {
        "window_frame": window_frame,
        "gold_grams": gold_grams,
        "user_inr_amount": inr_savings_amount,
        "annual_rate": annual_rate,
        "compounding": compounding,
        "holding_years": holding_years,
        "holding_days": holding_days,
    }
    views = {
        VIEW_ORIGINAL: _build_view(
            purchase_cost_multiplier=1.0, **shared_arguments
        ),
        VIEW_RETAIL: _build_view(
            purchase_cost_multiplier=retail_multiplier(retail_charge_pct),
            **shared_arguments,
        ),
    }

    if inr_savings_amount is not None and not all(
        view["summary"]["same_budget"] for view in views.values()
    ):
        warnings.append(
            "The gold purchase and the INR savings start from different "
            "amounts. The leader is decided by percentage growth, which "
            "does not depend on the amount invested."
        )
    if history.is_stale:
        warnings.insert(
            0,
            "Fresh market data could not be downloaded, so the most "
            "recent saved copy from "
            f"{history.fetched_at.isoformat(timespec='seconds')} was used.",
        )
    warnings += build_static_caveats(retail_charge_pct)

    request_echo = {
        "requested_start_date": (
            requested_start_date.isoformat() if requested_start_date else None
        ),
        "effective_start_date": effective_start_date.date().isoformat(),
        "end_date": end_date.date().isoformat(),
        "gold_grams": gold_grams,
        # None means each view matched the savings to its own gold cost.
        "inr_savings_amount": inr_savings_amount,
        "inr_principal_source": (
            "matched_to_gold_cost"
            if inr_savings_amount is None
            else "user_provided"
        ),
        "annual_interest_rate_pct": annual_interest_rate_pct,
        "compounding": compounding,
        "retail_charge_pct": retail_charge_pct,
    }
    data_range = {
        "earliest_date": frame.index[0].date().isoformat(),
        "latest_date": frame.index[-1].date().isoformat(),
        "aligned_observations": int(len(frame)),
        "data_fetched_at": history.fetched_at.isoformat(timespec="seconds"),
        "is_stale": history.is_stale,
    }

    for view_name, view in views.items():
        timeline_artifact = build_savings_timeline_artifact(
            view["timeline"]["points"], view_name
        )
        artifact_files[timeline_artifact["filename"]] = timeline_artifact

    report_artifact = build_savings_report_artifact(
        run_id=run_id,
        request_parameters=request_echo,
        views=views,
        warnings=warnings,
    )
    artifact_files[report_artifact["filename"]] = report_artifact

    logger.info(
        "run=%s savings comparison complete start=%s years=%.2f "
        "retail_charge=%s leader original=%s retail=%s",
        run_id,
        request_echo["effective_start_date"],
        holding_years,
        retail_charge_pct,
        views[VIEW_ORIGINAL]["summary"]["comparison"]["leader"],
        views[VIEW_RETAIL]["summary"]["comparison"]["leader"],
    )

    return {
        "status": "success",
        "run_id": run_id,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "request": request_echo,
        "data_range": data_range,
        "views": views,
        "warnings": warnings,
        "metadata": build_run_metadata(artifact_files),
    }


def run_savings_comparison(
    start_date: date | None = None,
    gold_grams: float = DEFAULT_GOLD_GRAMS,
    inr_savings_amount: float | None = None,
    annual_interest_rate_pct: float = DEFAULT_ANNUAL_INTEREST_RATE_PCT,
    compounding: str = DEFAULT_COMPOUNDING,
    retail_charge_pct: float = DEFAULT_RETAIL_CHARGE_PCT,
) -> dict[str, Any]:
    try:
        retail_charge_pct = validate_retail_charge_pct(retail_charge_pct)
    except ValueError as exc:
        raise SavingsError(str(exc), http_status_code=422) from exc

    run_id = str(uuid4())
    artifact_files: dict[str, ArtifactFile] = {}

    try:
        return _execute_savings_comparison(
            run_id,
            start_date,
            gold_grams,
            inr_savings_amount,
            annual_interest_rate_pct,
            compounding,
            retail_charge_pct,
            artifact_files,
        )
    except SavingsError as exc:
        exc.run_metadata = build_run_metadata(artifact_files)
        raise
    except Exception as exc:
        logger.exception("run=%s unexpected savings failure", run_id)
        error = SavingsError(
            "The comparison could not be completed because of an internal "
            "error. Details were written to the server log.",
            http_status_code=500,
        )
        error.run_metadata = build_run_metadata(artifact_files)
        raise error from exc

"""
Monthly-investment comparison: the same rupee amount every month, put into
gold (bought on the cheapest day of the 1st to 10th, by default) versus a
recurring deposit. Both the original and the retail view are computed in
one response.

Reads the cached aligned history, validates the request, runs the pure
calculations, and assembles the API response and artifacts. The rules are
documented in monthly_savings_calculations.
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
    build_monthly_installments_artifact,
    build_monthly_report_artifact,
    build_monthly_timeline_artifact,
    build_run_metadata,
)
from market_history_cache import GOLD_INR_PER_GRAM_COLUMN
from monthly_savings_calculations import (
    BUY_RULE_LOWEST_IN_WINDOW,
    BUY_WINDOW_LAST_DAY,
    SKIP_NO_DATA_IN_WINDOW,
    SKIP_WINDOW_ALREADY_PASSED,
    SKIP_WINDOW_NOT_FINISHED,
    SUPPORTED_BUY_RULES,
    build_installment_schedule,
    build_portfolio_timeline,
    build_year_end_rows,
    calculate_break_even_rd_rate,
    calculate_share_of_days_gold_ahead_pct,
    calculate_xirr,
    find_lead_extremes,
    thin_to_weekly,
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
    DAYS_PER_YEAR,
    SUPPORTED_COMPOUNDING_MODES,
    calculate_savings_growth_factor,
    finite_or_none,
    to_percent,
)
from savings_service import (
    MAXIMUM_ANNUAL_INTEREST_RATE_PCT,
    SavingsError,
    find_start_position,
    load_aligned_history,
)

logger = logging.getLogger("goldinfo.savings_monthly")

DEFAULT_MONTHLY_INVESTMENT_INR = 5_000.0
MAXIMUM_MONTHLY_INVESTMENT_INR = 1_000_000_000.0
DEFAULT_ANNUAL_INTEREST_RATE_PCT = 6.5
DEFAULT_COMPOUNDING = "quarterly"
DEFAULT_BUY_RULE = BUY_RULE_LOWEST_IN_WINDOW

# A gap smaller than this share of the money paid in counts as a tie.
TIE_TOLERANCE_PCT_OF_INVESTED = 0.005

PRICE_DECIMALS = 4
VALUE_DECIMALS = 2
GRAM_DECIMALS = 6

SKIP_EXPLANATIONS = {
    SKIP_WINDOW_ALREADY_PASSED: (
        "the start date is after the {last_day}th, so that month's buying "
        "window had already passed"
    ),
    SKIP_WINDOW_NOT_FINISHED: (
        "the data has not reached the {last_day}th yet, so the buying window "
        "is not finished (the cheapest day cannot be known in advance)"
    ),
    SKIP_NO_DATA_IN_WINDOW: "there is no market data between the 1st and the {last_day}th",
}


def build_monthly_caveats(retail_charge_pct: float, buy_rule: str) -> list[str]:
    charge_label = format_charge_label(retail_charge_pct)
    day_one_loss_pct = (1 - 1 / retail_multiplier(retail_charge_pct)) * 100

    buying_note = (
        f"With the cheapest-day rule each installment buys gold on the lowest "
        f"priced trading day from the 1st to the {BUY_WINDOW_LAST_DAY}th. That "
        "uses hindsight, which a real buyer does not have, so it flatters "
        "gold. The timing edge in the summary shows how much."
        if buy_rule == BUY_RULE_LOWEST_IN_WINDOW
        else "Each installment buys gold on the first trading day of the "
        "month, with no hindsight."
    )

    return [
        "Gold is priced from COMEX gold futures (GC=F) converted to rupees "
        "at the market USD/INR rate. The Original view buys and values gold "
        "at that international reference price.",
        f"The Retail view buys each installment at that price plus a flat "
        f"{charge_label}% (import duty, GST, making charges, dealer spread) "
        f"and values the gold at the original price, the way a buyer-back "
        f"roughly pays. Each installment is therefore worth "
        f"{day_one_loss_pct:.1f}% less than its cost on the day it is bought.",
        buying_note,
        "The recurring deposit pays one flat rate for the whole period and "
        "each installment is paid on the 1st of the month. Real bank rates "
        "changed many times between 2004 and today, and RD interest may be "
        "taxable. Taxes are not modelled.",
        "Money paid on the 1st and not yet spent on gold counts as cash in "
        "the gold portfolio and earns nothing.",
        "Neither side is adjusted for inflation. Both figures are in "
        "nominal rupees.",
        "This is a look at the past. It does not predict future returns "
        "and is not financial advice.",
    ]


def _validate_inputs(
    monthly_investment_inr: float,
    annual_interest_rate_pct: float,
    compounding: str,
    buy_rule: str,
) -> None:
    if not 0 < monthly_investment_inr <= MAXIMUM_MONTHLY_INVESTMENT_INR:
        raise SavingsError(
            "monthly_investment_inr must be greater than 0 and at most "
            f"{MAXIMUM_MONTHLY_INVESTMENT_INR:g}.",
            http_status_code=422,
        )
    if not 0 <= annual_interest_rate_pct <= MAXIMUM_ANNUAL_INTEREST_RATE_PCT:
        raise SavingsError(
            "annual_interest_rate_pct must be between 0 and "
            f"{MAXIMUM_ANNUAL_INTEREST_RATE_PCT:g}.",
            http_status_code=422,
        )
    if compounding not in SUPPORTED_COMPOUNDING_MODES:
        raise SavingsError(
            f"compounding must be one of {', '.join(SUPPORTED_COMPOUNDING_MODES)}.",
            http_status_code=422,
        )
    if buy_rule not in SUPPORTED_BUY_RULES:
        raise SavingsError(
            f"buy_rule must be one of {', '.join(SUPPORTED_BUY_RULES)}.",
            http_status_code=422,
        )


def _describe_skipped_months(skipped_months: list[dict[str, str]]) -> list[str]:
    """One sentence per reason, listing the months it affected."""

    months_by_reason: dict[str, list[str]] = {}
    for skipped in skipped_months:
        months_by_reason.setdefault(skipped["reason"], []).append(skipped["month"])

    return [
        f"Left out ({', '.join(months)}): "
        + SKIP_EXPLANATIONS[reason].format(last_day=BUY_WINDOW_LAST_DAY)
        + ". Both gold and the RD skip these months."
        for reason, months in months_by_reason.items()
    ]


def _round_timeline_rows(weekly_timeline: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {
            "date": row_date.date().isoformat(),
            "gold_price_per_gram": round(float(row["gold_price_per_gram"]), PRICE_DECIMALS),
            "invested_inr": round(float(row["invested_inr"]), VALUE_DECIMALS),
            "rd_value": round(float(row["rd_value"]), VALUE_DECIMALS),
            "grams_held": round(float(row["grams_held"]), GRAM_DECIMALS),
            "gold_value": round(float(row["gold_value"]), VALUE_DECIMALS),
            "average_cost_per_gram": (
                None
                if np.isnan(row["average_cost_per_gram"])
                else round(float(row["average_cost_per_gram"]), PRICE_DECIMALS)
            ),
        }
        for row_date, row in weekly_timeline.iterrows()
    ]


def _build_view(
    *,
    schedule: pd.DataFrame,
    window_frame: pd.DataFrame,
    monthly_amount: float,
    annual_rate: float,
    compounding: str,
    purchase_cost_multiplier: float,
) -> dict[str, Any]:
    market_prices = window_frame[GOLD_INR_PER_GRAM_COLUMN]
    end_date = market_prices.index[-1]
    end_price = float(market_prices.iloc[-1])

    deposit_dates = pd.DatetimeIndex(schedule["deposit_date"])
    paid_prices = schedule["market_price"].to_numpy() * purchase_cost_multiplier
    grams_bought = monthly_amount / paid_prices

    installment_count = len(schedule)
    total_invested = monthly_amount * installment_count
    total_grams = float(grams_bought.sum())

    gold_value_each = grams_bought * end_price
    # Each installment grows from its own payment date to the last date.
    rd_value_each = monthly_amount * calculate_savings_growth_factor(
        annual_rate,
        compounding,
        np.asarray((end_date - deposit_dates) / pd.Timedelta(days=1), dtype=float) / DAYS_PER_YEAR,
    )

    gold_final = float(gold_value_each.sum())
    rd_final = float(rd_value_each.sum())

    timeline = build_portfolio_timeline(
        window_frame.index,
        market_prices.to_numpy(),
        schedule,
        grams_bought,
        monthly_amount,
        annual_rate,
        compounding,
    )

    if not (
        np.isclose(timeline["gold_value"].iloc[-1], gold_final, rtol=1e-9)
        and np.isclose(timeline["rd_value"].iloc[-1], rd_final, rtol=1e-9)
    ):
        raise SavingsError(
            "The daily timeline does not end at the final values.",
            http_status_code=500,
        )

    first_day_grams = float(
        (monthly_amount / (schedule["first_day_price"].to_numpy() * purchase_cost_multiplier)).sum()
    )
    value_gap = gold_final - rd_final
    gap_pct_of_invested = value_gap / total_invested * 100

    if abs(gap_pct_of_invested) < TIE_TOLERANCE_PCT_OF_INVESTED:
        leader = "tie"
    else:
        leader = "gold" if value_gap > 0 else "inr_rd"

    gold_xirr = calculate_xirr(deposit_dates, monthly_amount, end_date, gold_final)
    rd_xirr = calculate_xirr(deposit_dates, monthly_amount, end_date, rd_final)
    xirr_gap_points = (
        None if gold_xirr is None or rd_xirr is None else (gold_xirr - rd_xirr) * 100
    )

    cheapest_index = int(np.argmin(paid_prices))
    priciest_index = int(np.argmax(paid_prices))
    first_deposit = deposit_dates[0]

    summary = {
        "installment_count": installment_count,
        "total_invested_inr": total_invested,
        "first_deposit_date": first_deposit.date().isoformat(),
        "last_deposit_date": deposit_dates[-1].date().isoformat(),
        "holding_years": (end_date - first_deposit) / pd.Timedelta(days=1) / DAYS_PER_YEAR,
        "gold": {
            "total_grams": total_grams,
            "average_cost_per_gram": total_invested / total_grams,
            "current_price_per_gram": end_price,
            "purchase_charge_pct": (purchase_cost_multiplier - 1.0) * 100,
            "current_value_inr": gold_final,
            "gain_inr": gold_final - total_invested,
            "return_pct": to_percent(gold_final / total_invested - 1.0),
            "xirr_pct": to_percent(gold_xirr),
            "cheapest_purchase": {
                "date": schedule["buy_date"].iloc[cheapest_index].date().isoformat(),
                "price_per_gram": float(paid_prices[cheapest_index]),
            },
            "priciest_purchase": {
                "date": schedule["buy_date"].iloc[priciest_index].date().isoformat(),
                "price_per_gram": float(paid_prices[priciest_index]),
            },
            # How much more gold the chosen rule bought than buying on the
            # first trading day. Zero when that is the chosen rule.
            "timing_edge_pct": to_percent(total_grams / first_day_grams - 1.0),
        },
        "inr_rd": {
            "total_deposited_inr": total_invested,
            "maturity_value_inr": rd_final,
            "interest_earned_inr": rd_final - total_invested,
            "return_pct": to_percent(rd_final / total_invested - 1.0),
            "xirr_pct": to_percent(rd_xirr),
        },
        "comparison": {
            "leader": leader,
            "final_value_gap_inr": value_gap,
            "gap_pct_of_invested": finite_or_none(gap_pct_of_invested),
            "gold_to_rd_value_ratio": finite_or_none(gold_final / rd_final),
            "xirr_gap_points": finite_or_none(xirr_gap_points),
            "break_even_rd_rate_pct": to_percent(
                calculate_break_even_rd_rate(
                    gold_final, deposit_dates, end_date, monthly_amount, compounding
                )
            ),
            "share_of_installments_gold_ahead_pct": float(
                (gold_value_each > rd_value_each).mean() * 100
            ),
            "share_of_days_gold_ahead_pct": calculate_share_of_days_gold_ahead_pct(timeline),
            **find_lead_extremes(timeline),
        },
    }

    installment_rows = [
        {
            "month": schedule["month"].iloc[index],
            "rd_deposit_date": deposit_dates[index].date().isoformat(),
            "gold_buy_date": schedule["buy_date"].iloc[index].date().isoformat(),
            "market_price_per_gram": round(float(schedule["market_price"].iloc[index]), PRICE_DECIMALS),
            "price_paid_per_gram": round(float(paid_prices[index]), PRICE_DECIMALS),
            "grams_bought": round(float(grams_bought[index]), GRAM_DECIMALS),
            "gold_value_now": round(float(gold_value_each[index]), VALUE_DECIMALS),
            "rd_value_now": round(float(rd_value_each[index]), VALUE_DECIMALS),
            "gold_ahead": bool(gold_value_each[index] > rd_value_each[index]),
        }
        for index in range(installment_count)
    ]

    return {
        "summary": summary,
        "installments": installment_rows,
        "year_end_rows": build_year_end_rows(timeline),
        "timeline": {"points": _round_timeline_rows(thin_to_weekly(timeline))},
    }


def _execute_monthly_comparison(
    run_id: str,
    requested_start_date: date | None,
    monthly_investment_inr: float,
    annual_interest_rate_pct: float,
    compounding: str,
    buy_rule: str,
    retail_charge_pct: float,
    artifact_files: dict[str, ArtifactFile],
) -> dict[str, Any]:
    _validate_inputs(
        monthly_investment_inr, annual_interest_rate_pct, compounding, buy_rule
    )

    history = load_aligned_history()
    frame = history.aligned_frame
    warnings: list[str] = []

    start_position = find_start_position(frame, requested_start_date, warnings)
    window_frame = frame.iloc[start_position:].copy()
    first_allowed_date = window_frame.index[0]
    last_available_date = window_frame.index[-1]

    schedule, skipped_months = build_installment_schedule(
        window_frame[GOLD_INR_PER_GRAM_COLUMN],
        first_allowed_date,
        last_available_date,
        buy_rule,
    )

    if schedule.empty:
        raise SavingsError(
            "No month in the chosen range has a finished buying window "
            f"(the 1st to the {BUY_WINDOW_LAST_DAY}th). Choose an earlier "
            "start date.",
            http_status_code=422,
        )

    annual_rate = annual_interest_rate_pct / 100
    shared_arguments = {
        "schedule": schedule,
        "window_frame": window_frame,
        "monthly_amount": monthly_investment_inr,
        "annual_rate": annual_rate,
        "compounding": compounding,
    }
    views = {
        VIEW_ORIGINAL: _build_view(purchase_cost_multiplier=1.0, **shared_arguments),
        VIEW_RETAIL: _build_view(
            purchase_cost_multiplier=retail_multiplier(retail_charge_pct),
            **shared_arguments,
        ),
    }

    if history.is_stale:
        warnings.insert(
            0,
            "Fresh market data could not be downloaded, so the most recent "
            f"saved copy from {history.fetched_at.isoformat(timespec='seconds')} "
            "was used.",
        )
    warnings += _describe_skipped_months(skipped_months)
    warnings += build_monthly_caveats(retail_charge_pct, buy_rule)

    request_echo = {
        "requested_start_date": (
            requested_start_date.isoformat() if requested_start_date else None
        ),
        "effective_start_date": first_allowed_date.date().isoformat(),
        "first_deposit_date": views[VIEW_ORIGINAL]["summary"]["first_deposit_date"],
        "end_date": last_available_date.date().isoformat(),
        "monthly_investment_inr": monthly_investment_inr,
        "annual_interest_rate_pct": annual_interest_rate_pct,
        "compounding": compounding,
        "buy_rule": buy_rule,
        "buy_window": f"1st to {BUY_WINDOW_LAST_DAY}th of each month",
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
        for artifact in (
            build_monthly_installments_artifact(view["installments"], view_name),
            build_monthly_timeline_artifact(view["timeline"]["points"], view_name),
        ):
            artifact_files[artifact["filename"]] = artifact

    report_artifact = build_monthly_report_artifact(
        run_id=run_id,
        request_parameters=request_echo,
        views=views,
        skipped_months=skipped_months,
        warnings=warnings,
    )
    artifact_files[report_artifact["filename"]] = report_artifact

    logger.info(
        "run=%s monthly savings complete installments=%d amount=%s rule=%s "
        "retail_charge=%s leader original=%s retail=%s",
        run_id,
        len(schedule),
        monthly_investment_inr,
        buy_rule,
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
        "skipped_months": skipped_months,
        "warnings": warnings,
        "metadata": build_run_metadata(artifact_files),
    }


def run_monthly_savings_comparison(
    start_date: date | None = None,
    monthly_investment_inr: float = DEFAULT_MONTHLY_INVESTMENT_INR,
    annual_interest_rate_pct: float = DEFAULT_ANNUAL_INTEREST_RATE_PCT,
    compounding: str = DEFAULT_COMPOUNDING,
    buy_rule: str = DEFAULT_BUY_RULE,
    retail_charge_pct: float = DEFAULT_RETAIL_CHARGE_PCT,
) -> dict[str, Any]:
    try:
        retail_charge_pct = validate_retail_charge_pct(retail_charge_pct)
    except ValueError as exc:
        raise SavingsError(str(exc), http_status_code=422) from exc

    run_id = str(uuid4())
    artifact_files: dict[str, ArtifactFile] = {}

    try:
        return _execute_monthly_comparison(
            run_id,
            start_date,
            monthly_investment_inr,
            annual_interest_rate_pct,
            compounding,
            buy_rule,
            retail_charge_pct,
            artifact_files,
        )
    except SavingsError as exc:
        exc.run_metadata = build_run_metadata(artifact_files)
        raise
    except Exception as exc:
        logger.exception("run=%s unexpected monthly savings failure", run_id)
        error = SavingsError(
            "The comparison could not be completed because of an internal "
            "error. Details were written to the server log.",
            http_status_code=500,
        )
        error.run_metadata = build_run_metadata(artifact_files)
        raise error from exc

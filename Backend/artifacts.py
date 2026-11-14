"""
Run artifacts: the intermediate datasets and the text report produced
during a GoldInfo run.

Every artifact is a plain-text file delivered inline in the API response so
that someone can inspect the data behind the model's interpretation.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Mapping, TypedDict

from conversion import TROY_OUNCE_GRAMS
from market_data import GoldHistory, UsdInrHistory

CSV_MEDIA_TYPE = "text/csv"
TEXT_MEDIA_TYPE = "text/plain"

FILENAME_GOLD_USD_PER_OUNCE = "gold_usd_per_ounce.csv"
FILENAME_GOLD_USD_PER_GRAM = "gold_usd_per_gram.csv"
FILENAME_USD_INR = "usd_inr.csv"
FILENAME_GOLD_INR_PER_OUNCE = "gold_inr_per_ounce.csv"
FILENAME_GOLD_INR_PER_GRAM = "gold_inr_per_gram.csv"
FILENAME_GOLD_INR_PER_OUNCE_RETAIL = "gold_inr_per_ounce_retail.csv"
FILENAME_GOLD_INR_PER_GRAM_RETAIL = "gold_inr_per_gram_retail.csv"
FILENAME_ANALYSIS_REPORT = "analysis.txt"

ARTIFACT_FILENAME_ORDER = [
    FILENAME_GOLD_USD_PER_OUNCE,
    FILENAME_GOLD_USD_PER_GRAM,
    FILENAME_USD_INR,
    FILENAME_GOLD_INR_PER_OUNCE,
    FILENAME_GOLD_INR_PER_GRAM,
    FILENAME_GOLD_INR_PER_OUNCE_RETAIL,
    FILENAME_GOLD_INR_PER_GRAM_RETAIL,
    FILENAME_ANALYSIS_REPORT,
]

NOT_AVAILABLE_TEXT = "not available"


class ArtifactFile(TypedDict):
    filename: str
    media_type: str
    description: str
    row_count: int | None
    content: str


def _build_csv_artifact(
    *,
    filename: str,
    description: str,
    column_names: list[str],
    rows: list[dict[str, Any]],
) -> ArtifactFile:
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=column_names,
        extrasaction="ignore",
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(rows)

    return {
        "filename": filename,
        "media_type": CSV_MEDIA_TYPE,
        "description": description,
        "row_count": len(rows),
        "content": buffer.getvalue(),
    }


# ---------------------------------------------------------------------------
# Source datasets (available right after retrieval)
# ---------------------------------------------------------------------------

def build_gold_usd_per_ounce_artifact(
    gold_history: GoldHistory,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_GOLD_USD_PER_OUNCE,
        description=(
            f"Gold closing price in USD per troy ounce "
            f"({gold_history['ticker']}), all retrieved dates, "
            "before alignment with USD/INR."
        ),
        column_names=["date", "gold_usd_per_ounce"],
        rows=[
            {
                "date": observation["date"],
                "gold_usd_per_ounce": observation["close"],
            }
            for observation in gold_history["observations"]
        ],
    )


def build_gold_usd_per_gram_artifact(
    gold_history: GoldHistory,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_GOLD_USD_PER_GRAM,
        description=(
            "Gold closing price in USD per gram, derived as USD per "
            f"troy ounce divided by {TROY_OUNCE_GRAMS} grams. Uses all "
            "retrieved gold dates."
        ),
        column_names=["date", "gold_usd_per_gram"],
        rows=[
            {
                "date": observation["date"],
                "gold_usd_per_gram": (
                    observation["close"] / TROY_OUNCE_GRAMS
                ),
            }
            for observation in gold_history["observations"]
        ],
    )


def build_usd_inr_artifact(
    usd_inr_history: UsdInrHistory,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_USD_INR,
        description=(
            f"USD/INR exchange rate ({usd_inr_history['ticker']}), "
            "expressed as INR per 1 USD, all retrieved dates, before "
            "alignment with gold."
        ),
        column_names=["date", "inr_per_usd"],
        rows=[
            {
                "date": observation["date"],
                "inr_per_usd": observation["close"],
            }
            for observation in usd_inr_history["observations"]
        ],
    )


# ---------------------------------------------------------------------------
# Derived datasets (available after conversion)
# ---------------------------------------------------------------------------

def build_gold_inr_per_ounce_artifact(
    converted_data: Mapping[str, Any],
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_GOLD_INR_PER_OUNCE,
        description=(
            "Gold in INR per troy ounce on dates present in both source "
            "series (inner join, no interpolation). Shows the USD price "
            "and exchange rate used for each date."
        ),
        column_names=[
            "date",
            "gold_usd_per_ounce",
            "inr_per_usd",
            "gold_inr_per_ounce",
        ],
        rows=converted_data["gold_inr_per_ounce"],
    )


def build_gold_inr_per_gram_artifact(
    converted_data: Mapping[str, Any],
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_GOLD_INR_PER_GRAM,
        description=(
            "Gold in INR per gram on aligned dates. This is the dataset "
            "all statistics in analysis.txt are calculated from."
        ),
        column_names=[
            "date",
            "gold_inr_per_ounce",
            "gold_inr_per_gram",
        ],
        rows=converted_data["gold_inr_per_gram"],
    )


def build_gold_inr_per_ounce_retail_artifact(
    retail_data: Mapping[str, Any],
    retail_charge_pct: float,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_GOLD_INR_PER_OUNCE_RETAIL,
        description=(
            "Gold in INR per troy ounce with the "
            f"{retail_charge_pct:g} percent retail charge added. The USD "
            "price and exchange rate are the original market values."
        ),
        column_names=[
            "date",
            "gold_usd_per_ounce",
            "inr_per_usd",
            "gold_inr_per_ounce",
        ],
        rows=retail_data["gold_inr_per_ounce"],
    )


def build_gold_inr_per_gram_retail_artifact(
    retail_data: Mapping[str, Any],
    retail_charge_pct: float,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=FILENAME_GOLD_INR_PER_GRAM_RETAIL,
        description=(
            "Gold in INR per gram with the "
            f"{retail_charge_pct:g} percent retail charge added. The "
            "retail statistics in analysis.txt are calculated from this."
        ),
        column_names=[
            "date",
            "gold_inr_per_ounce",
            "gold_inr_per_gram",
        ],
        rows=retail_data["gold_inr_per_gram"],
    )


# ---------------------------------------------------------------------------
# Text report
# ---------------------------------------------------------------------------

def _format_report_value(value: Any) -> str:
    if value is None:
        return NOT_AVAILABLE_TEXT
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def build_analysis_report_artifact(
    *,
    run_id: str,
    run_started_at: str,
    request_parameters: Mapping[str, Any],
    analysis: Mapping[str, Any],
    dataset_metadata: Mapping[str, Mapping[str, Any]] | None,
    interpretation: str | None,
    retail_charge_pct: float | None = None,
    retail_analysis: Mapping[str, Any] | None = None,
    retail_dataset_metadata: Mapping[str, Mapping[str, Any]] | None = None,
    retail_interpretation: str | None = None,
) -> ArtifactFile:
    lines: list[str] = [
        "GOLDINFO ANALYSIS REPORT",
        "========================",
        f"Run ID: {run_id}",
        f"Run started: {run_started_at}",
        "Report generated: "
        f"{datetime.now().isoformat(timespec='seconds')}",
        "",
        "REQUEST",
        "-------",
    ]

    for name, value in request_parameters.items():
        lines.append(f"{name}: {_format_report_value(value)}")

    lines += [
        "",
        "DATA SOURCES AND UNITS",
        "----------------------",
        f"Conversion constant: 1 troy ounce = {TROY_OUNCE_GRAMS} grams",
    ]

    for dataset in (dataset_metadata or {}).values():
        lines += [
            "",
            str(dataset.get("name", "Dataset")),
            f"  source: {dataset.get('source')}",
            f"  ticker: {dataset.get('ticker')}",
            f"  unit: {dataset.get('unit')}",
            f"  coverage: {dataset.get('first_observation_date')} to "
            f"{dataset.get('last_observation_date')}",
            f"  observations: {dataset.get('observation_count')}",
        ]

    lines += [
        "",
        "CALCULATED STATISTICS (INR per gram, calculated by Python)",
        "-----------------------------------------------------------",
    ]

    for name, value in analysis.items():
        lines.append(f"{name}: {_format_report_value(value)}")

    lines += [
        "",
        "MODEL INTERPRETATION (ORIGINAL)",
        "-------------------------------",
        interpretation
        if interpretation
        else "Not generated yet for this report.",
        "",
    ]

    if retail_analysis is not None:
        lines += [
            "RETAIL VIEW",
            "===========",
            f"A flat {retail_charge_pct:g} percent retail charge is added to "
            "every INR price. Percentage changes are the same as in the "
            "original view; only rupee prices differ.",
            "",
        ]
        for dataset in (retail_dataset_metadata or {}).values():
            lines += [
                str(dataset.get("name", "Dataset")),
                f"  unit: {dataset.get('unit')}",
            ]
        lines += [
            "",
            "CALCULATED STATISTICS, RETAIL (INR per gram)",
            "--------------------------------------------",
        ]
        for name, value in retail_analysis.items():
            lines.append(f"{name}: {_format_report_value(value)}")
        lines += [
            "",
            "MODEL INTERPRETATION (RETAIL)",
            "-----------------------------",
            retail_interpretation
            if retail_interpretation
            else "Not generated yet for this report.",
            "",
        ]

    return {
        "filename": FILENAME_ANALYSIS_REPORT,
        "media_type": TEXT_MEDIA_TYPE,
        "description": (
            "Run parameters, data sources, calculated statistics, and "
            "the model's interpretation in one readable report."
        ),
        "row_count": None,
        "content": "\n".join(lines),
    }


# ---------------------------------------------------------------------------
# Response metadata
# ---------------------------------------------------------------------------

def build_run_metadata(
    artifact_files: Mapping[str, ArtifactFile],
) -> dict[str, Any]:
    """Return every artifact produced so far, in a stable order."""

    ordered_files = [
        artifact_files[filename]
        for filename in ARTIFACT_FILENAME_ORDER
        if filename in artifact_files
    ]

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "file_count": len(ordered_files),
        "files": ordered_files,
    }



# ---------------------------------------------------------------------------
# Forecast artifacts
# ---------------------------------------------------------------------------

FILENAME_FORECAST_REPORT = "forecast_report.txt"

ARTIFACT_FILENAME_ORDER += [
    "forecast_training_weekly.csv",
    "forecast_weekly.csv",
    "forecast_training_daily.csv",
    "forecast_daily.csv",
    "forecast_retail_weekly.csv",
    "forecast_retail_daily.csv",
    FILENAME_FORECAST_REPORT,
]


def build_forecast_training_artifact(
    training_rows: list[dict[str, Any]],
    series_keys: tuple[str, ...],
    frequency: str,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=f"forecast_training_{frequency}.csv",
        description=(
            f"The {frequency} series the models were trained on "
            "(aligned gold and USD/INR observations)."
        ),
        column_names=["date", *series_keys],
        rows=training_rows,
    )


def build_forecast_points_artifact(
    forecast_points: list[Mapping[str, Any]],
    series_keys: tuple[str, ...],
    interval_level: float,
    frequency: str,
) -> ArtifactFile:
    column_names = ["step", "date"]
    for series_key in series_keys:
        column_names += [series_key, f"{series_key}_lower", f"{series_key}_upper"]

    rows: list[dict[str, Any]] = []
    for forecast_point in forecast_points:
        row: dict[str, Any] = {
            "step": forecast_point["step"],
            "date": forecast_point["date"],
        }
        for series_key in series_keys:
            bounds = forecast_point["bounds"][series_key]
            row[series_key] = forecast_point[series_key]
            row[f"{series_key}_lower"] = bounds["lower"]
            row[f"{series_key}_upper"] = bounds["upper"]
        rows.append(row)

    return _build_csv_artifact(
        filename=f"forecast_{frequency}.csv",
        description=(
            f"{frequency.capitalize()} forecast with a lower and upper bound "
            f"per series ({int(interval_level * 100)} percent interval)."
        ),
        column_names=column_names,
        rows=rows,
    )


def build_forecast_retail_artifact(
    retail_view: Mapping[str, Any],
    gram_key: str,
    interval_level: float,
    frequency: str,
) -> ArtifactFile:
    rows = [
        {
            "step": point["step"],
            "date": point["date"],
            gram_key: point[gram_key],
            f"{gram_key}_lower": point["lower"],
            f"{gram_key}_upper": point["upper"],
        }
        for point in retail_view["forecast_points"]
    ]

    return _build_csv_artifact(
        filename=f"forecast_retail_{frequency}.csv",
        description=(
            f"{frequency.capitalize()} forecast of gold in INR per gram with "
            f"the {retail_view['retail_charge_pct']:g} percent retail charge "
            f"added ({int(interval_level * 100)} percent interval)."
        ),
        column_names=[
            "step",
            "date",
            gram_key,
            f"{gram_key}_lower",
            f"{gram_key}_upper",
        ],
        rows=rows,
    )


def _append_mapping_lines(
    lines: list[str], values: Mapping[str, Any], indent: str = ""
) -> None:
    for name, value in values.items():
        if isinstance(value, Mapping):
            lines.append(f"{indent}{name}:")
            _append_mapping_lines(lines, value, indent + "  ")
        else:
            lines.append(f"{indent}{name}: {_format_report_value(value)}")


def build_forecast_report_artifact(
    *,
    run_id: str,
    request_parameters: Mapping[str, Any],
    data_summary: Mapping[str, Any],
    end_of_horizon: Mapping[str, Mapping[str, Any]],
    model_details: Mapping[str, Any],
    warnings: list[str],
    retail_view: Mapping[str, Any] | None = None,
) -> ArtifactFile:
    lines: list[str] = [
        "GOLDINFO FORECAST REPORT",
        "========================",
        f"Run ID: {run_id}",
        f"Report generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "REQUEST",
        "-------",
    ]
    _append_mapping_lines(lines, request_parameters)

    lines += ["", "DATA USED", "---------"]
    _append_mapping_lines(lines, data_summary)

    lines += ["", "FORECAST AT END OF HORIZON", "--------------------------"]
    _append_mapping_lines(lines, end_of_horizon)

    if retail_view is not None:
        lines += [
            "",
            "FORECAST AT END OF HORIZON, RETAIL (INR per gram)",
            "-------------------------------------------------",
            f"retail_charge_pct: {retail_view['retail_charge_pct']:g}",
        ]
        _append_mapping_lines(lines, retail_view["end_of_horizon"])

    lines += [
        "",
        "METHOD",
        "------",
        f"approach: {model_details['approach']}",
        f"pipeline: {', '.join(model_details['pipeline'])}",
        f"target: {model_details['target']}",
        f"features: {', '.join(model_details['features'])}",
        f"interval_method: {model_details['interval_method']}",
    ]
    _append_mapping_lines(lines, model_details["series"])

    lines += ["", "WALK-FORWARD BACKTEST", "---------------------"]
    backtest = model_details.get("backtest")
    if backtest is None:
        lines.append("Backtest was not available for this run.")
    else:
        lines.append(
            f"Origins: {backtest['origin_count']} (every "
            f"{backtest['step_periods']} {backtest['period_unit']}). "
            "Lower error is better. Naive = no change from the origin "
            "price. Origins overlap, so treat results as indicative."
        )
        for series_name, horizon_results in backtest["results"].items():
            lines.append(series_name)
            for result in horizon_results:
                lines.append(
                    f"  {result['horizon_label']:>9}: model MAPE "
                    f"{result['model_mape_pct']:.2f}%, naive MAPE "
                    f"{result['naive_mape_pct']:.2f}%, model beats naive: "
                    f"{result['model_beats_naive']}"
                )

    lines += ["", "WARNINGS AND CAVEATS", "--------------------"]
    lines += [f"- {warning}" for warning in warnings]
    lines.append("")

    return {
        "filename": FILENAME_FORECAST_REPORT,
        "media_type": TEXT_MEDIA_TYPE,
        "description": (
            "Method, data coverage, end-of-horizon forecast, backtest "
            "accuracy against a no-change baseline, and caveats."
        ),
        "row_count": None,
        "content": "\n".join(lines),
    }



# ---------------------------------------------------------------------------
# Savings comparison artifacts
# ---------------------------------------------------------------------------

FILENAME_SAVINGS_TIMELINE = "savings_timeline.csv"
FILENAME_SAVINGS_TIMELINE_RETAIL = "savings_timeline_retail.csv"
FILENAME_SAVINGS_REPORT = "savings_report.txt"

ARTIFACT_FILENAME_ORDER += [
    FILENAME_SAVINGS_TIMELINE,
    FILENAME_SAVINGS_TIMELINE_RETAIL,
    FILENAME_SAVINGS_REPORT,
]


def build_savings_timeline_artifact(
    timeline_rows: list[dict[str, Any]],
    view_name: str = "original",
) -> ArtifactFile:
    is_retail = view_name == "retail"
    return _build_csv_artifact(
        filename=(
            FILENAME_SAVINGS_TIMELINE_RETAIL
            if is_retail
            else FILENAME_SAVINGS_TIMELINE
        ),
        description=(
            "Daily value in INR of the gold holding and of the INR savings "
            "balance, from the purchase date to the latest observation. "
            + (
                "Retail view: the gold was bought at the retail price and "
                "is valued at the original price."
                if is_retail
                else "Original view: gold bought and valued at the "
                "converted price."
            )
        ),
        column_names=[
            "date",
            "gold_price_per_gram",
            "gold_value",
            "inr_value",
        ],
        rows=timeline_rows,
    )


def build_savings_report_artifact(
    *,
    run_id: str,
    request_parameters: Mapping[str, Any],
    views: Mapping[str, Mapping[str, Any]],
    warnings: list[str],
) -> ArtifactFile:
    lines: list[str] = [
        "GOLDINFO SAVINGS COMPARISON REPORT",
        "==================================",
        f"Run ID: {run_id}",
        f"Report generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "REQUEST",
        "-------",
    ]
    _append_mapping_lines(lines, request_parameters)

    for view_name, view in views.items():
        heading = f"{view_name.upper()} VIEW"
        lines += ["", heading, "=" * len(heading)]

        lines += ["", "SUMMARY", "-------"]
        _append_mapping_lines(lines, view["summary"])

        lines += ["", "GOLD IN RUPEES VERSUS DOLLARS", "-----------------------------"]
        _append_mapping_lines(lines, view["currency_effect"])

        lines += ["", "CALENDAR YEARS", "--------------"]
        for year_row in view["calendar_years"]:
            partial_note = " (partial year)" if year_row["is_partial_year"] else ""
            lines.append(
                f"{year_row['year']}{partial_note}: gold "
                f"{_format_report_value(year_row['gold_change_pct'])}%, savings "
                f"{_format_report_value(year_row['inr_savings_change_pct'])}%"
            )

        lines += ["", "ROLLING HOLDING PERIODS", "-----------------------"]
        if not view["holding_period_outcomes"]:
            lines.append("The selected range is shorter than every window.")
        for outcome in view["holding_period_outcomes"]:
            lines.append(f"{outcome['years']} years:")
            _append_mapping_lines(
                lines,
                {name: value for name, value in outcome.items() if name != "years"},
                indent="  ",
            )

    lines += ["", "WARNINGS AND CAVEATS", "--------------------"]
    lines += [f"- {warning}" for warning in warnings]
    lines.append("")

    return {
        "filename": FILENAME_SAVINGS_REPORT,
        "media_type": TEXT_MEDIA_TYPE,
        "description": (
            "Inputs, then for the original and the retail view: results, "
            "calendar-year and rolling-window statistics. Caveats at the end."
        ),
        "row_count": None,
        "content": "\n".join(lines),
    }


# ---------------------------------------------------------------------------
# Monthly savings artifacts
# ---------------------------------------------------------------------------

MONTHLY_INSTALLMENT_COLUMNS = [
    "month",
    "rd_deposit_date",
    "gold_buy_date",
    "market_price_per_gram",
    "price_paid_per_gram",
    "grams_bought",
    "gold_value_now",
    "rd_value_now",
]
MONTHLY_TIMELINE_COLUMNS = [
    "date",
    "gold_price_per_gram",
    "invested_inr",
    "rd_value",
    "grams_held",
    "gold_value",
    "average_cost_per_gram",
]


def _monthly_filename(base_name: str, view_name: str) -> str:
    suffix = "_retail" if view_name == "retail" else ""
    return f"{base_name}{suffix}.csv"


ARTIFACT_FILENAME_ORDER += [
    "savings_monthly_installments.csv",
    "savings_monthly_installments_retail.csv",
    "savings_monthly_timeline.csv",
    "savings_monthly_timeline_retail.csv",
    "savings_monthly_report.txt",
]


def build_monthly_installments_artifact(
    installment_rows: list[dict[str, Any]],
    view_name: str,
) -> ArtifactFile:
    is_retail = view_name == "retail"
    return _build_csv_artifact(
        filename=_monthly_filename("savings_monthly_installments", view_name),
        description=(
            "One row per monthly installment: the RD payment date, the day "
            "the gold was bought, prices, grams, and what each installment "
            "is worth on the last date. "
            + (
                "Retail view: price_paid_per_gram includes the retail charge."
                if is_retail
                else "Original view: gold bought at the market price."
            )
        ),
        column_names=MONTHLY_INSTALLMENT_COLUMNS,
        rows=installment_rows,
    )


def build_monthly_timeline_artifact(
    timeline_rows: list[dict[str, Any]],
    view_name: str,
) -> ArtifactFile:
    return _build_csv_artifact(
        filename=_monthly_filename("savings_monthly_timeline", view_name),
        description=(
            "Weekly value of the gold portfolio and the recurring deposit "
            f"({view_name} view), from the first installment to the last date."
        ),
        column_names=MONTHLY_TIMELINE_COLUMNS,
        rows=timeline_rows,
    )


def build_monthly_report_artifact(
    *,
    run_id: str,
    request_parameters: Mapping[str, Any],
    views: Mapping[str, Mapping[str, Any]],
    skipped_months: list[Mapping[str, str]],
    warnings: list[str],
) -> ArtifactFile:
    lines: list[str] = [
        "GOLDINFO MONTHLY SAVINGS REPORT",
        "===============================",
        f"Run ID: {run_id}",
        f"Report generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "REQUEST",
        "-------",
    ]
    _append_mapping_lines(lines, request_parameters)

    if skipped_months:
        lines += ["", "MONTHS LEFT OUT", "---------------"]
        lines += [f"{month['month']}: {month['reason']}" for month in skipped_months]

    for view_name, view in views.items():
        heading = f"{view_name.upper()} VIEW"
        lines += ["", heading, "=" * len(heading), "", "SUMMARY", "-------"]
        _append_mapping_lines(lines, view["summary"])

        lines += ["", "YEAR END", "--------"]
        for year_row in view["year_end_rows"]:
            lines.append(
                f"{year_row['year']} ({year_row['as_of_date']}): invested "
                f"{_format_report_value(year_row['invested_inr'])}, gold "
                f"{_format_report_value(year_row['gold_value'])}, RD "
                f"{_format_report_value(year_row['rd_value'])}"
            )

    lines += ["", "WARNINGS AND CAVEATS", "--------------------"]
    lines += [f"- {warning}" for warning in warnings]
    lines.append("")

    return {
        "filename": "savings_monthly_report.txt",
        "media_type": TEXT_MEDIA_TYPE,
        "description": (
            "Inputs, months left out, then for the original and the retail "
            "view: results and year-end snapshots. Caveats at the end."
        ),
        "row_count": None,
        "content": "\n".join(lines),
    }

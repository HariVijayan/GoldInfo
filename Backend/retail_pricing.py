"""
Retail price view of gold.

The converted price (gold in USD per ounce x USD/INR, per gram) is an
international reference price. A buyer in India pays more: import duty, GST,
making charges, and a dealer spread. This module approximates that with one
flat percentage added on top of the converted INR price.

Only prices in rupees per gram or per ounce are marked up. Gold in USD and
the USD/INR rate are market data and are never changed. Percentage changes
are identical in both views; only rupee amounts differ.

Every pipeline (analysis, forecast, savings) builds the retail view here,
so the screen and the downloadable files cannot disagree.
"""

from __future__ import annotations

import math
from typing import Any, Mapping

DEFAULT_RETAIL_CHARGE_PCT = 15.0
MINIMUM_RETAIL_CHARGE_PCT = 0.0
MAXIMUM_RETAIL_CHARGE_PCT = 100.0

VIEW_ORIGINAL = "original"
VIEW_RETAIL = "retail"


def validate_retail_charge_pct(retail_charge_pct: float) -> float:
    """Return the percentage as a float, or raise ValueError."""

    if isinstance(retail_charge_pct, bool) or not isinstance(
        retail_charge_pct, (int, float)
    ):
        raise ValueError("retail_charge_pct must be a number.")

    if not math.isfinite(retail_charge_pct) or not (
        MINIMUM_RETAIL_CHARGE_PCT
        <= retail_charge_pct
        <= MAXIMUM_RETAIL_CHARGE_PCT
    ):
        raise ValueError(
            f"retail_charge_pct must be between "
            f"{MINIMUM_RETAIL_CHARGE_PCT:g} and "
            f"{MAXIMUM_RETAIL_CHARGE_PCT:g}."
        )

    return float(retail_charge_pct)


def retail_multiplier(retail_charge_pct: float) -> float:
    """1.15 for a 15 percent retail charge."""

    return 1.0 + validate_retail_charge_pct(retail_charge_pct) / 100.0


def format_charge_label(retail_charge_pct: float) -> str:
    """15.0 becomes '15', 12.5 stays '12.5'."""

    return f"{retail_charge_pct:g}"


# ---------------------------------------------------------------------------
# Analysis datasets
# ---------------------------------------------------------------------------

def build_retail_gold_datasets(
    converted_data: Mapping[str, Any],
    retail_charge_pct: float,
) -> dict[str, Any]:
    """
    Retail versions of the two rupee datasets from conversion.py.

    The USD price and the exchange rate on each ounce row are left as they
    are, so a retail ounce row no longer equals USD x INR: the difference
    is exactly the retail charge.
    """

    multiplier = retail_multiplier(retail_charge_pct)
    charge_label = format_charge_label(retail_charge_pct)

    retail_ounce_rows = [
        {**row, "gold_inr_per_ounce": row["gold_inr_per_ounce"] * multiplier}
        for row in converted_data["gold_inr_per_ounce"]
    ]
    retail_gram_rows = [
        {
            "date": row["date"],
            "gold_inr_per_ounce": row["gold_inr_per_ounce"] * multiplier,
            "gold_inr_per_gram": row["gold_inr_per_gram"] * multiplier,
        }
        for row in converted_data["gold_inr_per_gram"]
    ]

    original_metadata = converted_data["metadata"]
    retail_metadata = {
        "gold_inr_per_ounce": {
            **original_metadata["gold_inr_per_ounce"],
            "name": "Gold INR per troy ounce, retail",
            "unit": f"INR/troy ounce (retail, +{charge_label}%)",
        },
        "gold_inr_per_gram": {
            **original_metadata["gold_inr_per_gram"],
            "name": "Gold INR per gram, retail",
            "unit": f"INR/gram (retail, +{charge_label}%)",
        },
    }

    return {
        "gold_inr_per_ounce": retail_ounce_rows,
        "gold_inr_per_gram": retail_gram_rows,
        "metadata": retail_metadata,
    }


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

def build_retail_forecast_view(
    retail_charge_pct: float,
    forecast_points: list[Mapping[str, Any]],
    end_of_horizon_gram: Mapping[str, float],
    history_points: list[Mapping[str, Any]],
    gram_key: str,
) -> dict[str, Any]:
    """
    Retail versions of the INR-per-gram forecast outputs.

    The forecast itself is made on the converted series. A flat multiplier
    leaves every return, and so every model decision, unchanged: the retail
    path is the original path times the multiplier (checked against the real
    models in the project's verification run). Percentage values (change, backtest error) therefore
    stay as they are and are not repeated here.
    """

    multiplier = retail_multiplier(retail_charge_pct)

    return {
        "retail_charge_pct": float(retail_charge_pct),
        "multiplier": multiplier,
        # Aligned with the original points by step number.
        "forecast_points": [
            {
                "step": point["step"],
                "date": point["date"],
                gram_key: point[gram_key] * multiplier,
                "lower": point["bounds"][gram_key]["lower"] * multiplier,
                "upper": point["bounds"][gram_key]["upper"] * multiplier,
            }
            for point in forecast_points
        ],
        "history_points": [
            {"date": point["date"], gram_key: point[gram_key] * multiplier}
            for point in history_points
        ],
        "end_of_horizon": {
            "latest": end_of_horizon_gram["latest"] * multiplier,
            "forecast": end_of_horizon_gram["forecast"] * multiplier,
            "change_pct": end_of_horizon_gram["change_pct"],
            "lower": end_of_horizon_gram["lower"] * multiplier,
            "upper": end_of_horizon_gram["upper"] * multiplier,
        },
        "latest_value": end_of_horizon_gram["latest"] * multiplier,
    }

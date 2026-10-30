"""
Forecast orchestration: retrieve the maximum available history, convert it,
train the models, and assemble the API response and artifacts.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

import numpy as np
import pandas as pd

from artifacts import (
    ArtifactFile,
    build_forecast_points_artifact,
    build_forecast_report_artifact,
    build_forecast_training_artifact,
    build_gold_inr_per_gram_artifact,
    build_gold_inr_per_ounce_artifact,
    build_gold_usd_per_gram_artifact,
    build_gold_usd_per_ounce_artifact,
    build_run_metadata,
    build_usd_inr_artifact,
)
from conversion import TROY_OUNCE_GRAMS, convert_gold_history
from forecasting import (
    FREQUENCY_PROFILES,
    INTERVAL_LEVEL,
    FrequencyProfile,
    build_interval_bounds,
    fit_series_model,
    forecast_log_price_path,
    get_feature_names,
    run_walk_forward_backtest,
)
from market_data import get_gold_history, get_usd_inr_history

logger = logging.getLogger("goldinfo.forecast")

HISTORY_PERIOD = "max"
DEFAULT_FORECAST_HORIZON_WEEKS = 52
MAXIMUM_FORECAST_HORIZON_WEEKS = 104
DEFAULT_FORECAST_FREQUENCY = "weekly"
SUPPORTED_FORECAST_FREQUENCIES = tuple(FREQUENCY_PROFILES)

GOLD_USD_KEY = "gold_usd_per_ounce"
INR_PER_USD_KEY = "inr_per_usd"
GOLD_INR_GRAM_KEY = "gold_inr_per_gram"
SERIES_KEYS = (GOLD_USD_KEY, INR_PER_USD_KEY, GOLD_INR_GRAM_KEY)

STATIC_CAVEATS = [
    "This is a statistical projection from price history only. It does "
    "not model interest rates, central-bank activity, geopolitics or "
    "other drivers of gold and exchange rates. It is not financial advice.",
    "Gold in INR per gram is derived from the gold (USD per ounce) and "
    "USD/INR forecasts using the same conversion as the historical data, "
    "so the three forecasts are always consistent with each other.",
    "Bounds are an 80 percent interval estimated from out-of-sample "
    "one-step errors and widen with the square root of the horizon.",
]

DAILY_CAVEAT = (
    "Daily forecasts use business days (Monday to Friday) and ignore "
    "market holidays. The line shows the expected trend: day-to-day "
    "moves are largely unpredictable, so the real price will zig-zag "
    "around it within the shaded range."
)


class ForecastError(Exception):
    """Expected forecast failure. Carries any artifacts produced so far."""

    def __init__(self, message: str, http_status_code: int = 502):
        super().__init__(message)
        self.http_status_code = http_status_code
        self.run_metadata: dict[str, Any] | None = None


def _build_training_frame(
    converted_data: dict[str, Any], profile: FrequencyProfile
) -> pd.DataFrame:
    daily_frame = pd.DataFrame(converted_data["gold_inr_per_ounce"])
    daily_frame["date"] = pd.to_datetime(daily_frame["date"])
    daily_frame = daily_frame.set_index("date").sort_index()
    daily_frame[GOLD_INR_GRAM_KEY] = (
        daily_frame["gold_inr_per_ounce"] / TROY_OUNCE_GRAMS
    )
    selected_columns = daily_frame[list(SERIES_KEYS)]

    training_frame = (
        selected_columns.resample("W-FRI").last().dropna()
        if profile.name == "weekly"
        else selected_columns.dropna()
    )

    if len(training_frame) < profile.minimum_observations:
        raise ForecastError(
            f"Only {len(training_frame)} {profile.name} observations are "
            f"available; at least {profile.minimum_observations} are "
            "required.",
            http_status_code=502,
        )

    return training_frame


def _build_forecast_dates(
    last_observation_date: pd.Timestamp,
    steps: int,
    profile: FrequencyProfile,
) -> list[str]:
    if profile.name == "weekly":
        return [
            (last_observation_date + timedelta(weeks=step)).date().isoformat()
            for step in range(1, steps + 1)
        ]

    business_days = pd.bdate_range(
        last_observation_date + timedelta(days=1), periods=steps
    )
    return [business_day.date().isoformat() for business_day in business_days]


def _assert_all_finite(values: dict[str, np.ndarray]) -> None:
    for series_name, series_values in values.items():
        if not np.all(np.isfinite(series_values)):
            raise ForecastError(
                f"The model produced non-finite values for {series_name}.",
                http_status_code=500,
            )


def _execute_forecast(
    run_id: str,
    horizon_weeks: int,
    profile: FrequencyProfile,
    artifact_files: dict[str, ArtifactFile],
) -> dict[str, Any]:
    def keep(artifact: ArtifactFile) -> None:
        artifact_files[artifact["filename"]] = artifact

    steps = horizon_weeks * profile.steps_per_week

    # 1. Retrieve the maximum history Yahoo Finance offers.
    logger.info("run=%s retrieving maximum history", run_id)
    try:
        gold_history = get_gold_history(period=HISTORY_PERIOD)
        usd_inr_history = get_usd_inr_history(period=HISTORY_PERIOD)
    except RuntimeError as exc:
        raise ForecastError(f"Market data retrieval failed: {exc}") from exc

    keep(build_gold_usd_per_ounce_artifact(gold_history))
    keep(build_gold_usd_per_gram_artifact(gold_history))
    keep(build_usd_inr_artifact(usd_inr_history))

    # 2. Convert and align (same logic as the analysis flow).
    logger.info("run=%s converting and aligning", run_id)
    try:
        converted_data = convert_gold_history(
            gold_history=gold_history,
            usd_inr_history=usd_inr_history,
            requested_period=HISTORY_PERIOD,
        )
    except (ValueError, RuntimeError) as exc:
        raise ForecastError(f"Data conversion failed: {exc}") from exc

    keep(build_gold_inr_per_ounce_artifact(converted_data))
    keep(build_gold_inr_per_gram_artifact(converted_data))

    # 3. Training data at the requested frequency.
    training_frame = _build_training_frame(converted_data, profile)
    training_rows = [
        {
            "date": period_end.date().isoformat(),
            **{key: float(row[key]) for key in SERIES_KEYS},
        }
        for period_end, row in training_frame.iterrows()
    ]
    keep(build_forecast_training_artifact(training_rows, SERIES_KEYS, profile.name))

    gold_prices = training_frame[GOLD_USD_KEY].to_numpy()
    fx_prices = training_frame[INR_PER_USD_KEY].to_numpy()
    gold_log_prices = np.log(gold_prices)
    fx_log_prices = np.log(fx_prices)

    # 4. Train and forecast the two market series, derive INR per gram.
    logger.info(
        "run=%s training %s models on %d observations",
        run_id,
        profile.name,
        len(training_frame),
    )
    gold_model = fit_series_model(gold_log_prices, profile)
    fx_model = fit_series_model(fx_log_prices, profile)

    gold_future_log = forecast_log_price_path(
        gold_model, gold_log_prices, steps, profile
    )
    fx_future_log = forecast_log_price_path(
        fx_model, fx_log_prices, steps, profile
    )
    gram_future_log = gold_future_log + fx_future_log - np.log(TROY_OUNCE_GRAMS)

    gold_residuals = gold_model.out_of_fold_residuals
    fx_residuals = fx_model.out_of_fold_residuals
    if gold_residuals is None or fx_residuals is None:
        raise ForecastError("Residual estimation failed.", 500)

    residual_std = {
        GOLD_USD_KEY: float(np.std(gold_residuals)),
        INR_PER_USD_KEY: float(np.std(fx_residuals)),
        GOLD_INR_GRAM_KEY: float(np.std(gold_residuals + fx_residuals)),
    }
    future_log = {
        GOLD_USD_KEY: gold_future_log,
        INR_PER_USD_KEY: fx_future_log,
        GOLD_INR_GRAM_KEY: gram_future_log,
    }

    forecast_prices: dict[str, np.ndarray] = {}
    lower_bounds: dict[str, np.ndarray] = {}
    upper_bounds: dict[str, np.ndarray] = {}
    for key in SERIES_KEYS:
        forecast_prices[key] = np.exp(future_log[key])
        lower_bounds[key], upper_bounds[key] = build_interval_bounds(
            future_log[key], residual_std[key]
        )

    _assert_all_finite(forecast_prices)
    _assert_all_finite(lower_bounds)
    _assert_all_finite(upper_bounds)

    # 5. Forecast points: three values each, plus bounds.
    last_observation_date = pd.Timestamp(
        converted_data["gold_inr_per_gram"][-1]["date"]
    )
    forecast_dates = _build_forecast_dates(last_observation_date, steps, profile)
    forecast_points = [
        {
            "step": step,
            "date": forecast_dates[step - 1],
            **{key: float(forecast_prices[key][step - 1]) for key in SERIES_KEYS},
            "bounds": {
                key: {
                    "lower": float(lower_bounds[key][step - 1]),
                    "upper": float(upper_bounds[key][step - 1]),
                }
                for key in SERIES_KEYS
            },
        }
        for step in range(1, steps + 1)
    ]

    latest_row = training_frame.iloc[-1]
    latest_values = {key: float(latest_row[key]) for key in SERIES_KEYS}
    end_of_horizon = {
        key: {
            "latest": latest_values[key],
            "forecast": float(forecast_prices[key][-1]),
            "change_pct": float(
                (forecast_prices[key][-1] / latest_values[key] - 1) * 100
            ),
            "lower": float(lower_bounds[key][-1]),
            "upper": float(upper_bounds[key][-1]),
        }
        for key in SERIES_KEYS
    }

    # 6. Backtest. A failure here must not discard the forecast.
    logger.info("run=%s running walk-forward backtest", run_id)
    try:
        backtest = run_walk_forward_backtest(
            gold_prices, fx_prices, TROY_OUNCE_GRAMS, profile
        )
    except Exception:
        logger.exception("run=%s backtest failed", run_id)
        backtest = None

    warnings = list(STATIC_CAVEATS)
    if profile.name == "daily":
        warnings.insert(0, DAILY_CAVEAT)
    if backtest is None:
        warnings.insert(0, "Backtest accuracy could not be computed.")
    else:
        for key, horizon_results in backtest["results"].items():
            longest = horizon_results[-1]
            if not longest["model_beats_naive"]:
                warnings.insert(
                    0,
                    f"For {key}, the model did not beat a no-change "
                    f"baseline at {longest['horizon_label']} in the "
                    "backtest. Treat its long-range path with caution.",
                )

    model_details = {
        "approach": (
            f"Recursive {profile.name} forecast of log returns with "
            "scikit-learn"
        ),
        "frequency": profile.name,
        "pipeline": ["StandardScaler", "RidgeCV (TimeSeriesSplit)"],
        "target": f"next-{'day' if profile.name == 'daily' else 'week'} log return",
        "features": get_feature_names(profile),
        "interval_method": (
            f"{int(INTERVAL_LEVEL * 100)}% interval: out-of-sample "
            "one-step residual std x sqrt(steps ahead)"
        ),
        "series": {
            GOLD_USD_KEY: {
                "selected_alpha": gold_model.selected_alpha,
                "training_rows": gold_model.training_row_count,
                "one_step_residual_std": residual_std[GOLD_USD_KEY],
            },
            INR_PER_USD_KEY: {
                "selected_alpha": fx_model.selected_alpha,
                "training_rows": fx_model.training_row_count,
                "one_step_residual_std": residual_std[INR_PER_USD_KEY],
            },
            GOLD_INR_GRAM_KEY: {
                "derived_from": f"{GOLD_USD_KEY} x {INR_PER_USD_KEY} / "
                f"{TROY_OUNCE_GRAMS}",
                "one_step_residual_std": residual_std[GOLD_INR_GRAM_KEY],
            },
        },
        "backtest": backtest,
    }

    data_summary = {
        "history_period_requested": HISTORY_PERIOD,
        "aligned_daily_observations": len(converted_data["gold_inr_per_gram"]),
        "training_frequency": profile.name,
        "observations_used": len(training_frame),
        "history_start": training_frame.index[0].date().isoformat(),
        "history_end": last_observation_date.date().isoformat(),
        "latest_values": latest_values,
    }
    request_parameters = {
        "horizon_weeks": horizon_weeks,
        "frequency": profile.name,
        "history_period": HISTORY_PERIOD,
    }

    # 7. Forecast artifacts.
    keep(
        build_forecast_points_artifact(
            forecast_points, SERIES_KEYS, INTERVAL_LEVEL, profile.name
        )
    )
    keep(
        build_forecast_report_artifact(
            run_id=run_id,
            request_parameters=request_parameters,
            data_summary=data_summary,
            end_of_horizon=end_of_horizon,
            model_details=model_details,
            warnings=warnings,
        )
    )

    logger.info("run=%s forecast complete", run_id)

    return {
        "status": "success",
        "run_id": run_id,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "request": request_parameters,
        "data_summary": data_summary,
        "forecast": {
            "frequency": profile.name,
            "horizon_weeks": horizon_weeks,
            "steps": steps,
            "interval_level": INTERVAL_LEVEL,
            "start_date": forecast_points[0]["date"],
            "end_date": forecast_points[-1]["date"],
            "points": forecast_points,
            "end_of_horizon": end_of_horizon,
        },
        "history": {"points": training_rows[-profile.chart_history_steps :]},
        "model": model_details,
        "warnings": warnings,
        "metadata": build_run_metadata(artifact_files),
    }


def run_forecast(
    horizon_weeks: int = DEFAULT_FORECAST_HORIZON_WEEKS,
    frequency: str = DEFAULT_FORECAST_FREQUENCY,
) -> dict[str, Any]:
    if not 1 <= horizon_weeks <= MAXIMUM_FORECAST_HORIZON_WEEKS:
        raise ForecastError(
            "horizon_weeks must be between 1 and "
            f"{MAXIMUM_FORECAST_HORIZON_WEEKS}.",
            http_status_code=422,
        )
    if frequency not in FREQUENCY_PROFILES:
        raise ForecastError(
            f"frequency must be one of {', '.join(SUPPORTED_FORECAST_FREQUENCIES)}.",
            http_status_code=422,
        )

    profile = FREQUENCY_PROFILES[frequency]
    run_id = str(uuid4())
    artifact_files: dict[str, ArtifactFile] = {}

    try:
        return _execute_forecast(run_id, horizon_weeks, profile, artifact_files)
    except ForecastError as exc:
        exc.run_metadata = build_run_metadata(artifact_files)
        raise
    except Exception as exc:
        logger.exception("run=%s unexpected forecast failure", run_id)
        error = ForecastError(
            "The forecast could not be completed because of an internal "
            "error. Details were written to the server log.",
            http_status_code=500,
        )
        error.run_metadata = build_run_metadata(artifact_files)
        raise error from exc

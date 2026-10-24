"""
Price forecasting with scikit-learn, for weekly or daily steps.

Pure modelling code: no network access and no knowledge of the API layer.

Approach
--------
For one price series the target is the next period's log return. Features
are computed only from information available at the end of the current
period (lagged returns, rolling mean and volatility, distance from a long
moving average, medium-term momentum). A StandardScaler + RidgeCV pipeline
(alpha chosen with time-ordered cross-validation) predicts the next return,
and the forecast is produced recursively: each predicted price is appended
to the history and the features are recomputed for the following period.

A FrequencyProfile holds every window length that depends on the step size,
so weekly and daily forecasts share exactly the same code.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

CROSS_VALIDATION_SPLITS = 5
RIDGE_ALPHA_CANDIDATES = np.logspace(-1, 4, 16)
MAX_RETURN_STD_MULTIPLE = 4.0

INTERVAL_LEVEL = 0.8
INTERVAL_Z_SCORE = 1.2815515655446004  # two-sided 80 percent


@dataclass(frozen=True)
class FrequencyProfile:
    name: str
    period_unit: str
    steps_per_week: int
    return_lags: tuple[int, ...]
    return_mean_windows: tuple[int, ...]
    return_volatility_windows: tuple[int, ...]
    mean_reversion_window: int
    momentum_window: int
    backtest_horizons: tuple[tuple[int, str], ...]
    backtest_step: int
    backtest_max_origins: int
    backtest_min_training: int
    minimum_observations: int
    chart_history_steps: int

    @property
    def recent_window_length(self) -> int:
        """History needed to compute the latest feature row."""
        return self.mean_reversion_window + 30


WEEKLY_PROFILE = FrequencyProfile(
    name="weekly",
    period_unit="weeks",
    steps_per_week=1,
    return_lags=(1, 2, 3, 4, 8, 13),
    return_mean_windows=(4, 13, 26),
    return_volatility_windows=(4, 13),
    mean_reversion_window=52,
    momentum_window=26,
    backtest_horizons=((4, "1 month"), (13, "3 months"), (26, "6 months"), (52, "1 year")),
    backtest_step=26,
    backtest_max_origins=16,
    backtest_min_training=156,
    minimum_observations=156,
    chart_history_steps=156,
)

DAILY_PROFILE = FrequencyProfile(
    name="daily",
    period_unit="trading days",
    steps_per_week=5,
    return_lags=(1, 2, 3, 5, 10, 21),
    return_mean_windows=(5, 21, 63),
    return_volatility_windows=(5, 21),
    mean_reversion_window=252,
    momentum_window=126,
    backtest_horizons=(
        (5, "1 week"),
        (21, "1 month"),
        (63, "3 months"),
        (126, "6 months"),
        (260, "1 year"),
    ),
    backtest_step=126,
    backtest_max_origins=16,
    backtest_min_training=756,
    minimum_observations=780,
    chart_history_steps=780,
)

FREQUENCY_PROFILES = {
    WEEKLY_PROFILE.name: WEEKLY_PROFILE,
    DAILY_PROFILE.name: DAILY_PROFILE,
}


@dataclass(frozen=True)
class FittedSeriesModel:
    pipeline: Pipeline
    selected_alpha: float
    out_of_fold_residuals: np.ndarray | None
    maximum_return_magnitude: float
    training_row_count: int


def get_feature_names(profile: FrequencyProfile) -> list[str]:
    return (
        [f"return_lag_{lag}" for lag in profile.return_lags]
        + [f"return_mean_{window}" for window in profile.return_mean_windows]
        + [
            f"return_volatility_{window}"
            for window in profile.return_volatility_windows
        ]
        + [
            f"log_price_vs_{profile.mean_reversion_window}_mean",
            f"log_price_change_{profile.momentum_window}",
        ]
    )


def compute_feature_frame(
    log_prices: np.ndarray, profile: FrequencyProfile
) -> pd.DataFrame:
    """Causal features: row t only uses log prices up to and including t."""

    log_series = pd.Series(log_prices, dtype="float64")
    returns = log_series.diff()

    columns: dict[str, pd.Series] = {}
    for lag in profile.return_lags:
        columns[f"return_lag_{lag}"] = returns.shift(lag - 1)
    for window in profile.return_mean_windows:
        columns[f"return_mean_{window}"] = returns.rolling(window).mean()
    for window in profile.return_volatility_windows:
        columns[f"return_volatility_{window}"] = returns.rolling(window).std()
    columns[f"log_price_vs_{profile.mean_reversion_window}_mean"] = (
        log_series - log_series.rolling(profile.mean_reversion_window).mean()
    )
    columns[f"log_price_change_{profile.momentum_window}"] = (
        log_series - log_series.shift(profile.momentum_window)
    )

    return pd.DataFrame(columns)[get_feature_names(profile)]


def compute_latest_feature_row(
    recent_log_prices: np.ndarray, profile: FrequencyProfile
) -> np.ndarray:
    """
    Features for the final period only, in plain numpy.

    Mirrors compute_feature_frame(...).iloc[-1] exactly (checked in the
    smoke test) but is far faster, which matters for the recursive loop.
    """

    returns = np.diff(recent_log_prices)

    latest_features = [returns[-lag] for lag in profile.return_lags]
    latest_features += [
        returns[-window:].mean() for window in profile.return_mean_windows
    ]
    latest_features += [
        returns[-window:].std(ddof=1)
        for window in profile.return_volatility_windows
    ]
    latest_features.append(
        recent_log_prices[-1]
        - recent_log_prices[-profile.mean_reversion_window :].mean()
    )
    latest_features.append(
        recent_log_prices[-1] - recent_log_prices[-1 - profile.momentum_window]
    )

    return np.array(latest_features, dtype="float64")


def build_training_matrix(
    log_prices: np.ndarray, profile: FrequencyProfile
) -> tuple[np.ndarray, np.ndarray]:
    feature_frame = compute_feature_frame(log_prices, profile)
    next_period_return = pd.Series(log_prices, dtype="float64").diff().shift(-1)

    combined = feature_frame.assign(target=next_period_return).dropna()

    if combined.empty:
        raise ValueError("Not enough history to build features.")

    return (
        combined[get_feature_names(profile)].to_numpy(),
        combined["target"].to_numpy(),
    )


def create_forecasting_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "regressor",
                RidgeCV(
                    alphas=RIDGE_ALPHA_CANDIDATES,
                    cv=TimeSeriesSplit(n_splits=CROSS_VALIDATION_SPLITS),
                    scoring="neg_mean_squared_error",
                ),
            ),
        ]
    )


def _estimate_out_of_fold_residuals(
    pipeline: Pipeline,
    feature_matrix: np.ndarray,
    target_returns: np.ndarray,
) -> np.ndarray:
    residuals: list[np.ndarray] = []

    splitter = TimeSeriesSplit(n_splits=CROSS_VALIDATION_SPLITS)
    for train_indices, test_indices in splitter.split(feature_matrix):
        fold_pipeline = clone(pipeline)
        fold_pipeline.fit(
            feature_matrix[train_indices], target_returns[train_indices]
        )
        predictions = fold_pipeline.predict(feature_matrix[test_indices])
        residuals.append(target_returns[test_indices] - predictions)

    return np.concatenate(residuals)


def fit_series_model(
    log_prices: np.ndarray,
    profile: FrequencyProfile,
    *,
    estimate_residuals: bool = True,
) -> FittedSeriesModel:
    feature_matrix, target_returns = build_training_matrix(log_prices, profile)

    pipeline = create_forecasting_pipeline()
    pipeline.fit(feature_matrix, target_returns)

    residuals = (
        _estimate_out_of_fold_residuals(pipeline, feature_matrix, target_returns)
        if estimate_residuals
        else None
    )

    return FittedSeriesModel(
        pipeline=pipeline,
        selected_alpha=float(pipeline.named_steps["regressor"].alpha_),
        out_of_fold_residuals=residuals,
        maximum_return_magnitude=float(
            MAX_RETURN_STD_MULTIPLE * np.std(target_returns)
        ),
        training_row_count=len(target_returns),
    )


def forecast_log_price_path(
    model: FittedSeriesModel,
    log_prices: np.ndarray,
    steps: int,
    profile: FrequencyProfile,
) -> np.ndarray:
    """Recursive multi-step forecast; returns log prices for steps 1..N."""

    extended_history = list(log_prices[-profile.recent_window_length :])
    limit = model.maximum_return_magnitude
    forecast_values: list[float] = []

    for _ in range(steps):
        latest_features = compute_latest_feature_row(
            np.array(extended_history[-profile.recent_window_length :]),
            profile,
        )
        predicted_return = float(
            model.pipeline.predict(latest_features.reshape(1, -1))[0]
        )
        predicted_return = float(np.clip(predicted_return, -limit, limit))

        next_value = extended_history[-1] + predicted_return
        extended_history.append(next_value)
        forecast_values.append(next_value)

    return np.array(forecast_values)


def build_interval_bounds(
    log_price_path: np.ndarray,
    residual_std: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Uncertainty grows with the square root of the horizon."""

    steps_ahead = np.arange(1, len(log_price_path) + 1)
    spread = INTERVAL_Z_SCORE * residual_std * np.sqrt(steps_ahead)

    return (
        np.exp(log_price_path - spread),
        np.exp(log_price_path + spread),
    )


def run_walk_forward_backtest(
    gold_usd_prices: np.ndarray,
    inr_per_usd_prices: np.ndarray,
    grams_per_ounce: float,
    profile: FrequencyProfile,
) -> dict[str, Any] | None:
    """
    Re-fit at several past origins, forecast the longest horizon, and
    compare with what actually happened. A no-change forecast is the
    baseline.
    """

    maximum_horizon = max(steps for steps, _ in profile.backtest_horizons)
    observation_count = len(gold_usd_prices)

    last_origin = observation_count - 1 - maximum_horizon
    origins = sorted(
        range(
            last_origin,
            profile.backtest_min_training - 1,
            -profile.backtest_step,
        )
    )[-profile.backtest_max_origins :]

    if len(origins) < 3:
        return None

    actual_prices = {
        "gold_usd_per_ounce": gold_usd_prices,
        "inr_per_usd": inr_per_usd_prices,
        "gold_inr_per_gram": (
            gold_usd_prices * inr_per_usd_prices / grams_per_ounce
        ),
    }
    errors: dict[str, dict[int, list[tuple[float, float]]]] = {
        series_name: {steps: [] for steps, _ in profile.backtest_horizons}
        for series_name in actual_prices
    }

    for origin in origins:
        gold_log = np.log(gold_usd_prices[: origin + 1])
        fx_log = np.log(inr_per_usd_prices[: origin + 1])

        gold_path = np.exp(
            forecast_log_price_path(
                fit_series_model(gold_log, profile, estimate_residuals=False),
                gold_log,
                maximum_horizon,
                profile,
            )
        )
        fx_path = np.exp(
            forecast_log_price_path(
                fit_series_model(fx_log, profile, estimate_residuals=False),
                fx_log,
                maximum_horizon,
                profile,
            )
        )
        predicted_paths = {
            "gold_usd_per_ounce": gold_path,
            "inr_per_usd": fx_path,
            "gold_inr_per_gram": gold_path * fx_path / grams_per_ounce,
        }

        for series_name, series_actual in actual_prices.items():
            for steps, _ in profile.backtest_horizons:
                actual = series_actual[origin + steps]
                model_error = abs(
                    predicted_paths[series_name][steps - 1] - actual
                ) / actual
                naive_error = abs(series_actual[origin] - actual) / actual
                errors[series_name][steps].append((model_error, naive_error))

    horizon_labels = dict(profile.backtest_horizons)
    results: dict[str, list[dict[str, Any]]] = {}

    for series_name, by_horizon in errors.items():
        results[series_name] = []
        for steps, pairs in by_horizon.items():
            model_mape = float(np.mean([pair[0] for pair in pairs]) * 100)
            naive_mape = float(np.mean([pair[1] for pair in pairs]) * 100)
            results[series_name].append(
                {
                    "horizon_steps": steps,
                    "horizon_label": horizon_labels[steps],
                    "model_mape_pct": model_mape,
                    "naive_mape_pct": naive_mape,
                    "model_beats_naive": bool(model_mape < naive_mape),
                }
            )

    return {
        "origin_count": len(origins),
        "step_periods": profile.backtest_step,
        "period_unit": profile.period_unit,
        "results": results,
    }

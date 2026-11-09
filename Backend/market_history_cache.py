"""
In-memory cache of the full aligned gold and USD/INR history.

The savings tab can be run many times with different inputs while the
underlying market data stays the same, so the maximum history is downloaded
once and reused until it is older than CACHE_TTL_SECONDS.

If a refresh fails and an older copy exists, the older copy is returned and
flagged as stale so the caller can tell the user. Without any copy the
failure is raised.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, replace
from datetime import datetime

import pandas as pd

from conversion import TROY_OUNCE_GRAMS, convert_gold_history
from market_data import get_gold_history, get_usd_inr_history

logger = logging.getLogger("goldinfo.market_cache")

HISTORY_PERIOD = "max"
CACHE_TTL_SECONDS = 15 * 60

GOLD_USD_PER_OUNCE_COLUMN = "gold_usd_per_ounce"
INR_PER_USD_COLUMN = "inr_per_usd"
GOLD_INR_PER_GRAM_COLUMN = "gold_inr_per_gram"


class MarketHistoryUnavailableError(Exception):
    """The history could not be downloaded and no cached copy exists."""


@dataclass(frozen=True)
class AlignedMarketHistory:
    """
    Aligned daily history indexed by date (ascending, unique).

    Treat the frame as read-only: callers must copy before changing it.
    """

    aligned_frame: pd.DataFrame
    fetched_at: datetime
    is_stale: bool


_cache_lock = threading.Lock()
_cached_history: AlignedMarketHistory | None = None


def _download_aligned_history() -> pd.DataFrame:
    gold_history = get_gold_history(period=HISTORY_PERIOD)
    usd_inr_history = get_usd_inr_history(period=HISTORY_PERIOD)

    converted_data = convert_gold_history(
        gold_history=gold_history,
        usd_inr_history=usd_inr_history,
        requested_period=HISTORY_PERIOD,
    )

    aligned_frame = pd.DataFrame(converted_data["gold_inr_per_ounce"])
    aligned_frame["date"] = pd.to_datetime(aligned_frame["date"])
    aligned_frame = aligned_frame.set_index("date").sort_index()
    aligned_frame[GOLD_INR_PER_GRAM_COLUMN] = (
        aligned_frame["gold_inr_per_ounce"] / TROY_OUNCE_GRAMS
    )

    return aligned_frame[
        [
            GOLD_USD_PER_OUNCE_COLUMN,
            INR_PER_USD_COLUMN,
            GOLD_INR_PER_GRAM_COLUMN,
        ]
    ]


def get_aligned_market_history() -> AlignedMarketHistory:
    global _cached_history

    with _cache_lock:
        if _cached_history is not None:
            cache_age_seconds = (
                datetime.now() - _cached_history.fetched_at
            ).total_seconds()
            if cache_age_seconds < CACHE_TTL_SECONDS:
                return _cached_history

        try:
            logger.info("Downloading the maximum market history")
            aligned_frame = _download_aligned_history()
        except (RuntimeError, ValueError) as exc:
            if _cached_history is not None:
                logger.warning(
                    "Refresh failed, serving the cached copy from %s: %s",
                    _cached_history.fetched_at.isoformat(timespec="seconds"),
                    exc,
                )
                _cached_history = replace(_cached_history, is_stale=True)
                return _cached_history

            raise MarketHistoryUnavailableError(
                f"Market data retrieval failed: {exc}"
            ) from exc

        _cached_history = AlignedMarketHistory(
            aligned_frame=aligned_frame,
            fetched_at=datetime.now(),
            is_stale=False,
        )
        logger.info(
            "Cached %d aligned observations (%s to %s)",
            len(aligned_frame),
            aligned_frame.index[0].date(),
            aligned_frame.index[-1].date(),
        )
        return _cached_history

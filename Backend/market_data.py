from typing import TypedDict

import pandas as pd
import yfinance as yf

GOLD_TICKER = "GC=F"
USD_INR_TICKER = "INR=X"

SOURCE = "Yahoo Finance via yfinance"

class MarketObservation(TypedDict):
    date: str
    close: float

class GoldObservation(MarketObservation):
    pass

class ExchangeRateObservation(MarketObservation):
    pass

class GoldHistory(TypedDict):
    ticker: str
    source: str
    observations: list[GoldObservation]
    latest_observation_date: str

class UsdInrHistory(TypedDict):
    ticker: str
    source: str
    observations: list[ExchangeRateObservation]
    latest_observation_date: str

def _download_close_observations(
    ticker: str,
    period: str,
    instrument_name: str,
    interval: str = "1d",
) -> list[MarketObservation]:
    """
    Download and normalize daily closing-price observations.

    Handles both regular and MultiIndex column formats returned by
    yfinance.
    """

    try:
        data = yf.download(
            ticker,
            period=period,
            interval=interval,
            auto_adjust=False,
            progress=False,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to retrieve {instrument_name} data: {exc}"
        ) from exc

    if data.empty:
        raise RuntimeError(
            f"No historical data returned for ticker {ticker}."
        )

    # Locate the Close column, including when yfinance returns
    # MultiIndex columns.
    close = None

    if "Close" in data.columns:
        close = data["Close"]
    elif isinstance(data.columns, pd.MultiIndex):
        for level in range(data.columns.nlevels):
            if "Close" in data.columns.get_level_values(level):
                close = data.xs("Close", axis=1, level=level)
                break

    if close is None:
        raise RuntimeError(
            f"Historical data for {ticker} does not contain "
            "a Close price column."
        )

    # A download may return a DataFrame instead of a Series,
    # depending on the yfinance version and column format.
    if isinstance(close, pd.DataFrame):
        if ticker in close.columns:
            close = close[ticker]
        elif len(close.columns) == 1:
            close = close.iloc[:, 0]
        else:
            raise RuntimeError(
                f"Historical data for {ticker} contains multiple "
                "closing-price columns."
            )

    close = close.dropna()

    if close.empty:
        raise RuntimeError(
            f"No usable closing-price observations returned for {ticker}."
        )

    observations: list[MarketObservation] = []

    for timestamp, value in close.items():
        observations.append(
            {
                "date": timestamp.strftime("%Y-%m-%d"),
                "close": float(value),
            }
        )

    observations.sort(key=lambda observation: observation["date"])

    return observations


def get_gold_history(
    period: str = "1y",
    ticker: str = GOLD_TICKER,
    interval: str = "1d",
) -> GoldHistory:
    observations = _download_close_observations(
        ticker=ticker,
        period=period,
        instrument_name="gold futures",
        interval=interval,
    )

    return {
        "ticker": ticker,
        "source": SOURCE,
        "observations": observations,
        "latest_observation_date": observations[-1]["date"],
    }


def get_usd_inr_history(
    period: str = "1y",
    ticker: str = USD_INR_TICKER,
    interval: str = "1d",
) -> UsdInrHistory:
    observations = _download_close_observations(
        ticker=ticker,
        period=period,
        instrument_name="USD/INR exchange-rate",
        interval=interval,
    )

    return {
        "ticker": ticker,
        "source": SOURCE,
        "observations": observations,
        "latest_observation_date": observations[-1]["date"],
    }


if __name__ == "__main__":
    gold_history = get_gold_history(period="1y")
    usd_inr_history = get_usd_inr_history(period="1y")

    print("=== GOLD FUTURES ===")
    print(f"Ticker: {gold_history['ticker']}")
    print(f"Source: {gold_history['source']}")
    print(f"Observations: {len(gold_history['observations'])}")
    print(
        f"Latest observation: "
        f"{gold_history['latest_observation_date']}"
    )
    print("First 3 observations:")
    for observation in gold_history["observations"][:3]:
        print(observation)
    print("Last 3 observations:")
    for observation in gold_history["observations"][-3:]:
        print(observation)

    print("\n=== USD/INR EXCHANGE RATE ===")
    print(f"Ticker: {usd_inr_history['ticker']}")
    print(f"Source: {usd_inr_history['source']}")
    print(f"Observations: {len(usd_inr_history['observations'])}")
    print(
        f"Latest observation: "
        f"{usd_inr_history['latest_observation_date']}"
    )
    print("First 3 observations:")
    for observation in usd_inr_history["observations"][:3]:
        print(observation)
    print("Last 3 observations:")
    for observation in usd_inr_history["observations"][-3:]:
        print(observation)
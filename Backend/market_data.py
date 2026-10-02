from typing import TypedDict

import yfinance as yf


TICKER = "GC=F"
SOURCE = "Yahoo Finance via yfinance"


class GoldObservation(TypedDict):
    date: str
    close: float


class GoldHistory(TypedDict):
    ticker: str
    source: str
    observations: list[GoldObservation]
    latest_observation_date: str


def get_gold_history(period: str = "1y") -> GoldHistory:
    """
    Retrieve daily gold futures closing prices for the requested period.

    Returns:
        Structured historical observations and metadata.

    Raises:
        RuntimeError: If the market-data provider cannot be reached or
                      returns no usable observations.
    """

    try:
        data = yf.download(
            TICKER,
            period=period,
            interval="1d",
            auto_adjust=False,
            progress=False,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to retrieve gold futures data: {exc}"
        ) from exc

    if data.empty:
        raise RuntimeError(
            f"No historical data returned for ticker {TICKER}."
        )

    if "Close" not in data.columns:
        raise RuntimeError(
            "Historical data does not contain a Close price column."
        )

    close = data["Close"].dropna()

    if getattr(close, "ndim", 1) > 1:
        if TICKER in close.columns:
            close = close[TICKER]
        elif len(close.columns) == 1:
            close = close.iloc[:, 0]
        else:
            raise RuntimeError(
                "Historical data contains multiple closing-price columns."
            )

    if close.empty:
        raise RuntimeError(
            f"No usable closing-price observations returned for {TICKER}."
        )

    observations: list[GoldObservation] = []

    for timestamp, price in close.items():
        formatted = timestamp.strftime("%Y-%m-%d")
        observations.append(
            {
                "date": formatted,
                "close": float(price),
            }
        )

    observations.sort(key=lambda observation: observation["date"])

    return {
        "ticker": TICKER,
        "source": SOURCE,
        "observations": observations,
        "latest_observation_date": observations[-1]["date"],
    }


if __name__ == "__main__":
    history = get_gold_history()

    print(f"Ticker: {history['ticker']}")
    print(f"Source: {history['source']}")
    print(f"Observations: {len(history['observations'])}")
    print(f"Latest observation: {history['latest_observation_date']}")
    print()
    print("First 3 observations:")

    for observation in history["observations"][:3]:
        print(observation)

    print()
    print("Last 3 observations:")

    for observation in history["observations"][-3:]:
        print(observation)
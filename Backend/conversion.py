from __future__ import annotations

from typing import TypedDict

from market_data import (
    ExchangeRateObservation,
    GoldHistory,
    MarketObservation,
    UsdInrHistory,
)


TROY_OUNCE_GRAMS = 31.1034768


class GoldUsdPerOunceObservation(TypedDict):
    date: str
    gold_usd_per_ounce: float


class UsdInrObservation(TypedDict):
    date: str
    inr_per_usd: float


class GoldInrPerOunceObservation(TypedDict):
    date: str
    gold_usd_per_ounce: float
    inr_per_usd: float
    gold_inr_per_ounce: float


class GoldInrPerGramObservation(TypedDict):
    date: str
    gold_inr_per_ounce: float
    gold_inr_per_gram: float


class DatasetMetadata(TypedDict):
    name: str
    source: str
    ticker: str
    unit: str
    requested_period: str
    first_observation_date: str
    last_observation_date: str
    observation_count: int


class ConvertedGoldData(TypedDict):
    gold_usd_per_ounce: list[GoldUsdPerOunceObservation]
    usd_inr: list[UsdInrObservation]
    gold_inr_per_ounce: list[GoldInrPerOunceObservation]
    gold_inr_per_gram: list[GoldInrPerGramObservation]
    metadata: dict[str, DatasetMetadata]


def _validate_observations(
    observations: list[MarketObservation],
    instrument_name: str,
) -> None:
    if not observations:
        raise ValueError(
            f"{instrument_name} contains no observations."
        )

    dates = [observation["date"] for observation in observations]

    if dates != sorted(dates):
        raise ValueError(
            f"{instrument_name} observations are not sorted "
            "chronologically."
        )

    if len(dates) != len(set(dates)):
        raise ValueError(
            f"{instrument_name} contains duplicate observation dates."
        )

    for observation in observations:
        date = observation.get("date")
        close = observation.get("close")

        if not date:
            raise ValueError(
                f"{instrument_name} contains an observation "
                "with an invalid date."
            )

        if close is None:
            raise ValueError(
                f"{instrument_name} contains an observation "
                f"with no closing value on {date}."
            )


def _build_source_datasets(
    gold_history: GoldHistory,
    usd_inr_history: UsdInrHistory,
) -> tuple[
    list[GoldUsdPerOunceObservation],
    list[UsdInrObservation],
]:
    gold_observations = gold_history["observations"]
    fx_observations = usd_inr_history["observations"]

    _validate_observations(
        gold_observations,
        "Gold history",
    )
    _validate_observations(
        fx_observations,
        "USD/INR history",
    )

    gold_dataset = [
        {
            "date": observation["date"],
            "gold_usd_per_ounce": observation["close"],
        }
        for observation in gold_observations
    ]

    fx_dataset = [
        {
            "date": observation["date"],
            "inr_per_usd": observation["close"],
        }
        for observation in fx_observations
    ]

    return gold_dataset, fx_dataset


def _align_source_observations(
    gold_history: GoldHistory,
    usd_inr_history: UsdInrHistory,
) -> list[tuple[str, float, float]]:
    """
    Align gold and USD/INR observations using an inner date join.

    Only dates for which both source series contain a valid observation
    are retained.

    No interpolation or forward-filling is performed.
    """

    gold_by_date = {
        observation["date"]: observation["close"]
        for observation in gold_history["observations"]
    }

    fx_by_date = {
        observation["date"]: observation["close"]
        for observation in usd_inr_history["observations"]
    }

    common_dates = sorted(
        set(gold_by_date).intersection(fx_by_date)
    )

    if not common_dates:
        raise ValueError(
            "Gold and USD/INR histories have no aligned dates."
        )

    aligned: list[tuple[str, float, float]] = []

    for date in common_dates:
        gold_close = gold_by_date[date]
        fx_close = fx_by_date[date]

        if gold_close <= 0:
            raise ValueError(
                f"Invalid gold closing price on {date}: "
                f"{gold_close}"
            )

        if fx_close <= 0:
            raise ValueError(
                f"Invalid USD/INR exchange rate on {date}: "
                f"{fx_close}"
            )

        aligned.append(
            (date, gold_close, fx_close)
        )

    return aligned


def _build_inr_per_ounce_dataset(
    aligned: list[tuple[str, float, float]],
) -> list[GoldInrPerOunceObservation]:
    return [
        {
            "date": date,
            "gold_usd_per_ounce": gold_usd_per_ounce,
            "inr_per_usd": inr_per_usd,
            "gold_inr_per_ounce": (
                gold_usd_per_ounce * inr_per_usd
            ),
        }
        for date, gold_usd_per_ounce, inr_per_usd in aligned
    ]


def _build_inr_per_gram_dataset(
    inr_per_ounce: list[GoldInrPerOunceObservation],
) -> list[GoldInrPerGramObservation]:
    return [
        {
            "date": observation["date"],
            "gold_inr_per_ounce": observation[
                "gold_inr_per_ounce"
            ],
            "gold_inr_per_gram": (
                observation["gold_inr_per_ounce"]
                / TROY_OUNCE_GRAMS
            ),
        }
        for observation in inr_per_ounce
    ]


def _build_metadata(
    *,
    name: str,
    source: str,
    ticker: str,
    unit: str,
    requested_period: str,
    observations: list[dict],
) -> DatasetMetadata:
    if not observations:
        raise ValueError(
            f"Cannot build metadata for empty dataset: {name}"
        )

    return {
        "name": name,
        "source": source,
        "ticker": ticker,
        "unit": unit,
        "requested_period": requested_period,
        "first_observation_date": observations[0]["date"],
        "last_observation_date": observations[-1]["date"],
        "observation_count": len(observations),
    }


def convert_gold_history(
    gold_history: GoldHistory,
    usd_inr_history: UsdInrHistory,
    requested_period: str,
) -> ConvertedGoldData:
    """
    Build all four v2 gold datasets from the two raw source histories.

    Source datasets:
        1. Gold USD per troy ounce
        2. USD/INR

    Derived datasets:
        3. Gold INR per troy ounce
        4. Gold INR per gram

    Date alignment uses the intersection of valid source dates.
    No missing values are fabricated through forward-fill or
    interpolation.
    """

    (
        gold_usd_per_ounce,
        usd_inr,
    ) = _build_source_datasets(
        gold_history,
        usd_inr_history,
    )

    aligned = _align_source_observations(
        gold_history,
        usd_inr_history,
    )

    gold_inr_per_ounce = _build_inr_per_ounce_dataset(
        aligned
    )

    gold_inr_per_gram = _build_inr_per_gram_dataset(
        gold_inr_per_ounce
    )

    # The two derived datasets must have identical dates.
    ounce_dates = [
        observation["date"]
        for observation in gold_inr_per_ounce
    ]

    gram_dates = [
        observation["date"]
        for observation in gold_inr_per_gram
    ]

    if ounce_dates != gram_dates:
        raise RuntimeError(
            "INR/ounce and INR/gram datasets have different dates."
        )

    metadata = {
        "gold_usd_per_ounce": _build_metadata(
            name="Gold USD per troy ounce",
            source=gold_history["source"],
            ticker=gold_history["ticker"],
            unit="USD/troy ounce",
            requested_period=requested_period,
            observations=gold_usd_per_ounce,
        ),
        "usd_inr": _build_metadata(
            name="USD/INR exchange rate",
            source=usd_inr_history["source"],
            ticker=usd_inr_history["ticker"],
            unit="INR/USD",
            requested_period=requested_period,
            observations=usd_inr,
        ),
        "gold_inr_per_ounce": _build_metadata(
            name="Gold INR per troy ounce",
            source="Derived from Yahoo Finance",
            ticker=gold_history["ticker"],
            unit="INR/troy ounce",
            requested_period=requested_period,
            observations=gold_inr_per_ounce,
        ),
        "gold_inr_per_gram": _build_metadata(
            name="Gold INR per gram",
            source="Derived from Yahoo Finance",
            ticker=gold_history["ticker"],
            unit="INR/gram",
            requested_period=requested_period,
            observations=gold_inr_per_gram,
        ),
    }

    return {
        "gold_usd_per_ounce": gold_usd_per_ounce,
        "usd_inr": usd_inr,
        "gold_inr_per_ounce": gold_inr_per_ounce,
        "gold_inr_per_gram": gold_inr_per_gram,
        "metadata": metadata,
    }

if __name__ == "__main__":
    from market_data import get_gold_history, get_usd_inr_history

    PERIOD = "1y"

    print("Retrieving source data...")
    gold_history = get_gold_history(period=PERIOD)
    usd_inr_history = get_usd_inr_history(period=PERIOD)

    print("Converting and aligning data...")
    converted = convert_gold_history(
        gold_history=gold_history,
        usd_inr_history=usd_inr_history,
        requested_period=PERIOD,
    )

    gold_usd = converted["gold_usd_per_ounce"]
    usd_inr = converted["usd_inr"]
    gold_inr_oz = converted["gold_inr_per_ounce"]
    gold_inr_g = converted["gold_inr_per_gram"]

    print("\n=== CONVERSION SUMMARY ===")
    print(f"Requested period: {PERIOD}")
    print(f"Gold source observations: {len(gold_usd)}")
    print(f"USD/INR source observations: {len(usd_inr)}")
    print(f"Aligned observations: {len(gold_inr_oz)}")

    print("\n=== GOLD USD / TROY OUNCE ===")
    print(
        f"Coverage: "
        f"{gold_usd[0]['date']} -> {gold_usd[-1]['date']}"
    )
    print(f"Observations: {len(gold_usd)}")

    print("First 3 observations:")
    for observation in gold_usd[:3]:
        print(observation)

    print("Last 3 observations:")
    for observation in gold_usd[-3:]:
        print(observation)

    print("\n=== USD/INR ===")
    print(
        f"Coverage: "
        f"{usd_inr[0]['date']} -> {usd_inr[-1]['date']}"
    )
    print(f"Observations: {len(usd_inr)}")

    print("First 3 observations:")
    for observation in usd_inr[:3]:
        print(observation)

    print("Last 3 observations:")
    for observation in usd_inr[-3:]:
        print(observation)

    print("\n=== GOLD INR / TROY OUNCE ===")
    print(
        f"Coverage: "
        f"{gold_inr_oz[0]['date']} -> {gold_inr_oz[-1]['date']}"
    )
    print(f"Observations: {len(gold_inr_oz)}")

    print("First 3 observations:")
    for observation in gold_inr_oz[:3]:
        print(observation)

    print("Last 3 observations:")
    for observation in gold_inr_oz[-3:]:
        print(observation)

    print("\n=== GOLD INR / GRAM ===")
    print(
        f"Coverage: "
        f"{gold_inr_g[0]['date']} -> {gold_inr_g[-1]['date']}"
    )
    print(f"Observations: {len(gold_inr_g)}")

    print("First 3 observations:")
    for observation in gold_inr_g[:3]:
        print(observation)

    print("Last 3 observations:")
    for observation in gold_inr_g[-3:]:
        print(observation)

    print("\n=== LATEST ALIGNED CALCULATION ===")

    latest_oz = gold_inr_oz[-1]
    latest_g = gold_inr_g[-1]

    print(f"Date: {latest_oz['date']}")
    print(
        f"Gold: "
        f"{latest_oz['gold_usd_per_ounce']} USD/troy ounce"
    )
    print(
        f"USD/INR: "
        f"{latest_oz['inr_per_usd']} INR/USD"
    )
    print(
        f"INR/troy ounce: "
        f"{latest_oz['gold_inr_per_ounce']}"
    )
    print(
        f"INR/gram: "
        f"{latest_g['gold_inr_per_gram']}"
    )

    print("\n=== DATASET INVARIANTS ===")

    ounce_dates = [
        observation["date"]
        for observation in gold_inr_oz
    ]

    gram_dates = [
        observation["date"]
        for observation in gold_inr_g
    ]

    print(
        f"INR/ounce and INR/gram dates match: "
        f"{ounce_dates == gram_dates}"
    )

    print(
        f"INR/ounce rows == INR/gram rows: "
        f"{len(gold_inr_oz) == len(gold_inr_g)}"
    )

    print(
        f"Aligned dates sorted: "
        f"{ounce_dates == sorted(ounce_dates)}"
    )

    print(
        f"Aligned dates unique: "
        f"{len(ounce_dates) == len(set(ounce_dates))}"
    )
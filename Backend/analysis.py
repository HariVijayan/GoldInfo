from datetime import date, timedelta

from conversion import GoldInrPerGramObservation


class GoldAnalysis:
    def __init__(
        self,
        latest_price: float,
        latest_observation_date: str,
        previous_price: float | None,
        previous_observation_date: str | None,
        one_session_change_pct: float | None,
        seven_day_change_pct: float | None,
        seven_day_reference_date: str | None,
        thirty_day_change_pct: float | None,
        thirty_day_reference_date: str | None,
        historical_high: float,
        historical_high_date: str,
        historical_low: float,
        historical_low_date: str,
        range_position_pct: float | None,
        distance_below_high_pct: float | None,
        observation_count: int,
        period_start: str,
        period_end: str,
    ):
        self.latest_price = latest_price
        self.latest_observation_date = latest_observation_date
        self.previous_price = previous_price
        self.previous_observation_date = previous_observation_date
        self.one_session_change_pct = one_session_change_pct
        self.seven_day_change_pct = seven_day_change_pct
        self.seven_day_reference_date = seven_day_reference_date
        self.thirty_day_change_pct = thirty_day_change_pct
        self.thirty_day_reference_date = thirty_day_reference_date
        self.historical_high = historical_high
        self.historical_high_date = historical_high_date
        self.historical_low = historical_low
        self.historical_low_date = historical_low_date
        self.range_position_pct = range_position_pct
        self.distance_below_high_pct = distance_below_high_pct
        self.observation_count = observation_count
        self.period_start = period_start
        self.period_end = period_end

    def to_dict(self) -> dict:
        return {
            "unit": "INR/gram",
            "latest_price": self.latest_price,
            "latest_observation_date": self.latest_observation_date,
            "previous_price": self.previous_price,
            "previous_observation_date": self.previous_observation_date,
            "one_session_change_pct": self.one_session_change_pct,
            "seven_day_change_pct": self.seven_day_change_pct,
            "seven_day_reference_date": self.seven_day_reference_date,
            "thirty_day_change_pct": self.thirty_day_change_pct,
            "thirty_day_reference_date": self.thirty_day_reference_date,
            "historical_high": self.historical_high,
            "historical_high_date": self.historical_high_date,
            "historical_low": self.historical_low,
            "historical_low_date": self.historical_low_date,
            "range_position_pct": self.range_position_pct,
            "distance_below_high_pct": self.distance_below_high_pct,
            "observation_count": self.observation_count,
            "period_start": self.period_start,
            "period_end": self.period_end,
        }


def percentage_change(
    current: float,
    previous: float,
) -> float | None:
    """Calculate percentage change safely."""

    if previous == 0:
        return None

    return ((current - previous) / previous) * 100


def find_reference_observation(
    observations: list[GoldInrPerGramObservation],
    target_date: date,
) -> GoldInrPerGramObservation | None:
    """
    Return the latest observation on or before target_date.

    This preserves the existing calendar-day reference policy
    and naturally handles weekends and market holidays.
    """

    reference = None

    for observation in observations:
        observation_date = date.fromisoformat(observation["date"])

        if observation_date <= target_date:
            reference = observation
        else:
            break

    return reference


def analyze_gold_history(
    observations: list[GoldInrPerGramObservation],
) -> dict:
    """
    Calculate descriptive statistics using gold prices in INR per gram.

    The input must be the aligned/derived INR-per-gram dataset from
    conversion.py. No USD or INR-per-ounce values are analyzed here.
    """

    if not observations:
        raise ValueError(
            "Cannot analyze an empty INR-per-gram observation set."
        )

    latest = observations[-1]
    latest_price = latest["gold_inr_per_gram"]
    latest_date = date.fromisoformat(latest["date"])

    # Previous available observation.
    previous = observations[-2] if len(observations) >= 2 else None

    previous_price = (
        previous["gold_inr_per_gram"]
        if previous
        else None
    )

    previous_date = (
        previous["date"]
        if previous
        else None
    )

    one_session_change = None

    if previous_price is not None:
        one_session_change = percentage_change(
            latest_price,
            previous_price,
        )

    # Approximately 7 calendar days.
    seven_day_target = latest_date - timedelta(days=7)

    seven_day_reference = find_reference_observation(
        observations,
        seven_day_target,
    )

    seven_day_change = None

    if seven_day_reference is not None:
        seven_day_change = percentage_change(
            latest_price,
            seven_day_reference["gold_inr_per_gram"],
        )

    # Approximately 30 calendar days.
    thirty_day_target = latest_date - timedelta(days=30)

    thirty_day_reference = find_reference_observation(
        observations,
        thirty_day_target,
    )

    thirty_day_change = None

    if thirty_day_reference is not None:
        thirty_day_change = percentage_change(
            latest_price,
            thirty_day_reference["gold_inr_per_gram"],
        )

    # Historical high and low.
    high_observation = max(
        observations,
        key=lambda observation: observation["gold_inr_per_gram"],
    )

    low_observation = min(
        observations,
        key=lambda observation: observation["gold_inr_per_gram"],
    )

    historical_high = high_observation["gold_inr_per_gram"]
    historical_low = low_observation["gold_inr_per_gram"]

    # Position of latest price within historical range.
    range_size = historical_high - historical_low

    if range_size == 0:
        range_position = None
    else:
        range_position = (
            (latest_price - historical_low)
            / range_size
        ) * 100

    # Percentage distance below historical high.
    if historical_high == 0:
        distance_below_high = None
    else:
        distance_below_high = (
            (historical_high - latest_price)
            / historical_high
        ) * 100

    result = GoldAnalysis(
        latest_price=latest_price,
        latest_observation_date=latest["date"],
        previous_price=previous_price,
        previous_observation_date=previous_date,
        one_session_change_pct=one_session_change,
        seven_day_change_pct=seven_day_change,
        seven_day_reference_date=(
            seven_day_reference["date"]
            if seven_day_reference
            else None
        ),
        thirty_day_change_pct=thirty_day_change,
        thirty_day_reference_date=(
            thirty_day_reference["date"]
            if thirty_day_reference
            else None
        ),
        historical_high=historical_high,
        historical_high_date=high_observation["date"],
        historical_low=historical_low,
        historical_low_date=low_observation["date"],
        range_position_pct=range_position,
        distance_below_high_pct=distance_below_high,
        observation_count=len(observations),
        period_start=observations[0]["date"],
        period_end=observations[-1]["date"],
    )

    return result.to_dict()


if __name__ == "__main__":
    from conversion import convert_gold_history
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

    print("Analyzing INR-per-gram data...")
    analysis = analyze_gold_history(
        converted["gold_inr_per_gram"]
    )

    print("\n=== GOLD ANALYSIS ===")

    for key, value in analysis.items():
        print(f"{key}: {value}")
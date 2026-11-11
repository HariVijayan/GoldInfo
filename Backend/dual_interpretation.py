"""
Prompt and parser for writing the original and the retail interpretation
in one model call.

The model is asked for two sections introduced by [ORIGINAL] and [RETAIL]
marker lines. Small models do not always obey, so the parser is lenient
about decoration (markdown bold, headings, colons) and returns None when
either section is missing, and the agent then falls back to one call per
view.
"""

from __future__ import annotations

import json
import re
from typing import Any, Mapping

from retail_pricing import VIEW_ORIGINAL, VIEW_RETAIL, format_charge_label

SECTION_NAMES = (VIEW_ORIGINAL, VIEW_RETAIL)

_DECORATION_PATTERN = re.compile(r"[\s#*_>\-:\[\]()`]+")
_HEADER_WORDS = {"price", "prices", "view", "section", "rate", "rates"}

INTERPRETATION_INSTRUCTIONS = (
    "Provide a concise factual interpretation of the historical gold price "
    "movement in INR per gram. Mention the relevant period, recent "
    "movement, and historical range position where useful. Do not predict "
    "future prices and do not provide investment advice."
)


def _describe_views(retail_charge_pct: float) -> str:
    return (
        "The statistics are given for two views of the same history. "
        "ORIGINAL is the internationally converted price. RETAIL is the "
        f"original price plus a flat {format_charge_label(retail_charge_pct)}"
        " percent retail charge, an approximation of what a buyer pays at a "
        "jeweller. Percentage changes are identical in both views because "
        "the charge is a constant multiplier; only rupee prices differ. "
        "Use only the numbers given for each view. Never compute new "
        "numbers."
    )


def build_dual_interpretation_prompt(
    original_analysis: Mapping[str, Any],
    retail_analysis: Mapping[str, Any],
    retail_charge_pct: float,
) -> str:
    statistics = {"ORIGINAL": original_analysis, "RETAIL": retail_analysis}

    return (
        "The required Python data-processing workflow is now complete. "
        "Use the following calculated statistics as the authoritative "
        "source.\n\n"
        f"{_describe_views(retail_charge_pct)}\n\n"
        f"{json.dumps(statistics, indent=2)}\n\n"
        f"{INTERPRETATION_INSTRUCTIONS}\n\n"
        "Write exactly two sections, one for each view. Start each section "
        "with its marker alone on a line, in this order:\n"
        "[ORIGINAL]\n"
        "(interpretation using the ORIGINAL statistics)\n"
        "[RETAIL]\n"
        "(interpretation using the RETAIL statistics, stating prices as "
        "retail prices)"
    )


def build_single_view_prompt(
    view_name: str,
    analysis: Mapping[str, Any],
    retail_charge_pct: float,
) -> str:
    if view_name == VIEW_RETAIL:
        view_note = (
            "These are RETAIL prices: the converted price plus a flat "
            f"{format_charge_label(retail_charge_pct)} percent retail "
            "charge. State prices as retail prices."
        )
    else:
        view_note = "These are the ORIGINAL internationally converted prices."

    return (
        "Use the following calculated statistics as the authoritative "
        f"source.\n\n{view_note}\n\n{json.dumps(analysis, indent=2)}\n\n"
        f"{INTERPRETATION_INSTRUCTIONS}"
    )


def _header_section_name(line: str) -> str | None:
    """Return 'original' or 'retail' if the line is a section marker."""

    words = [
        word
        for word in _DECORATION_PATTERN.sub(" ", line).lower().split()
        if word
    ]
    if not words or len(words) > 3:
        return None
    if words[0] in SECTION_NAMES and all(
        extra in _HEADER_WORDS for extra in words[1:]
    ):
        return words[0]
    return None


def parse_dual_interpretation(model_text: str) -> dict[str, str] | None:
    """Split the answer by marker lines. None if either section is empty."""

    sections: dict[str, list[str]] = {name: [] for name in SECTION_NAMES}
    current_section: str | None = None

    for line in model_text.splitlines():
        header_name = _header_section_name(line)
        if header_name is not None:
            current_section = header_name
            continue
        if current_section is not None:
            sections[current_section].append(line)

    parsed = {
        name: "\n".join(lines).strip() for name, lines in sections.items()
    }
    return parsed if all(parsed.values()) else None

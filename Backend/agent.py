import json
from datetime import datetime
from typing import Any, Callable

import ollama

from market_data import get_gold_history, get_usd_inr_history
from conversion import convert_gold_history
from analysis import analyze_gold_history
from artifacts import (
    ArtifactFile,
    build_analysis_report_artifact,
    build_gold_inr_per_gram_artifact,
    build_gold_inr_per_ounce_artifact,
    build_gold_usd_per_gram_artifact,
    build_gold_usd_per_ounce_artifact,
    build_run_metadata,
    build_usd_inr_artifact,
)

from dataclasses import dataclass, field
import uuid

MODEL = "qwen2.5:1.5b"
MAX_ITERATIONS = 5


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class AgentError(Exception):
    """
    Base exception for expected agent-runtime failures.

    run_metadata holds every artifact produced before the failure so the
    caller can still return the intermediate data.
    """

    run_metadata: dict[str, Any] | None = None


class ToolExecutionError(AgentError):
    """Raised when a registered tool cannot be executed successfully."""


class ModelResponseError(AgentError):
    """Raised when the model returns an invalid or unusable response."""


# ---------------------------------------------------------------------------
# Agent events
# ---------------------------------------------------------------------------

@dataclass
class AgentEvent:
    """
    Structured event emitted by the agent.

    The event can be consumed by:
    - CLI
    - FastAPI
    - SSE
    - React
    - future logging systems
    """

    type: str
    message: str
    timestamp: str
    artifact: dict[str, Any] | None = None


EventHandler = Callable[[AgentEvent], None]


def create_event(
    event_type: str,
    message: str,
    artifact: dict[str, Any] | None = None,
) -> AgentEvent:
    return AgentEvent(
        type=event_type,
        message=message,
        timestamp=datetime.now().isoformat(timespec="seconds"),
        artifact=artifact,
    )

# ---------------------------------------------------------------------------
# Agent result
# ---------------------------------------------------------------------------

@dataclass
class AgentResult:
    run_id: str
    request: dict[str, Any]
    analysis: dict[str, Any]
    interpretation: str
    processed_data: dict[str, Any]
    metadata: dict[str, Any]
    status: str


# ---------------------------------------------------------------------------
# CLI event handler
# ---------------------------------------------------------------------------

class AgentLogger:
    """CLI event handler. Converts structured AgentEvents into readable terminal output."""

    def __init__(self) -> None:
        self.step = 0

    def handle(self, event: AgentEvent) -> None:
        self.step += 1
        print(
            f"[{self.step:02d}] "
            f"{event.timestamp[-8:]} "
            f"{event.type:<9} "
            f"{event.message}"
        )


# ---------------------------------------------------------------------------
# Agent state
# ---------------------------------------------------------------------------

@dataclass
class AgentState:
    period: str

    # Run identity
    run_id: str = field(
        default_factory=lambda: uuid.uuid4().hex
    )

    created_at: str = field(
        default_factory=lambda: datetime.now().isoformat()
    )

    # Original user request
    goal: str = ""

    # Explicit request parameters
    gold_ticker: str = "GC=F"
    fx_ticker: str = "INR=X"
    interval: str = "1d"

    # Processing configuration
    target_currency: str = "INR"
    target_unit: str = "gram"

    # Pipeline outputs
    history: dict[str, Any] | None = None
    usd_inr_history: dict[str, Any] | None = None
    converted_data: dict[str, Any] | None = None
    analysis: dict[str, Any] | None = None
    interpretation: str | None = None

    # Downloadable intermediate files, keyed by filename
    artifact_files: dict[str, ArtifactFile] = field(default_factory=dict)

    # Lifecycle tracking
    status: str = "initialized"
    current_stage: str = "request_received"
    error: str | None = None

    @property
    def history_available(self) -> bool:
        return self.history is not None

    @property
    def usd_inr_history_available(self) -> bool:
        return self.usd_inr_history is not None

    @property
    def converted_data_available(self) -> bool:
        return self.converted_data is not None

    @property
    def analysis_available(self) -> bool:
        return self.analysis is not None

    def request_parameters(self) -> dict[str, Any]:
        return {
            "goal": self.goal,
            "period": self.period,
            "gold_ticker": self.gold_ticker,
            "fx_ticker": self.fx_ticker,
            "interval": self.interval,
            "target_currency": self.target_currency,
            "target_unit": self.target_unit,
        }


# ---------------------------------------------------------------------------
# Artifact registration
# ---------------------------------------------------------------------------

def register_artifact(
    state: AgentState,
    emit: EventHandler,
    artifact: ArtifactFile,
    message: str | None = None,
) -> None:
    """Store an artifact on the run state and announce it to listeners."""

    state.artifact_files[artifact["filename"]] = artifact

    if message is None:
        row_count = artifact["row_count"]
        message = (
            f"Prepared {artifact['filename']} ({row_count} rows)"
            if row_count is not None
            else f"Prepared {artifact['filename']}"
        )

    emit(create_event("ARTIFACT", message, artifact=dict(artifact)))


def register_analysis_report(
    state: AgentState,
    emit: EventHandler,
    interpretation: str | None = None,
) -> None:
    if state.analysis is None:
        raise AgentError(
            "Cannot build analysis.txt before statistics are calculated."
        )

    dataset_metadata = (
        state.converted_data.get("metadata")
        if state.converted_data
        else None
    )

    register_artifact(
        state,
        emit,
        build_analysis_report_artifact(
            run_id=state.run_id,
            run_started_at=state.created_at,
            request_parameters=state.request_parameters(),
            analysis=state.analysis,
            dataset_metadata=dataset_metadata,
            interpretation=interpretation,
        ),
        message=(
            "Updated analysis.txt with the model interpretation"
            if interpretation
            else "Prepared analysis.txt (statistics)"
        ),
    )


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
You are GoldInfo, a financial market data analysis assistant.

Your task is to analyze historical gold prices. The application controls the
required data-processing workflow.

When a tool is available, use it rather than inventing or estimating
information.

Important rules:
- Do not invent market data or numerical values.
- Treat Python-calculated statistics as authoritative.
- Describe historical observations only.
- Do not predict future gold prices.
- Do not provide investment or trading recommendations.
- Clearly acknowledge missing data when it exists.
- Keep the final analysis concise and factual.

The application retrieves gold and USD/INR market data, converts the data
into INR per gram, and calculates the historical statistics before asking you
for the final interpretation.
"""


# ---------------------------------------------------------------------------
# Model-facing tools
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_gold_history",
            "description": (
                "Retrieve historical daily gold futures closing prices "
                "for GC=F from Yahoo Finance. The application will also "
                "retrieve the corresponding USD/INR exchange-rate data "
                "for the same requested period."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_gold_history",
            "description": (
                "Calculate descriptive historical statistics from the "
                "retrieved gold and USD/INR data after deterministic "
                "conversion to INR per gram. This tool takes no arguments."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Tool argument parsing
# ---------------------------------------------------------------------------

def parse_tool_arguments(
    tool_name: str,
    raw_arguments: Any,
) -> dict[str, Any]:
    if raw_arguments is None:
        return {}

    if isinstance(raw_arguments, dict):
        return raw_arguments

    if isinstance(raw_arguments, str):
        try:
            parsed = json.loads(raw_arguments)
        except json.JSONDecodeError as exc:
            raise ModelResponseError(
                f"Ollama returned malformed JSON arguments for "
                f"tool '{tool_name}'. "
                f"Original error: {exc}"
            ) from exc

        if not isinstance(parsed, dict):
            raise ModelResponseError(
                f"Ollama returned invalid arguments for tool "
                f"'{tool_name}'. Expected a JSON object."
            )

        return parsed

    raise ModelResponseError(
        f"Ollama returned unsupported argument data for tool "
        f"'{tool_name}'. Expected a dictionary or JSON string."
    )


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    state: AgentState,
    emit: EventHandler,
) -> dict[str, Any]:
    if tool_name not in {"get_gold_history", "analyze_gold_history"}:
        raise ToolExecutionError(
            f"Unknown tool '{tool_name}'. "
            "The model requested a tool that is not registered."
        )

    if not isinstance(arguments, dict):
        raise ToolExecutionError(
            f"Tool '{tool_name}' received invalid arguments. "
            "Expected a JSON object."
        )

    # -----------------------------------------------------------------------
    # get_gold_history
    #
    # This is the model-facing retrieval tool.
    #
    # The application deliberately retrieves both source datasets:
    # 1. GC=F
    # 2. INR=X
    #
    # The model does not need to reason about the FX dependency.
    # -----------------------------------------------------------------------
    if tool_name == "get_gold_history":
        period = state.period

        emit(
            create_event(
                "TOOL",
                f"Retrieving gold futures history (period={period})",
            )
        )

        try:
            history = get_gold_history(
                period=state.period,
                ticker=state.gold_ticker,
                interval=state.interval,
            )
        except Exception as exc:
            raise ToolExecutionError(
                "get_gold_history failed while retrieving gold "
                f"market data. Original error: {exc}"
            ) from exc

        if not isinstance(history, dict):
            raise ToolExecutionError(
                "get_gold_history returned an invalid result. "
                "Expected a dictionary."
            )

        observations = history.get("observations")

        if not isinstance(observations, list) or not observations:
            raise ToolExecutionError(
                "get_gold_history returned no usable observations."
            )

        state.history = history

        emit(
            create_event(
                "SUCCESS",
                "Gold history retrieved: "
                f"{len(observations)} observations, "
                f"latest date={history.get('latest_observation_date')}",
            )
        )

        register_artifact(
            state, emit, build_gold_usd_per_ounce_artifact(history)
        )
        register_artifact(
            state, emit, build_gold_usd_per_gram_artifact(history)
        )

        # ---------------------------------------------------------------
        # USD/INR retrieval
        # ---------------------------------------------------------------
        emit(
            create_event(
                "TOOL",
                "Retrieving USD/INR exchange-rate history "
                f"(period={period})",
            )
        )

        try:
            usd_inr_history = get_usd_inr_history(
                period=state.period,
                ticker=state.fx_ticker,
                interval=state.interval,
            )
        except Exception as exc:
            raise ToolExecutionError(
                "USD/INR retrieval failed while preparing the "
                f"gold analysis. Original error: {exc}"
            ) from exc

        if not isinstance(usd_inr_history, dict):
            raise ToolExecutionError(
                "USD/INR retrieval returned an invalid result. "
                "Expected a dictionary."
            )

        fx_observations = usd_inr_history.get("observations")

        if not isinstance(fx_observations, list) or not fx_observations:
            raise ToolExecutionError(
                "USD/INR retrieval returned no usable observations."
            )

        state.usd_inr_history = usd_inr_history

        emit(
            create_event(
                "SUCCESS",
                "USD/INR history retrieved: "
                f"{len(fx_observations)} observations, "
                f"latest date={usd_inr_history.get('latest_observation_date')}",
            )
        )

        register_artifact(
            state, emit, build_usd_inr_artifact(usd_inr_history)
        )

        return {
            "status": "success",
            "gold": {
                "ticker": history.get("ticker"),
                "source": history.get("source"),
                "observation_count": len(observations),
                "latest_observation_date": history.get(
                    "latest_observation_date"
                ),
            },
            "usd_inr": {
                "ticker": usd_inr_history.get("ticker"),
                "source": usd_inr_history.get("source"),
                "observation_count": len(fx_observations),
                "latest_observation_date": (
                    usd_inr_history.get("latest_observation_date")
                ),
            },
            "period": period,
            "message": (
                "Gold and USD/INR source histories were retrieved "
                "successfully. The application will align the datasets "
                "and calculate INR-per-gram statistics."
            ),
        }

    # -----------------------------------------------------------------------
    # analyze_gold_history
    # -----------------------------------------------------------------------
    if tool_name == "analyze_gold_history":
        if not state.history_available:
            raise ToolExecutionError(
                "analyze_gold_history cannot run because "
                "gold history has not been retrieved."
            )

        if not state.usd_inr_history_available:
            raise ToolExecutionError(
                "analyze_gold_history cannot run because "
                "USD/INR history has not been retrieved."
            )

        # ---------------------------------------------------------------
        # Deterministic conversion
        # ---------------------------------------------------------------
        emit(
            create_event(
                "TOOL",
                "Converting and aligning gold and USD/INR data",
            )
        )

        try:
            converted_data = convert_gold_history(
                state.history,
                state.usd_inr_history,
                requested_period=state.period,
            )
        except Exception as exc:
            raise ToolExecutionError(
                "Gold/FX conversion failed while preparing "
                f"INR-per-gram data. Original error: {exc}"
            ) from exc

        if not isinstance(converted_data, dict):
            raise ToolExecutionError(
                "convert_gold_history returned an invalid result. "
                "Expected a dictionary."
            )

        inr_per_gram = converted_data.get("gold_inr_per_gram")

        if not isinstance(inr_per_gram, list) or not inr_per_gram:
            raise ToolExecutionError(
                "Conversion produced no usable INR-per-gram observations."
            )

        state.converted_data = converted_data

        emit(
            create_event(
                "SUCCESS",
                "Gold and USD/INR data aligned successfully: "
                f"{len(inr_per_gram)} INR-per-gram observations",
            )
        )

        register_artifact(
            state, emit, build_gold_inr_per_ounce_artifact(converted_data)
        )
        register_artifact(
            state, emit, build_gold_inr_per_gram_artifact(converted_data)
        )

        # ---------------------------------------------------------------
        # Deterministic analysis
        # ---------------------------------------------------------------
        emit(
            create_event(
                "TOOL",
                "Calculating descriptive statistics from "
                "INR-per-gram data",
            )
        )

        try:
            analysis = analyze_gold_history(inr_per_gram)
        except Exception as exc:
            raise ToolExecutionError(
                "analyze_gold_history failed while calculating "
                f"INR-per-gram statistics. Original error: {exc}"
            ) from exc

        if not isinstance(analysis, dict):
            raise ToolExecutionError(
                "analyze_gold_history returned an invalid result. "
                "Expected a dictionary."
            )

        state.analysis = analysis

        emit(
            create_event(
                "SUCCESS",
                "Historical INR-per-gram statistics calculated successfully",
            )
        )

        register_analysis_report(state, emit)

        return analysis

    raise ToolExecutionError(f"Unhandled tool '{tool_name}'.")


# ---------------------------------------------------------------------------
# Mandatory workflow
# ---------------------------------------------------------------------------

def run_required_tool_step(
    state: AgentState,
    emit: EventHandler,
) -> dict[str, Any]:
    if not state.history_available:
        emit(
            create_event(
                "INFO",
                "Workflow requires market-data retrieval.",
            )
        )
        return execute_tool(
            "get_gold_history",
            {},
            state,
            emit,
        )

    if not state.analysis_available:
        emit(
            create_event(
                "INFO",
                "Workflow requires conversion and statistical analysis.",
            )
        )
        return execute_tool(
            "analyze_gold_history",
            {},
            state,
            emit,
        )

    raise AgentError("No required tool step remains.")


# ---------------------------------------------------------------------------
# Agent runtime
# ---------------------------------------------------------------------------

def run_agent(
    goal: str,
    period: str,
    event_handler: EventHandler | None = None,
) -> AgentResult:
    logger = AgentLogger()

    if event_handler is None:
        event_handler = logger.handle

    state = AgentState(
        goal=goal,
        period=period,
    )

    try:
        return _execute_agent_workflow(state, event_handler)
    except Exception as exc:
        # Attach whatever was produced before the failure so callers can
        # still return the intermediate data.
        try:
            exc.run_metadata = build_run_metadata(state.artifact_files)
        except Exception:
            pass
        raise


def _execute_agent_workflow(
    state: AgentState,
    emit: EventHandler,
) -> AgentResult:
    goal = state.goal
    period = state.period

    emit(
        create_event(
            "START",
            f"GoldInfo agent started using model '{MODEL}'",
        )
    )

    messages: list[Any] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.strip(),
        },
        {
            "role": "user",
            "content": (
                f"{goal}\n\n"
                f"Requested historical data period: {period}."
            ),
        },
    ]

    # -----------------------------------------------------------------------
    # Phase 1: market-data retrieval
    # -----------------------------------------------------------------------
    while not state.history_available:
        emit(
            create_event(
                "MODEL",
                "Requesting model response before market-data retrieval",
            )
        )

        try:
            response = ollama.chat(
                model=MODEL,
                messages=messages,
                tools=TOOLS,
            )
        except Exception as exc:
            raise AgentError(
                "Ollama request failed while retrieving market data. "
                f"Make sure Ollama is running and model '{MODEL}' "
                f"is available. Original error: {exc}"
            ) from exc

        if response is None:
            raise ModelResponseError(
                "Ollama returned no response while requesting "
                "the market-data step."
            )

        message = getattr(response, "message", None)

        if message is None:
            raise ModelResponseError(
                "Ollama returned a response without a message "
                "while requesting the market-data step."
            )

        tool_calls = getattr(message, "tool_calls", None) or []

        if tool_calls:
            messages.append(message)

            tool_call = tool_calls[0]
            function = getattr(tool_call, "function", None)

            if function is None:
                raise ModelResponseError(
                    "Ollama returned a malformed tool call: "
                    "missing function."
                )

            tool_name = getattr(function, "name", None)

            if not isinstance(tool_name, str):
                raise ModelResponseError(
                    "Ollama returned a tool call without a valid "
                    "function name."
                )

            raw_arguments = getattr(function, "arguments", {})
            arguments = parse_tool_arguments(
                tool_name,
                raw_arguments,
            )

            emit(
                create_event(
                    "TOOL",
                    f"Model requested tool '{tool_name}'",
                )
            )

            result = execute_tool(
                tool_name,
                arguments,
                state,
                emit,
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_name": tool_name,
                    "content": json.dumps(result),
                }
            )
            continue

        emit(
            create_event(
                "WARNING",
                "Model attempted to finish before retrieving "
                "market data. Application is enforcing the "
                "required retrieval step.",
            )
        )

        result = run_required_tool_step(state, emit)

        messages.append(
            {
                "role": "tool",
                "tool_name": "get_gold_history",
                "content": json.dumps(result),
            }
        )

    # -----------------------------------------------------------------------
    # Phase 2: conversion + statistical analysis
    # -----------------------------------------------------------------------
    if not state.analysis_available:
        emit(
            create_event(
                "MODEL",
                "Market data is ready. Requesting model continuation "
                "for the analysis step.",
            )
        )

        try:
            response = ollama.chat(
                model=MODEL,
                messages=messages,
                tools=TOOLS,
            )
        except Exception as exc:
            raise AgentError(
                "Ollama request failed before the historical "
                f"analysis step. Original error: {exc}"
            ) from exc

        if response is None:
            raise ModelResponseError(
                "Ollama returned no response before the "
                "historical analysis step."
            )

        message = getattr(response, "message", None)

        if message is None:
            raise ModelResponseError(
                "Ollama returned a response without a message "
                "before the historical analysis step."
            )

        tool_calls = getattr(message, "tool_calls", None) or []

        if tool_calls:
            messages.append(message)
            analysis_tool_found = False

            for tool_call in tool_calls:
                function = getattr(tool_call, "function", None)

                if function is None:
                    raise ModelResponseError(
                        "Ollama returned a malformed tool call: "
                        "missing function."
                    )

                tool_name = getattr(function, "name", None)

                if not isinstance(tool_name, str):
                    raise ModelResponseError(
                        "Ollama returned a tool call without a valid "
                        "function name."
                    )

                raw_arguments = getattr(function, "arguments", {})
                arguments = parse_tool_arguments(
                    tool_name,
                    raw_arguments,
                )

                emit(
                    create_event(
                        "TOOL",
                        f"Model requested tool '{tool_name}'",
                    )
                )

                result = execute_tool(
                    tool_name,
                    arguments,
                    state,
                    emit,
                )

                messages.append(
                    {
                        "role": "tool",
                        "tool_name": tool_name,
                        "content": json.dumps(result),
                    }
                )

                if tool_name == "analyze_gold_history":
                    analysis_tool_found = True

            if not analysis_tool_found:
                emit(
                    create_event(
                        "WARNING",
                        "Model did not request analyze_gold_history. "
                        "Application is enforcing the required "
                        "analysis step.",
                    )
                )

                result = run_required_tool_step(state, emit)

                messages.append(
                    {
                        "role": "tool",
                        "tool_name": "analyze_gold_history",
                        "content": json.dumps(result),
                    }
                )
        else:
            emit(
                create_event(
                    "WARNING",
                    "Model returned final text before calculating "
                    "statistics. Application is enforcing the "
                    "required analysis step.",
                )
            )

            result = run_required_tool_step(state, emit)

            messages.append(
                {
                    "role": "tool",
                    "tool_name": "analyze_gold_history",
                    "content": json.dumps(result),
                }
            )

    # -----------------------------------------------------------------------
    # Validate application state before final interpretation
    # -----------------------------------------------------------------------
    if not state.history_available:
        raise AgentError(
            "Agent cannot produce a final analysis because "
            "market data was not retrieved."
        )

    if not state.usd_inr_history_available:
        raise AgentError(
            "Agent cannot produce a final analysis because "
            "USD/INR data was not retrieved."
        )

    if not state.converted_data_available:
        raise AgentError(
            "Agent cannot produce a final analysis because "
            "market data was not converted to INR per gram."
        )

    if not state.analysis_available:
        raise AgentError(
            "Agent cannot produce a final analysis because "
            "historical statistics were not calculated."
        )

    # -----------------------------------------------------------------------
    # Phase 3: final LLM interpretation
    # -----------------------------------------------------------------------
    emit(
        create_event(
            "MODEL",
            "Data retrieval, conversion, and statistical analysis "
            "are complete. Requesting final interpretation from "
            "the model.",
        )
    )

    messages.append(
        {
            "role": "user",
            "content": (
                "The required Python data-processing workflow is now "
                "complete.\n\n"
                "The application retrieved gold futures and USD/INR "
                "source data, aligned their observation dates, converted "
                "the result to INR per gram, and calculated the historical "
                "statistics.\n\n"
                "Use the following calculated statistics as the "
                "authoritative source for your final response:\n\n"
                f"{json.dumps(state.analysis, indent=2)}\n\n"
                "Provide a concise factual interpretation of the "
                "historical gold price movement in INR per gram. "
                "Mention the relevant period, recent movement, and "
                "historical range position where useful. "
                "Do not predict future prices and do not provide "
                "investment advice."
            ),
        }
    )

    try:
        final_response = ollama.chat(
            model=MODEL,
            messages=messages,
        )
    except Exception as exc:
        raise AgentError(
            "Ollama request failed while generating the final "
            f"interpretation. Original error: {exc}"
        ) from exc

    if final_response is None:
        raise ModelResponseError(
            "Ollama returned no response while generating the "
            "final interpretation."
        )

    final_message = getattr(final_response, "message", None)

    if final_message is None:
        raise ModelResponseError(
            "Ollama returned a response without a message while "
            "generating the final interpretation."
        )

    final_content = getattr(final_message, "content", None)

    if not isinstance(final_content, str):
        raise ModelResponseError(
            "Ollama returned a final message without usable text."
        )

    final_content = final_content.strip()

    if not final_content:
        raise ModelResponseError(
            "Ollama returned an empty final analysis."
        )

    emit(
        create_event(
            "SUCCESS",
            "Final historical interpretation generated successfully.",
        )
    )
    emit(
        create_event(
            "INFO",
            "Agent execution completed successfully.",
        )
    )

    state.interpretation = final_content
    register_analysis_report(state, emit, interpretation=final_content)

    return AgentResult(
        run_id=state.run_id,
        request=state.request_parameters(),
        analysis=state.analysis,
        interpretation=final_content,
        processed_data=state.converted_data,
        metadata=build_run_metadata(state.artifact_files),
        status="success",
    )


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--period", required=True)
    args = parser.parse_args()

    goal = """
Analyze historical gold prices.
Retrieve the historical market data, convert the available data into INR
per gram, calculate the descriptive historical statistics, and provide a
concise factual interpretation of the observed historical movement.
Do not predict future gold prices and do not provide investment
recommendations.
""".strip()

    try:
        result = run_agent(goal, period=args.period)
        print("\n=== FINAL ANALYSIS ===")
        print(result.interpretation)
        print("\n=== METADATA FILES ===")
        for artifact_file in result.metadata["files"]:
            print(f"{artifact_file['filename']}: {artifact_file['description']}")
    except AgentError as exc:
        print("\n=== ANALYSIS FAILED ===")
        print(f"Reason: {exc}")
    except KeyboardInterrupt:
        print("\n=== ANALYSIS CANCELLED ===")
        print("The analysis was stopped by the user.")
    except Exception as exc:
        print("\n=== UNEXPECTED ERROR ===")
        print(
            "The analysis stopped because an unexpected "
            "error occurred."
        )
        print(f"Reason: {exc}")

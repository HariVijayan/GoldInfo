import json
import logging
from datetime import datetime
from typing import Any, Callable

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

from model_pipelines import (
    InvalidModelResponseError,
    ModelPipeline,
    ModelPipelineError,
    RequestedToolCall,
    ToolCallTurn,
    resolve_pipeline,
)

logger = logging.getLogger("goldinfo.agent")

MAX_ITERATIONS = 5

TOOL_GET_GOLD_HISTORY = "get_gold_history"
TOOL_ANALYZE_GOLD_HISTORY = "analyze_gold_history"


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

    # Model that serves this run (set from the resolved pipeline)
    model_id: str = ""
    model_provider: str = ""
    model_supports_tool_calling: bool = False

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
            "model": self.model_id,
            "model_provider": self.model_provider,
            "model_supports_tool_calling": (
                self.model_supports_tool_calling
            ),
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
# Model conversation helpers
# ---------------------------------------------------------------------------

def request_model_tool_calls(
    pipeline: ModelPipeline,
    messages: list[dict[str, Any]],
    stage_description: str,
) -> ToolCallTurn:
    """Ask the model for tool calls and translate pipeline failures."""

    try:
        return pipeline.request_tool_calls(messages, TOOLS)
    except InvalidModelResponseError as exc:
        raise ModelResponseError(
            f"Model '{pipeline.model_id}' gave an unusable response "
            f"{stage_description}. {exc}"
        ) from exc
    except ModelPipelineError as exc:
        raise AgentError(
            f"Model '{pipeline.model_id}' request failed "
            f"{stage_description}. {exc}"
        ) from exc


def generate_model_text(
    pipeline: ModelPipeline,
    messages: list[dict[str, Any]],
    stage_description: str,
) -> str:
    """Ask the model for plain text and translate pipeline failures."""

    try:
        return pipeline.generate_text(messages)
    except InvalidModelResponseError as exc:
        raise ModelResponseError(
            f"Model '{pipeline.model_id}' gave an unusable response "
            f"{stage_description}. {exc}"
        ) from exc
    except ModelPipelineError as exc:
        raise AgentError(
            f"Model '{pipeline.model_id}' request failed "
            f"{stage_description}. {exc}"
        ) from exc


def record_tool_exchange(
    messages: list[dict[str, Any]],
    pipeline: ModelPipeline,
    tool_call: RequestedToolCall,
    tool_result: dict[str, Any],
) -> None:
    """
    Add one tool call and its result to the conversation.

    Models without tool calling never see tool messages: their templates
    do not define them, and the final prompt already contains the numbers.
    """

    if not pipeline.supports_tool_calling:
        return

    messages.append(
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "function": {
                        "name": tool_call.name,
                        "arguments": tool_call.arguments,
                    }
                }
            ],
        }
    )
    messages.append(
        {
            "role": "tool",
            "tool_name": tool_call.name,
            "content": json.dumps(tool_result),
        }
    )


def find_requested_tool_call(
    turn: ToolCallTurn,
    tool_name: str,
) -> RequestedToolCall | None:
    for requested_call in turn.tool_calls:
        if requested_call.name == tool_name:
            return requested_call
    return None


def enforce_required_step(
    state: AgentState,
    emit: EventHandler,
    messages: list[dict[str, Any]],
    pipeline: ModelPipeline,
    tool_name: str,
) -> None:
    """Run a mandatory step the model did not (correctly) request."""

    result = run_required_tool_step(state, emit)
    record_tool_exchange(
        messages,
        pipeline,
        RequestedToolCall(name=tool_name, arguments={}),
        result,
    )


def describe_unrequested_step(
    turn: ToolCallTurn,
    expected_tool_name: str,
) -> str:
    if not turn.tool_calls:
        return (
            f"Model did not request '{expected_tool_name}'. "
            "Application is enforcing the required step."
        )

    requested_names = ", ".join(
        sorted({requested_call.name for requested_call in turn.tool_calls})
    )
    return (
        f"Model requested '{requested_names}' instead of "
        f"'{expected_tool_name}'. Application is enforcing the "
        "required step."
    )


# ---------------------------------------------------------------------------
# Agent runtime
# ---------------------------------------------------------------------------

def run_agent(
    goal: str,
    period: str,
    event_handler: EventHandler | None = None,
    model_pipeline: ModelPipeline | None = None,
) -> AgentResult:
    logger_for_cli = AgentLogger()

    if event_handler is None:
        event_handler = logger_for_cli.handle

    if model_pipeline is None:
        try:
            model_pipeline = resolve_pipeline(None)
        except ModelPipelineError as exc:
            raise AgentError(f"No model is available. {exc}") from exc

    state = AgentState(
        goal=goal,
        period=period,
        model_id=model_pipeline.model_id,
        model_provider=model_pipeline.provider,
        model_supports_tool_calling=model_pipeline.supports_tool_calling,
    )

    logger.info(
        "run=%s started model=%s provider=%s tool_calling=%s period=%s",
        state.run_id,
        state.model_id,
        state.model_provider,
        state.model_supports_tool_calling,
        period,
    )

    try:
        result = _execute_agent_workflow(state, event_handler, model_pipeline)
    except Exception as exc:
        logger.warning(
            "run=%s failed at stage=%s: %s", state.run_id, state.current_stage, exc
        )
        # Attach whatever was produced before the failure so callers can
        # still return the intermediate data.
        try:
            exc.run_metadata = build_run_metadata(state.artifact_files)
        except Exception:
            pass
        raise

    logger.info("run=%s completed", state.run_id)
    return result


def _execute_agent_workflow(
    state: AgentState,
    emit: EventHandler,
    pipeline: ModelPipeline,
) -> AgentResult:
    goal = state.goal
    period = state.period

    emit(
        create_event(
            "START",
            f"GoldInfo agent started using model '{pipeline.model_id}' "
            f"({pipeline.provider}, tool calling: "
            f"{'yes' if pipeline.supports_tool_calling else 'no'})",
        )
    )

    messages: list[dict[str, Any]] = [
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

    if not pipeline.supports_tool_calling:
        # -------------------------------------------------------------------
        # Models without tool calling: the application runs both data steps
        # itself. The model is only used for the final interpretation.
        # -------------------------------------------------------------------
        emit(
            create_event(
                "INFO",
                f"Model '{pipeline.model_id}' does not support tool "
                "calling. The application will run the required data "
                "steps directly.",
            )
        )
        state.current_stage = "data_retrieval"
        enforce_required_step(
            state, emit, messages, pipeline, TOOL_GET_GOLD_HISTORY
        )
        state.current_stage = "conversion_and_analysis"
        enforce_required_step(
            state, emit, messages, pipeline, TOOL_ANALYZE_GOLD_HISTORY
        )
    else:
        # -------------------------------------------------------------------
        # Phase 1: market-data retrieval
        # -------------------------------------------------------------------
        state.current_stage = "data_retrieval"

        while not state.history_available:
            emit(
                create_event(
                    "MODEL",
                    "Requesting model response before market-data "
                    "retrieval",
                )
            )

            turn = request_model_tool_calls(
                pipeline, messages, "before market-data retrieval"
            )
            retrieval_call = find_requested_tool_call(
                turn, TOOL_GET_GOLD_HISTORY
            )

            if retrieval_call is not None:
                emit(
                    create_event(
                        "TOOL",
                        f"Model requested tool '{retrieval_call.name}'",
                    )
                )
                result = execute_tool(
                    retrieval_call.name,
                    retrieval_call.arguments,
                    state,
                    emit,
                )
                record_tool_exchange(
                    messages, pipeline, retrieval_call, result
                )
                continue

            emit(
                create_event(
                    "WARNING",
                    describe_unrequested_step(turn, TOOL_GET_GOLD_HISTORY),
                )
            )
            enforce_required_step(
                state, emit, messages, pipeline, TOOL_GET_GOLD_HISTORY
            )

        # -------------------------------------------------------------------
        # Phase 2: conversion + statistical analysis
        # -------------------------------------------------------------------
        state.current_stage = "conversion_and_analysis"

        if not state.analysis_available:
            emit(
                create_event(
                    "MODEL",
                    "Market data is ready. Requesting model continuation "
                    "for the analysis step.",
                )
            )

            turn = request_model_tool_calls(
                pipeline, messages, "before the historical analysis step"
            )
            analysis_call = find_requested_tool_call(
                turn, TOOL_ANALYZE_GOLD_HISTORY
            )

            if analysis_call is not None:
                emit(
                    create_event(
                        "TOOL",
                        f"Model requested tool '{analysis_call.name}'",
                    )
                )
                result = execute_tool(
                    analysis_call.name,
                    analysis_call.arguments,
                    state,
                    emit,
                )
                record_tool_exchange(
                    messages, pipeline, analysis_call, result
                )
            else:
                emit(
                    create_event(
                        "WARNING",
                        describe_unrequested_step(
                            turn, TOOL_ANALYZE_GOLD_HISTORY
                        ),
                    )
                )
                enforce_required_step(
                    state,
                    emit,
                    messages,
                    pipeline,
                    TOOL_ANALYZE_GOLD_HISTORY,
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
    state.current_stage = "interpretation"

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

    final_content = generate_model_text(
        pipeline, messages, "while generating the final interpretation"
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
    parser.add_argument(
        "--model",
        default=None,
        help="Ollama model to use. Defaults to GOLDINFO_DEFAULT_MODEL.",
    )
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
        result = run_agent(
            goal,
            period=args.period,
            model_pipeline=resolve_pipeline(args.model),
        )
        print("\n=== FINAL ANALYSIS ===")
        print(result.interpretation)
        print("\n=== METADATA FILES ===")
        for artifact_file in result.metadata["files"]:
            print(f"{artifact_file['filename']}: {artifact_file['description']}")
    except (AgentError, ModelPipelineError) as exc:
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

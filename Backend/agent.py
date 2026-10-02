import json
from datetime import datetime
from typing import Any

import ollama

from market_data import get_gold_history
from analysis import analyze_gold_history


MODEL = "qwen2.5:1.5b"
MAX_ITERATIONS = 5


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class AgentError(Exception):
    """Base exception for expected agent-runtime failures."""


class ToolExecutionError(AgentError):
    """Raised when a registered tool cannot be executed successfully."""


class ModelResponseError(AgentError):
    """Raised when the model returns an invalid or unusable response."""


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

class AgentLogger:
    """
    Small structured logger for local debugging.

    Every important agent step receives:
        [step] [status] message
    """

    def __init__(self) -> None:
        self.step = 0

    def log(self, status: str, message: str) -> None:
        self.step += 1

        timestamp = datetime.now().strftime("%H:%M:%S")

        print(
            f"[{self.step:02d}] "
            f"{timestamp} "
            f"{status:<9} "
            f"{message}"
        )

    def start(self, message: str) -> None:
        self.log("START", message)

    def model(self, message: str) -> None:
        self.log("MODEL", message)

    def tool(self, message: str) -> None:
        self.log("TOOL", message)

    def success(self, message: str) -> None:
        self.log("SUCCESS", message)

    def info(self, message: str) -> None:
        self.log("INFO", message)

    def warning(self, message: str) -> None:
        self.log("WARNING", message)

    def error(self, message: str) -> None:
        self.log("ERROR", message)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
You are GoldInfo, a financial market data analysis assistant.

Your task is to analyze historical gold futures prices.

The application controls the required data-processing workflow.

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

The application will retrieve the market data and calculate the
historical statistics before asking you for the final interpretation.
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
                "Retrieve approximately one year of daily gold futures "
                "closing prices for GC=F from Yahoo Finance."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": (
                            "Yahoo Finance period such as '1y', '6mo', "
                            "or '3mo'. Defaults to '1y'."
                        ),
                    }
                },
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
                "gold futures history previously retrieved during this "
                "agent execution. This tool takes no arguments."
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
# Agent state
# ---------------------------------------------------------------------------

class AgentState:

    def __init__(self) -> None:
        self.history: dict[str, Any] | None = None
        self.analysis: dict[str, Any] | None = None

    @property
    def history_available(self) -> bool:
        return self.history is not None

    @property
    def analysis_available(self) -> bool:
        return self.analysis is not None


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    state: AgentState,
    logger: AgentLogger,
) -> dict[str, Any]:

    if tool_name not in {
        "get_gold_history",
        "analyze_gold_history",
    }:
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
    # -----------------------------------------------------------------------

    if tool_name == "get_gold_history":

        period = arguments.get("period", "1y")

        if not isinstance(period, str):
            raise ToolExecutionError(
                "get_gold_history failed because 'period' must be a string."
            )

        period = period.strip()

        if not period:
            raise ToolExecutionError(
                "get_gold_history failed because 'period' cannot be empty."
            )

        logger.tool(
            f"Retrieving gold futures history "
            f"(period={period})"
        )

        try:
            history = get_gold_history(period=period)
        except Exception as exc:
            raise ToolExecutionError(
                "get_gold_history failed while retrieving market data. "
                f"Original error: {exc}"
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

        logger.success(
            "Gold history retrieved: "
            f"{len(observations)} observations, "
            f"latest date={history.get('latest_observation_date')}"
        )

        return {
            "status": "success",
            "ticker": history.get("ticker"),
            "source": history.get("source"),
            "observation_count": len(observations),
            "latest_observation_date": history.get(
                "latest_observation_date"
            ),
            "message": (
                "Gold history retrieved successfully. "
                "The application has stored the full dataset and "
                "will calculate the historical statistics."
            ),
        }

    # -----------------------------------------------------------------------
    # analyze_gold_history
    # -----------------------------------------------------------------------

    if tool_name == "analyze_gold_history":

        if not state.history_available:
            raise ToolExecutionError(
                "analyze_gold_history cannot run because "
                "get_gold_history has not successfully retrieved data."
            )

        logger.tool(
            "Calculating descriptive statistics from retrieved history"
        )

        try:
            analysis = analyze_gold_history(state.history)
        except Exception as exc:
            raise ToolExecutionError(
                "analyze_gold_history failed while calculating "
                f"statistics. Original error: {exc}"
            ) from exc

        if not isinstance(analysis, dict):
            raise ToolExecutionError(
                "analyze_gold_history returned an invalid result. "
                "Expected a dictionary."
            )

        state.analysis = analysis

        logger.success(
            "Historical statistics calculated successfully"
        )

        return analysis

    raise ToolExecutionError(
        f"Unhandled tool '{tool_name}'."
    )


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
# Mandatory workflow
# ---------------------------------------------------------------------------

def run_required_tool_step(
    state: AgentState,
    logger: AgentLogger,
) -> dict[str, Any]:

    """
    Enforce the application workflow.

    The small LLM does not get to accidentally skip mandatory data
    processing steps.

    Required order:

        get_gold_history
            ↓
        analyze_gold_history
            ↓
        final interpretation
    """

    # Step 1: retrieve data.
    if not state.history_available:

        logger.info(
            "Workflow requires market-data retrieval."
        )

        return execute_tool(
            "get_gold_history",
            {},
            state,
            logger,
        )

    # Step 2: calculate statistics.
    if not state.analysis_available:

        logger.info(
            "Workflow requires historical-statistics calculation."
        )

        return execute_tool(
            "analyze_gold_history",
            {},
            state,
            logger,
        )

    raise AgentError(
        "No required tool step remains."
    )


# ---------------------------------------------------------------------------
# Agent runtime
# ---------------------------------------------------------------------------

def run_agent(goal: str) -> str:

    state = AgentState()
    logger = AgentLogger()

    logger.start(
        f"GoldInfo agent started using model '{MODEL}'"
    )

    messages: list[Any] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.strip(),
        },
        {
            "role": "user",
            "content": goal,
        },
    ]

    # -----------------------------------------------------------------------
    # Phase 1 + 2:
    #
    # The application enforces data retrieval and analysis.
    #
    # This avoids depending on a 1.5B model to reliably execute a
    # deterministic two-step workflow.
    # -----------------------------------------------------------------------

    while not state.history_available:

        logger.model(
            "Requesting model response before market-data retrieval"
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

            result = execute_tool(
                tool_name,
                arguments,
                state,
                logger,
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_name": tool_name,
                    "content": json.dumps(result),
                }
            )

            continue

        # Model skipped the required tool.
        #
        # Instead of failing, the application enforces the workflow.
        logger.warning(
            "Model attempted to finish before retrieving market data. "
            "Application is enforcing the required retrieval step."
        )

        result = run_required_tool_step(
            state,
            logger,
        )

        messages.append(
            {
                "role": "tool",
                "tool_name": "get_gold_history",
                "content": json.dumps(result),
            }
        )

    # -----------------------------------------------------------------------
    # Phase 2:
    #
    # History now exists. Analysis is mandatory.
    # -----------------------------------------------------------------------

    if not state.analysis_available:

        logger.model(
            "Market data is ready. Requesting model continuation "
            "for the analysis step."
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

                result = execute_tool(
                    tool_name,
                    arguments,
                    state,
                    logger,
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

                logger.warning(
                    "Model did not request analyze_gold_history. "
                    "Application is enforcing the required analysis step."
                )

                result = run_required_tool_step(
                    state,
                    logger,
                )

                messages.append(
                    {
                        "role": "tool",
                        "tool_name": "analyze_gold_history",
                        "content": json.dumps(result),
                    }
                )

        else:

            # This is exactly the failure we were seeing.
            #
            # Do not fail. The application knows that analysis is
            # mandatory, so execute it directly.
            logger.warning(
                "Model returned final text before calculating statistics. "
                "Application is enforcing the required analysis step."
            )

            result = run_required_tool_step(
                state,
                logger,
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_name": "analyze_gold_history",
                    "content": json.dumps(result),
                }
            )

    # -----------------------------------------------------------------------
    # Phase 3:
    #
    # Both Python tools have completed. Now ask the LLM to interpret.
    # -----------------------------------------------------------------------

    if not state.history_available:
        raise AgentError(
            "Agent cannot produce a final analysis because "
            "market data was not retrieved."
        )

    if not state.analysis_available:
        raise AgentError(
            "Agent cannot produce a final analysis because "
            "historical statistics were not calculated."
        )

    logger.model(
        "Data retrieval and statistical analysis are complete. "
        "Requesting final interpretation from the model."
    )

    # Give the model the authoritative calculated result.
    #
    # The model does not need the raw 252-row history.
    messages.append(
        {
            "role": "user",
            "content": (
                "The required Python analysis is now complete. "
                "Use the following calculated statistics as the "
                "authoritative source for your final response.\n\n"
                f"{json.dumps(state.analysis, indent=2)}\n\n"
                "Provide a concise factual interpretation of the "
                "historical gold price movement. Do not predict "
                "future prices and do not provide investment advice."
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

    logger.success(
        "Final historical interpretation generated successfully."
    )

    logger.info(
        "Agent execution completed successfully."
    )

    return final_content


# ---------------------------------------------------------------------------
# Program entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    goal = """
    Analyze approximately one year of historical gold futures prices.

    Retrieve the historical data, calculate the available descriptive
    statistics, and provide a concise factual interpretation of the
    observed historical movement.

    Do not predict future gold prices and do not provide investment
    recommendations.
    """.strip()

    try:

        result = run_agent(goal)

        print("\n=== FINAL ANALYSIS ===")
        print(result)

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

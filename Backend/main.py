import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import date
from typing import Any, Literal

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from agent import AgentError, AgentEvent, run_agent
from api_routes import (
    ROUTE_ANALYZE,
    ROUTE_ANALYZE_STREAM,
    ROUTE_FORECAST,
    ROUTE_HEALTH,
    ROUTE_MODELS,
    ROUTE_SAVINGS,
    ROUTE_SAVINGS_DATA_RANGE,
)
from forecast_service import (
    DEFAULT_FORECAST_FREQUENCY,
    DEFAULT_FORECAST_HORIZON_WEEKS,
    MAXIMUM_FORECAST_HORIZON_WEEKS,
    ForecastError,
    run_forecast,
)
from model_pipelines import (
    ModelPipeline,
    ModelPipelineError,
    ModelProviderUnavailableError,
    UnknownModelError,
    list_available_models,
    resolve_pipeline,
)
from model_pipelines.registry import MODEL_ID_PATTERN
from savings_calculations import SUPPORTED_COMPOUNDING_MODES
from savings_service import (
    DEFAULT_ANNUAL_INTEREST_RATE_PCT,
    DEFAULT_COMPOUNDING,
    DEFAULT_GOLD_GRAMS,
    MAXIMUM_ANNUAL_INTEREST_RATE_PCT,
    MAXIMUM_GOLD_GRAMS,
    MAXIMUM_INR_SAVINGS_AMOUNT,
    SavingsError,
    get_savings_data_range,
    run_savings_comparison,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


app = FastAPI(
    title="GoldInfo API",
    description="Local gold price analysis agent API",
    version="0.5.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class AnalysisRequest(BaseModel):
    goal: str = Field(
        default=(
            "Analyze historical gold prices and describe "
            "the observed movement."
        ),
        min_length=1,
        max_length=2000,
    )

    period: str = Field(min_length=1)

    # None selects the server default (GOLDINFO_DEFAULT_MODEL).
    model: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        pattern=MODEL_ID_PATTERN.pattern,
    )


class ForecastRequest(BaseModel):
    horizon_weeks: int = Field(
        default=DEFAULT_FORECAST_HORIZON_WEEKS,
        ge=1,
        le=MAXIMUM_FORECAST_HORIZON_WEEKS,
    )
    frequency: Literal["daily", "weekly"] = DEFAULT_FORECAST_FREQUENCY


class SavingsRequest(BaseModel):
    # None means the oldest date with data.
    start_date: date | None = None

    gold_grams: float = Field(
        default=DEFAULT_GOLD_GRAMS,
        gt=0,
        le=MAXIMUM_GOLD_GRAMS,
        allow_inf_nan=False,
    )

    # None means "the same money the gold cost on the start date".
    inr_savings_amount: float | None = Field(
        default=None,
        gt=0,
        le=MAXIMUM_INR_SAVINGS_AMOUNT,
        allow_inf_nan=False,
    )

    annual_interest_rate_pct: float = Field(
        default=DEFAULT_ANNUAL_INTEREST_RATE_PCT,
        ge=0,
        le=MAXIMUM_ANNUAL_INTEREST_RATE_PCT,
        allow_inf_nan=False,
    )

    compounding: Literal[SUPPORTED_COMPOUNDING_MODES] = DEFAULT_COMPOUNDING  # type: ignore[valid-type]


class HealthResponse(BaseModel):
    status: str


def empty_run_metadata() -> dict[str, Any]:
    return {"file_count": 0, "files": []}


def extract_run_metadata(exc: Exception) -> dict[str, Any]:
    """Return the artifacts produced before a failure, if any."""

    return getattr(exc, "run_metadata", None) or empty_run_metadata()


def build_service_error_response(
    exc: ForecastError | SavingsError,
) -> JSONResponse:
    """One error shape for every service that reports its own failures."""

    return JSONResponse(
        status_code=exc.http_status_code,
        content=jsonable_encoder(
            {
                "status": "error",
                "message": str(exc),
                "metadata": extract_run_metadata(exc),
            }
        ),
    )


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Report invalid input in the same shape as every other error."""

    problems = []
    for validation_error in exc.errors():
        field_path = ".".join(
            str(path_part)
            for path_part in validation_error["loc"]
            if path_part != "body"
        )
        problems.append(f"{field_path}: {validation_error['msg']}")

    return JSONResponse(
        status_code=422,
        content=jsonable_encoder(
            {
                "status": "error",
                "message": "Invalid request. " + "; ".join(problems),
                "metadata": empty_run_metadata(),
            }
        ),
    )


@app.exception_handler(ModelPipelineError)
async def handle_model_pipeline_error(
    request: Request,
    exc: ModelPipelineError,
) -> JSONResponse:
    if isinstance(exc, UnknownModelError):
        status_code = 422
    elif isinstance(exc, ModelProviderUnavailableError):
        status_code = 503
    else:
        status_code = 502

    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(
            {
                "status": "error",
                "message": str(exc),
                "metadata": empty_run_metadata(),
            }
        ),
    )


@app.get(ROUTE_HEALTH, response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get(ROUTE_MODELS)
def list_models() -> JSONResponse:
    catalog = list_available_models()

    return JSONResponse(
        content=jsonable_encoder({"status": "success", **catalog.to_dict()})
    )


@app.post(ROUTE_ANALYZE)
def analyze(request: AnalysisRequest) -> JSONResponse:
    # Raises (and is answered by the handler above) before any work starts.
    model_pipeline = resolve_pipeline(request.model)

    try:
        result = run_agent(
            goal=request.goal,
            period=request.period,
            model_pipeline=model_pipeline,
        )
    except AgentError as exc:
        return JSONResponse(
            content=jsonable_encoder(
                {
                    "status": "error",
                    "interpretation": f"Analysis failed: {exc}",
                    "metadata": extract_run_metadata(exc),
                }
            )
        )

    return JSONResponse(content=jsonable_encoder(result))


@app.post(ROUTE_FORECAST)
def forecast(request: ForecastRequest | None = None) -> JSONResponse:
    forecast_request = request or ForecastRequest()

    try:
        result = run_forecast(
            horizon_weeks=forecast_request.horizon_weeks,
            frequency=forecast_request.frequency,
        )
    except ForecastError as exc:
        return build_service_error_response(exc)

    return JSONResponse(content=jsonable_encoder(result))


@app.get(ROUTE_SAVINGS_DATA_RANGE)
def savings_data_range() -> JSONResponse:
    try:
        result = get_savings_data_range()
    except SavingsError as exc:
        return build_service_error_response(exc)

    return JSONResponse(content=jsonable_encoder(result))


@app.post(ROUTE_SAVINGS)
def savings(request: SavingsRequest | None = None) -> JSONResponse:
    savings_request = request or SavingsRequest()

    try:
        result = run_savings_comparison(
            start_date=savings_request.start_date,
            gold_grams=savings_request.gold_grams,
            inr_savings_amount=savings_request.inr_savings_amount,
            annual_interest_rate_pct=savings_request.annual_interest_rate_pct,
            compounding=savings_request.compounding,
        )
    except SavingsError as exc:
        return build_service_error_response(exc)

    return JSONResponse(content=jsonable_encoder(result))


def format_sse(event_name: str, data: dict) -> str:
    return (
        f"event: {event_name}\n"
        f"data: {json.dumps(jsonable_encoder(data))}\n\n"
    )


def format_agent_event(event: AgentEvent) -> list[str]:
    """
    One agent event becomes a lightweight "status" message, plus an
    "artifact" message when the event carries a file.
    """

    messages = [
        format_sse(
            "status",
            {
                "type": event.type,
                "message": event.message,
                "timestamp": event.timestamp,
            },
        )
    ]

    if event.artifact is not None:
        messages.append(format_sse("artifact", event.artifact))

    return messages


async def analysis_stream(
    goal: str,
    period: str,
    model_pipeline: ModelPipeline,
) -> AsyncGenerator[str, None]:

    event_loop = asyncio.get_running_loop()
    queue: asyncio.Queue[AgentEvent] = asyncio.Queue()

    def handle_event(event: AgentEvent) -> None:
        # The agent runs in a worker thread; hand events to the loop safely.
        event_loop.call_soon_threadsafe(queue.put_nowait, event)

    agent_task = asyncio.create_task(
        asyncio.to_thread(
            run_agent,
            goal,
            period,
            handle_event,
            model_pipeline,
        )
    )

    try:
        while True:
            while not queue.empty():
                for message in format_agent_event(queue.get_nowait()):
                    yield message

            if agent_task.done():
                break

            await asyncio.sleep(0.05)

        try:
            result = agent_task.result()

        except AgentError as exc:
            yield format_sse(
                "error",
                {
                    "type": "ERROR",
                    "message": str(exc),
                    "metadata": extract_run_metadata(exc),
                },
            )

        except Exception as exc:
            yield format_sse(
                "error",
                {
                    "type": "ERROR",
                    "message": (
                        "An unexpected server error occurred. "
                        f"Reason: {exc}"
                    ),
                    "metadata": extract_run_metadata(exc),
                },
            )

        else:
            yield format_sse("final", result)

    finally:
        if not agent_task.done():
            agent_task.cancel()


@app.post(ROUTE_ANALYZE_STREAM)
async def analyze_stream(
    request: AnalysisRequest,
) -> StreamingResponse:
    # Resolve before streaming starts so a bad model name is answered with
    # a proper HTTP error instead of a stream that fails immediately.
    model_pipeline = await asyncio.to_thread(resolve_pipeline, request.model)

    return StreamingResponse(
        analysis_stream(
            request.goal,
            request.period,
            model_pipeline,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )

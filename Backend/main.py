import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from typing import Any, Literal

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from agent import AgentError, AgentEvent, run_agent
from forecast_service import (
    DEFAULT_FORECAST_FREQUENCY,
    DEFAULT_FORECAST_HORIZON_WEEKS,
    MAXIMUM_FORECAST_HORIZON_WEEKS,
    ForecastError,
    run_forecast,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


app = FastAPI(
    title="GoldInfo API",
    description="Local gold price analysis agent API",
    version="0.4.0",
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


class ForecastRequest(BaseModel):
    horizon_weeks: int = Field(
        default=DEFAULT_FORECAST_HORIZON_WEEKS,
        ge=1,
        le=MAXIMUM_FORECAST_HORIZON_WEEKS,
    )
    frequency: Literal["daily", "weekly"] = DEFAULT_FORECAST_FREQUENCY


class HealthResponse(BaseModel):
    status: str


def empty_run_metadata() -> dict[str, Any]:
    return {"file_count": 0, "files": []}


def extract_run_metadata(exc: Exception) -> dict[str, Any]:
    """Return the artifacts produced before a failure, if any."""

    return getattr(exc, "run_metadata", None) or empty_run_metadata()


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/api/analyze")
def analyze(request: AnalysisRequest) -> JSONResponse:
    try:
        result = run_agent(
            goal=request.goal,
            period=request.period,
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


@app.post("/api/forecast")
def forecast(request: ForecastRequest | None = None) -> JSONResponse:
    forecast_request = request or ForecastRequest()

    try:
        result = run_forecast(
            horizon_weeks=forecast_request.horizon_weeks,
            frequency=forecast_request.frequency,
        )
    except ForecastError as exc:
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


@app.post("/api/analyze/stream")
async def analyze_stream(
    request: AnalysisRequest,
) -> StreamingResponse:
    return StreamingResponse(
        analysis_stream(
            request.goal,
            request.period,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )

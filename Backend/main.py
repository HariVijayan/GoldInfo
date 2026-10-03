import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import AgentError, AgentEvent, run_agent


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GoldInfo API",
    description="Local gold price analysis agent API",
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    goal: str


class AnalysisResponse(BaseModel):
    status: str
    analysis: str


class HealthResponse(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

@app.get(
    "/api/health",
    response_model=HealthResponse,
)
def health_check() -> HealthResponse:

    return HealthResponse(
        status="ok",
    )


# ---------------------------------------------------------------------------
# Standard analysis endpoint
# ---------------------------------------------------------------------------

@app.post(
    "/api/analyze",
    response_model=AnalysisResponse,
)
def analyze(request: AnalysisRequest) -> AnalysisResponse:

    try:

        result = run_agent(request.goal)

        return AnalysisResponse(
            status="success",
            analysis=result,
        )

    except AgentError as exc:

        return AnalysisResponse(
            status="error",
            analysis=f"Analysis failed: {exc}",
        )


# ---------------------------------------------------------------------------
# SSE helper
# ---------------------------------------------------------------------------

def format_sse(
    event_name: str,
    data: dict,
) -> str:

    return (
        f"event: {event_name}\n"
        f"data: {json.dumps(data)}\n\n"
    )


# ---------------------------------------------------------------------------
# Streaming analysis
# ---------------------------------------------------------------------------

async def analysis_stream(
    goal: str,
) -> AsyncGenerator[str, None]:

    queue: asyncio.Queue[AgentEvent | None] = asyncio.Queue()

    def handle_event(event: AgentEvent) -> None:
        queue.put_nowait(event)

    # -----------------------------------------------------------------------
    # Run the synchronous agent in a worker thread.
    #
    # This is important because run_agent() performs blocking operations:
    #     - yfinance
    #     - Ollama
    #
    # We don't want those operations blocking FastAPI's event loop.
    # -----------------------------------------------------------------------

    agent_task = asyncio.create_task(
        asyncio.to_thread(
            run_agent,
            goal,
            handle_event,
        )
    )

    try:

        while True:

            # ---------------------------------------------------------------
            # If an event is available, stream it immediately.
            # ---------------------------------------------------------------

            if not queue.empty():

                event = await queue.get()

                if event is None:
                    break

                yield format_sse(
                    "status",
                    {
                        "type": event.type,
                        "message": event.message,
                        "timestamp": event.timestamp,
                    },
                )

                continue

            # ---------------------------------------------------------------
            # Agent completed.
            # ---------------------------------------------------------------

            if agent_task.done():

                try:
                    result = agent_task.result()

                except AgentError as exc:

                    yield format_sse(
                        "error",
                        {
                            "type": "ERROR",
                            "message": str(exc),
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
                        },
                    )

                else:

                    yield format_sse(
                        "final",
                        {
                            "status": "success",
                            "analysis": result,
                        },
                    )

                break

            # ---------------------------------------------------------------
            # Give the event loop a chance to process other requests.
            # ---------------------------------------------------------------

            await asyncio.sleep(0.05)

    finally:

        if not agent_task.done():
            agent_task.cancel()


# ---------------------------------------------------------------------------
# SSE endpoint
# ---------------------------------------------------------------------------

@app.post("/api/analyze/stream")
async def analyze_stream(
    request: AnalysisRequest,
) -> StreamingResponse:

    return StreamingResponse(
        analysis_stream(request.goal),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )

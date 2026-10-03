import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import AgentError, AgentEvent, run_agent


app = FastAPI(
    title="GoldInfo API",
    description="Local gold price analysis agent API",
    version="0.1.0",
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
    goal: str


class AnalysisResponse(BaseModel):
    status: str
    analysis: str


class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/api/analyze", response_model=AnalysisResponse)
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


def format_sse(event_name: str, data: dict) -> str:
    return (
        f"event: {event_name}\n"
        f"data: {json.dumps(data)}\n\n"
    )


async def analysis_stream(
    goal: str,
) -> AsyncGenerator[str, None]:

    queue: asyncio.Queue[AgentEvent | None] = asyncio.Queue()

    def handle_event(event: AgentEvent) -> None:
        queue.put_nowait(event)

    agent_task = asyncio.create_task(
        asyncio.to_thread(
            run_agent,
            goal,
            handle_event,
        )
    )

    try:
        while True:

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

            await asyncio.sleep(0.05)

    finally:
        if not agent_task.done():
            agent_task.cancel()


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

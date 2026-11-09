"""
Provider-neutral contracts for language-model pipelines.

The agent never talks to a model provider directly. It talks to a
ModelPipeline, and each pipeline owns everything provider-specific: the
client, error translation, and cleaning of the returned text.

Conversation format (shared by every pipeline)
----------------------------------------------
Messages are plain dictionaries:

    {"role": "system" | "user", "content": str}
    {"role": "assistant", "content": str,
     "tool_calls": [{"function": {"name": str, "arguments": dict}}]}
    {"role": "tool", "tool_name": str, "content": str}

A pipeline translates this format into whatever its provider expects.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class ModelPipelineError(Exception):
    """Base class for every expected model-pipeline failure."""


class UnknownModelError(ModelPipelineError):
    """The requested model is invalid, not installed, or cannot chat."""


class ModelProviderUnavailableError(ModelPipelineError):
    """The provider could not be reached (for example Ollama is stopped)."""


class InvalidModelResponseError(ModelPipelineError):
    """The provider answered, but the answer is unusable."""


# ---------------------------------------------------------------------------
# Data contracts
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AvailableModel:
    """One selectable model, as shown in the UI model picker."""

    model_id: str
    provider: str
    display_name: str
    supports_tool_calling: bool
    parameter_size: str | None = None
    family: str | None = None
    quantization: str | None = None
    size_bytes: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_id": self.model_id,
            "provider": self.provider,
            "display_name": self.display_name,
            "supports_tool_calling": self.supports_tool_calling,
            "parameter_size": self.parameter_size,
            "family": self.family,
            "quantization": self.quantization,
            "size_bytes": self.size_bytes,
        }


@dataclass(frozen=True)
class ProviderStatus:
    provider: str
    is_reachable: bool
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "is_reachable": self.is_reachable,
            "message": self.message,
        }


@dataclass(frozen=True)
class ModelCatalog:
    models: list[AvailableModel]
    default_model_id: str
    provider_statuses: list[ProviderStatus]
    warnings: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "default_model_id": self.default_model_id,
            "models": [model.to_dict() for model in self.models],
            "providers": [
                status.to_dict() for status in self.provider_statuses
            ],
            "warnings": list(self.warnings),
        }


@dataclass(frozen=True)
class RequestedToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ToolCallTurn:
    """What the model asked for in one turn. May hold no tool calls."""

    tool_calls: list[RequestedToolCall]


# ---------------------------------------------------------------------------
# Pipeline interface
# ---------------------------------------------------------------------------


class ModelPipeline(ABC):
    """One model behind one provider, with its own request handling."""

    def __init__(self, descriptor: AvailableModel) -> None:
        self.descriptor = descriptor

    @property
    def model_id(self) -> str:
        return self.descriptor.model_id

    @property
    def provider(self) -> str:
        return self.descriptor.provider

    @property
    def supports_tool_calling(self) -> bool:
        return self.descriptor.supports_tool_calling

    def request_tool_calls(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> ToolCallTurn:
        """Ask the model which tools it wants. Tool-capable pipelines only."""

        raise ModelPipelineError(
            f"Model '{self.model_id}' does not support tool calling."
        )

    @abstractmethod
    def generate_text(self, messages: list[dict[str, Any]]) -> str:
        """Return the model's plain-text answer, cleaned and non-empty."""

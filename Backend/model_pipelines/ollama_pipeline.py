"""Pipelines for models served by a local Ollama instance."""

from __future__ import annotations

import json
import re
from typing import Any

import ollama

from model_pipelines.base import (
    InvalidModelResponseError,
    ModelPipeline,
    ModelPipelineError,
    ModelProviderUnavailableError,
    RequestedToolCall,
    ToolCallTurn,
    UnknownModelError,
)

OLLAMA_PROVIDER = "ollama"

# A low temperature keeps the written interpretation close to the numbers.
FINAL_TEXT_TEMPERATURE = 0.2

# Reasoning models (deepseek-r1, qwen3, ...) may inline their reasoning.
_REASONING_BLOCK_PATTERN = re.compile(
    r"<think>.*?</think>", flags=re.DOTALL | re.IGNORECASE
)


def strip_reasoning_blocks(model_text: str) -> str:
    return _REASONING_BLOCK_PATTERN.sub("", model_text).strip()


def normalize_tool_arguments(
    tool_name: str,
    raw_arguments: Any,
) -> dict[str, Any]:
    """Accept the dict or JSON-string forms models are known to return."""

    if raw_arguments is None:
        return {}

    if isinstance(raw_arguments, dict):
        return dict(raw_arguments)

    if isinstance(raw_arguments, str):
        try:
            parsed_arguments = json.loads(raw_arguments)
        except json.JSONDecodeError as exc:
            raise InvalidModelResponseError(
                f"The model returned malformed JSON arguments for tool "
                f"'{tool_name}'. Original error: {exc}"
            ) from exc

        if not isinstance(parsed_arguments, dict):
            raise InvalidModelResponseError(
                f"The model returned invalid arguments for tool "
                f"'{tool_name}'. Expected a JSON object."
            )

        return parsed_arguments

    # The ollama client returns a read-only mapping type.
    try:
        return dict(raw_arguments)
    except (TypeError, ValueError) as exc:
        raise InvalidModelResponseError(
            f"The model returned unsupported arguments for tool "
            f"'{tool_name}'."
        ) from exc


class OllamaPipelineBase(ModelPipeline):
    """Shared request handling. Subclasses decide on tool calling."""

    def __init__(self, descriptor, client: ollama.Client) -> None:
        super().__init__(descriptor)
        self._client = client

    def _chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        options: dict[str, Any] | None = None,
    ) -> Any:
        request_arguments: dict[str, Any] = {
            "model": self.model_id,
            "messages": messages,
        }
        if tools:
            request_arguments["tools"] = tools
        if options:
            request_arguments["options"] = options

        try:
            response = self._client.chat(**request_arguments)
        except ollama.ResponseError as exc:
            if exc.status_code == 404:
                raise UnknownModelError(
                    f"Ollama does not have model '{self.model_id}'."
                ) from exc
            raise ModelPipelineError(
                f"Ollama rejected the request for model "
                f"'{self.model_id}' (HTTP {exc.status_code}): {exc.error}"
            ) from exc
        except ConnectionError as exc:
            raise ModelProviderUnavailableError(
                "Could not reach Ollama. Make sure it is running."
            ) from exc
        except Exception as exc:
            raise ModelPipelineError(
                f"The request to model '{self.model_id}' failed: {exc}"
            ) from exc

        message = getattr(response, "message", None)
        if message is None:
            raise InvalidModelResponseError(
                f"Model '{self.model_id}' returned a response without "
                "a message."
            )
        return message

    def generate_text(self, messages: list[dict[str, Any]]) -> str:
        message = self._chat(
            messages,
            options={"temperature": FINAL_TEXT_TEMPERATURE},
        )

        content = getattr(message, "content", None)
        if not isinstance(content, str):
            raise InvalidModelResponseError(
                f"Model '{self.model_id}' returned a final message "
                "without usable text."
            )

        cleaned_content = strip_reasoning_blocks(content)
        if not cleaned_content:
            raise InvalidModelResponseError(
                f"Model '{self.model_id}' returned an empty answer."
            )

        return cleaned_content


class OllamaToolCallingPipeline(OllamaPipelineBase):
    """For models Ollama reports as tool-capable."""

    def request_tool_calls(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> ToolCallTurn:
        message = self._chat(messages, tools=tools)
        raw_tool_calls = getattr(message, "tool_calls", None) or []

        requested_calls: list[RequestedToolCall] = []

        for raw_tool_call in raw_tool_calls:
            function = getattr(raw_tool_call, "function", None)
            if function is None:
                raise InvalidModelResponseError(
                    "The model returned a malformed tool call: "
                    "missing function."
                )

            tool_name = getattr(function, "name", None)
            if not isinstance(tool_name, str) or not tool_name:
                raise InvalidModelResponseError(
                    "The model returned a tool call without a valid "
                    "function name."
                )

            requested_calls.append(
                RequestedToolCall(
                    name=tool_name,
                    arguments=normalize_tool_arguments(
                        tool_name,
                        getattr(function, "arguments", None),
                    ),
                )
            )

        return ToolCallTurn(tool_calls=requested_calls)


class OllamaPlainPipeline(OllamaPipelineBase):
    """
    For models without tool calling.

    The agent skips the tool-request turns entirely for these models: the
    application runs the data steps itself and the model only writes the
    final interpretation from the calculated statistics.
    """

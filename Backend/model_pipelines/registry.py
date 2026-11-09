"""
Model discovery and pipeline selection.

Ollama is the only provider today. To add another one, implement a
ModelPipeline for it, list its models in list_available_models, and return
its pipeline from resolve_pipeline. Model ids will then need a provider
prefix, because Ollama ids such as "qwen2.5:1.5b" are not namespaced.
"""

from __future__ import annotations

import logging
import os
import re

import ollama

from model_pipelines.base import (
    AvailableModel,
    ModelCatalog,
    ModelPipeline,
    ModelProviderUnavailableError,
    ProviderStatus,
    UnknownModelError,
)
from model_pipelines.ollama_pipeline import (
    OLLAMA_PROVIDER,
    OllamaPlainPipeline,
    OllamaToolCallingPipeline,
)

logger = logging.getLogger("goldinfo.models")

FALLBACK_DEFAULT_MODEL_ID = "qwen2.5:1.5b"
DEFAULT_MODEL_ENVIRONMENT_VARIABLE = "GOLDINFO_DEFAULT_MODEL"

MODEL_TIMEOUT_ENVIRONMENT_VARIABLE = "GOLDINFO_MODEL_TIMEOUT_SECONDS"
DEFAULT_MODEL_TIMEOUT_SECONDS = 300.0

# Letters, digits, and the separators Ollama uses in names and tags.
MODEL_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,99}$")

CAPABILITY_TEXT_GENERATION = "completion"
CAPABILITY_TOOL_CALLING = "tools"


def get_default_model_id() -> str:
    configured_model_id = os.environ.get(DEFAULT_MODEL_ENVIRONMENT_VARIABLE)
    if configured_model_id and MODEL_ID_PATTERN.match(
        configured_model_id.strip()
    ):
        return configured_model_id.strip()
    return FALLBACK_DEFAULT_MODEL_ID


def _read_timeout_seconds() -> float:
    raw_timeout = os.environ.get(MODEL_TIMEOUT_ENVIRONMENT_VARIABLE)
    if raw_timeout is None:
        return DEFAULT_MODEL_TIMEOUT_SECONDS
    try:
        timeout_seconds = float(raw_timeout)
    except ValueError:
        logger.warning(
            "Ignoring invalid %s value %r",
            MODEL_TIMEOUT_ENVIRONMENT_VARIABLE,
            raw_timeout,
        )
        return DEFAULT_MODEL_TIMEOUT_SECONDS
    return timeout_seconds if timeout_seconds > 0 else (
        DEFAULT_MODEL_TIMEOUT_SECONDS
    )


def build_ollama_client() -> ollama.Client:
    """The host comes from OLLAMA_HOST, the library's own setting."""

    return ollama.Client(timeout=_read_timeout_seconds())


def _describe_ollama_model(
    model_id: str,
    show_response,
    size_bytes: int | None,
) -> AvailableModel | None:
    """Return None for models that cannot generate text (embedders)."""

    capabilities = getattr(show_response, "capabilities", None)

    # Servers that predate capability reporting give None. Treat those
    # models as plain text generators, which always works.
    if capabilities is not None:
        if CAPABILITY_TEXT_GENERATION not in capabilities:
            return None
        supports_tool_calling = CAPABILITY_TOOL_CALLING in capabilities
    else:
        supports_tool_calling = False

    details = getattr(show_response, "details", None)

    return AvailableModel(
        model_id=model_id,
        provider=OLLAMA_PROVIDER,
        display_name=model_id,
        supports_tool_calling=supports_tool_calling,
        parameter_size=getattr(details, "parameter_size", None),
        family=getattr(details, "family", None),
        quantization=getattr(details, "quantization_level", None),
        size_bytes=size_bytes,
    )


def list_available_models() -> ModelCatalog:
    """List installed models. Never raises when Ollama is down."""

    default_model_id = get_default_model_id()
    client = build_ollama_client()
    warnings: list[str] = []

    try:
        listing = client.list()
    except ConnectionError:
        return ModelCatalog(
            models=[],
            default_model_id=default_model_id,
            provider_statuses=[
                ProviderStatus(
                    OLLAMA_PROVIDER,
                    False,
                    "Could not reach Ollama. Make sure it is running.",
                )
            ],
            warnings=[],
        )
    except Exception as exc:
        logger.exception("Listing Ollama models failed")
        return ModelCatalog(
            models=[],
            default_model_id=default_model_id,
            provider_statuses=[
                ProviderStatus(
                    OLLAMA_PROVIDER,
                    False,
                    f"Ollama could not list its models: {exc}",
                )
            ],
            warnings=[],
        )

    available_models: list[AvailableModel] = []

    for listed_model in listing.models:
        model_id = listed_model.model
        if not model_id:
            continue

        try:
            show_response = client.show(model_id)
        except Exception as exc:
            logger.warning("Skipping model %s: %s", model_id, exc)
            warnings.append(
                f"Model '{model_id}' was skipped because its details "
                "could not be read."
            )
            continue

        model = _describe_ollama_model(
            model_id, show_response, getattr(listed_model, "size", None)
        )
        if model is not None:
            available_models.append(model)

    available_models.sort(key=lambda model: model.display_name.lower())

    return ModelCatalog(
        models=available_models,
        default_model_id=default_model_id,
        provider_statuses=[
            ProviderStatus(
                OLLAMA_PROVIDER,
                True,
                f"{len(available_models)} model(s) available.",
            )
        ],
        warnings=warnings,
    )


def resolve_pipeline(model_id: str | None) -> ModelPipeline:
    """
    Build the pipeline for one model. Validates before any model call.

    Raises UnknownModelError for an invalid, missing, or non-chat model and
    ModelProviderUnavailableError when Ollama cannot be reached.
    """

    requested_model_id = (model_id or get_default_model_id()).strip()

    if not MODEL_ID_PATTERN.match(requested_model_id):
        raise UnknownModelError(
            "The model name is not valid. Use the name shown in the "
            "model list."
        )

    client = build_ollama_client()

    try:
        show_response = client.show(requested_model_id)
    except ollama.ResponseError as exc:
        if exc.status_code == 404:
            raise UnknownModelError(
                f"Model '{requested_model_id}' is not installed in "
                f"Ollama. Install it with: ollama pull "
                f"{requested_model_id}"
            ) from exc
        raise ModelProviderUnavailableError(
            f"Ollama could not describe model '{requested_model_id}' "
            f"(HTTP {exc.status_code}): {exc.error}"
        ) from exc
    except ConnectionError as exc:
        raise ModelProviderUnavailableError(
            "Could not reach Ollama. Make sure it is running."
        ) from exc

    descriptor = _describe_ollama_model(
        requested_model_id, show_response, size_bytes=None
    )

    if descriptor is None:
        raise UnknownModelError(
            f"Model '{requested_model_id}' cannot generate text, so it "
            "cannot write an analysis."
        )

    if descriptor.supports_tool_calling:
        return OllamaToolCallingPipeline(descriptor, client)

    return OllamaPlainPipeline(descriptor, client)

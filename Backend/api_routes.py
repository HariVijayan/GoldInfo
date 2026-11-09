"""
Central registry of every backend URL path.

main.py registers the handlers against these constants, and the frontend
mirrors them in Frontend/src/config/apiRoutes.ts. Change a path here first,
then update the frontend mirror.
"""

API_PREFIX = "/api"

ROUTE_HEALTH = f"{API_PREFIX}/health"

ROUTE_MODELS = f"{API_PREFIX}/models"

ROUTE_ANALYZE = f"{API_PREFIX}/analyze"
ROUTE_ANALYZE_STREAM = f"{API_PREFIX}/analyze/stream"

ROUTE_FORECAST = f"{API_PREFIX}/forecast"

ROUTE_SAVINGS = f"{API_PREFIX}/savings"
ROUTE_SAVINGS_DATA_RANGE = f"{API_PREFIX}/savings/data-range"

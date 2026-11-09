/**
 * Every backend URL in one place. Keep these paths identical to
 * Backend/api_routes.py: change that file first, then this one.
 */
export const API_BASE_URL = "http://127.0.0.1:8000";

export const API_ROUTES = {
  health: "/api/health",
  models: "/api/models",
  analyze: "/api/analyze",
  analyzeStream: "/api/analyze/stream",
  forecast: "/api/forecast",
  savings: "/api/savings",
  savingsDataRange: "/api/savings/data-range",
} as const;

export function buildApiUrl(routePath: string): string {
  return `${API_BASE_URL}${routePath}`;
}

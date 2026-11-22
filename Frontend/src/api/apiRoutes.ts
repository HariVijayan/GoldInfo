/**
 * The single place that says where the backend lives and which paths it
 * offers. Every request in the app is built from this file.
 *
 * To point the whole frontend at another server, change DEFAULT_API_BASE_URL
 * below, or set VITE_API_BASE_URL in a .env file (see .env.example). Nothing
 * else needs to change. Keep the paths identical to Backend/api_routes.py.
 */
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

/** Reads the base URL and refuses anything that is not a plain http(s) origin. */
function resolveApiBaseUrl(configuredBaseUrl: string | undefined): string {
  const candidate = (configuredBaseUrl ?? "").trim() || DEFAULT_API_BASE_URL;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    throw new Error("The API base URL is not a valid URL. Check VITE_API_BASE_URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("The API base URL must use http or https.");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("The API base URL must not contain credentials.");
  }

  // Keep a path prefix if there is one, drop any trailing slash.
  return `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const API_ROUTES = {
  health: "/api/health",
  models: "/api/models",
  analyze: "/api/analyze",
  analyzeStream: "/api/analyze/stream",
  forecast: "/api/forecast",
  savings: "/api/savings",
  savingsDataRange: "/api/savings/data-range",
  savingsMonthly: "/api/savings/monthly",
} as const;

export type ApiRoutePath = (typeof API_ROUTES)[keyof typeof API_ROUTES];

export function buildApiUrl(routePath: ApiRoutePath): string {
  return `${API_BASE_URL}${routePath}`;
}

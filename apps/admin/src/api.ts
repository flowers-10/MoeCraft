import { API_BASE_URL } from "./config";
import type { ApiErrorResponse, ApiResponse } from "@moecraft/shared";

export type ApiError = { code: string; message: string; status: number };
let refreshInFlight: Promise<string | null> | null = null;

async function refresh() {
  const token = sessionStorage.getItem("mc-admin-refresh");
  if (!token) return null;
  refreshInFlight ??= fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: token }) })
    .then(async (response) => {
      if (!response.ok) return null;
      const envelope = await response.json() as ApiResponse<{ accessToken: string; refreshToken: string }>;
      const data = envelope.resultData;
      sessionStorage.setItem("mc-admin-token", data.accessToken);
      sessionStorage.setItem("mc-admin-refresh", data.refreshToken);
      return data.accessToken;
    }).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const execute = (token: string | null) => fetch(`${API_BASE_URL}${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(15_000), headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "", "X-Request-Id": crypto.randomUUID(), "X-Locale": localStorage.getItem("mc-locale") ?? "zh-CN", "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone, ...init.headers } });
  let response = await execute(sessionStorage.getItem("mc-admin-token"));
  if (response.status === 401) { const token = await refresh(); if (token) response = await execute(token); }
  if (!response.ok) {
    const error = await response.json().catch(() => null) as ApiErrorResponse | null;
    throw { code: error?.code ?? "REQUEST_FAILED", message: error?.message ?? response.statusText, status: response.status } satisfies ApiError;
  }
  const body = await response.text();
  if (!body) return null as T;
  const envelope = JSON.parse(body) as ApiResponse<T>;
  return envelope.resultData;
}

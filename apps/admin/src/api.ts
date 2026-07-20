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
  const execute = (token: string | null) => {
    const headers = new Headers(init.headers);
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (isFormData) headers.delete("Content-Type");
    else if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Request-Id", crypto.randomUUID());
    headers.set("X-Locale", localStorage.getItem("mc-locale") ?? "zh-CN");
    headers.set("X-Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    return fetch(`${API_BASE_URL}${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(15_000), headers });
  };
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

export async function uploadFile<T = { id: string }>(purpose: string, file: File) {
  const formData = new FormData();
  formData.append("purpose", purpose);
  formData.append("file", file);
  return apiRequest<T>("/files", { method: "POST", body: formData });
}

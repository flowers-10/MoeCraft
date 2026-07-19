import type { ApiResponse } from "@moecraft/shared";
type AuthUser = { id: string; username: string; displayName: string; roles: string[] };
type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser };

export function useAuthSession() {
  const user = useState<AuthUser | null>("auth-user", () => null);
  const accessToken = useCookie<string | null>("mc-access", { sameSite: "lax", secure: !import.meta.dev });
  const refreshToken = useCookie<string | null>("mc-refresh", { sameSite: "strict", secure: !import.meta.dev });
  const config = useRuntimeConfig();

  function accept(response: AuthResponse) {
    user.value = response.user;
    accessToken.value = response.accessToken;
    refreshToken.value = response.refreshToken;
  }

  async function login(account: string, password: string) {
    accept((await $fetch<ApiResponse<AuthResponse>>(`${config.public.apiBase}/auth/login`, { method: "POST", body: { account, password } })).resultData);
  }

  async function register(username: string, displayName: string, password: string) {
    accept((await $fetch<ApiResponse<AuthResponse>>(`${config.public.apiBase}/auth/register`, { method: "POST", body: { username, displayName, password } })).resultData);
  }

  async function restore() {
    if (!accessToken.value) return false;
    try {
      user.value = (await $fetch<ApiResponse<AuthUser>>(`${config.public.apiBase}/auth/me`, { headers: { Authorization: `Bearer ${accessToken.value}` } })).resultData;
      return true;
    } catch { user.value = null; accessToken.value = null; return false; }
  }

  async function logout() {
    if (refreshToken.value) await $fetch(`${config.public.apiBase}/auth/logout`, { method: "POST", body: { refreshToken: refreshToken.value } }).catch(() => undefined);
    user.value = null; accessToken.value = null; refreshToken.value = null;
  }

  return { user, accessToken, refreshToken, login, register, restore, logout };
}

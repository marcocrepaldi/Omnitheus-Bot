const API = process.env.NEXT_PUBLIC_API_URL;

export interface AuthUser {
  nome: string;
  role: string;
  tenant_id: number;
  access_token: string;
  refresh_token: string;
}

export function salvarSessao(data: AuthUser) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user", JSON.stringify({ nome: data.nome, role: data.role, tenant_id: data.tenant_id }));
  // Cookie para o middleware Next.js poder verificar autenticação server-side
  document.cookie = `access_token=${data.access_token}; path=/; max-age=604800; SameSite=Strict`;
  document.cookie = `user_role=${data.role}; path=/; max-age=604800; SameSite=Strict`;
}

export function limparSessao() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  document.cookie = "access_token=; path=/; max-age=0";
  document.cookie = "user_role=; path=/; max-age=0";
}

export function getAccessToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
}

export function getUser(): { nome: string; role: string; tenant_id: number } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export async function login(email: string, senha: string): Promise<AuthUser> {
  const form = new URLSearchParams({ username: email, password: senha });
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Credenciais inválidas");
  }
  return res.json();
}

export async function logout(refresh_token: string) {
  await fetch(`${API}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  limparSessao();
}

export function authHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auto-refresh do access token ─────────────────────────────────────────────

let refreshInFlight: Promise<string | null> | null = null;

async function tentarRefresh(): Promise<string | null> {
  // Coalesce — se já há um refresh em andamento, retorna a mesma promise
  if (refreshInFlight) return refreshInFlight;
  const refresh_token = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  if (!refresh_token) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) {
        // Refresh inválido → limpa sessão e força login
        limparSessao();
        if (typeof window !== "undefined") window.location.href = "/login";
        return null;
      }
      const data: AuthUser = await res.json();
      salvarSessao(data);
      return data.access_token;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Fetch wrapper que injeta o Bearer token e renova automaticamente
 * em caso de 401/403 (Token inválido / Token expirado).
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const fazReq = (token: string | null) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let res = await fazReq(getAccessToken());
  if (res.status === 401 || res.status === 403) {
    const novoToken = await tentarRefresh();
    if (novoToken) res = await fazReq(novoToken);
  }
  return res;
}

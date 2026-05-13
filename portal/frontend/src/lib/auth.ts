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
}

export function limparSessao() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  document.cookie = "access_token=; path=/; max-age=0";
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

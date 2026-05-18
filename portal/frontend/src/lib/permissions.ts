/**
 * RBAC v2 — verificação de permissões no client.
 * Lê as permissões diretamente do JWT (campo `perms`) e do localStorage.
 */

function decodeJwt(token: string): any {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}

export function getPermissoes(): string[] {
  if (typeof window === "undefined") return [];
  const token = localStorage.getItem("access_token");
  if (!token) return [];
  const payload = decodeJwt(token);
  return Array.isArray(payload?.perms) ? payload.perms : [];
}

export function temPermissao(requerida: string): boolean {
  const perms = new Set(getPermissoes());

  // Fallback: role legado owner/admin libera tudo (durante migração)
  if (typeof window !== "undefined") {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.role === "owner" || u.role === "admin") return true;
      } catch {}
    }
  }

  if (perms.has("*")) return true;
  if (perms.has(requerida)) return true;
  if (!requerida.includes(":")) return false;
  const [modulo, resto] = requerida.split(":", 2);
  const [acao, escopo] = resto.includes("@")
    ? [resto.split("@")[0], resto.split("@").slice(1).join("@")]
    : [resto, null];
  if (perms.has(`${modulo}:*`)) return true;
  if (escopo && perms.has(`${modulo}:${acao}@*`)) return true;
  if (!escopo && perms.has(`${modulo}:${acao}`)) return true;
  return false;
}

/** Conjunto de categoria_ids visíveis no cofre, ou null = todas. */
export function categoriasVisiveisCofre(): number[] | null {
  const perms = new Set(getPermissoes());
  if (perms.has("*") || perms.has("cofre:*") || perms.has("cofre:view@*")) return null;
  const ids: number[] = [];
  perms.forEach(p => {
    const m = /^cofre:view@cat:(\d+)$/.exec(p);
    if (m) ids.push(parseInt(m[1], 10));
  });
  return ids;
}

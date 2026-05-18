"""
Engine de permissões RBAC v2.

Formato de permissão: "<modulo>:<acao>[@escopo]"
  Ex: "cofre:view@cat:5", "cofre:reveal@*", "robos:execute"

Wildcards (do mais amplo ao mais específico):
  "*"                  → super-admin (tudo)
  "cofre:*"            → todas ações de cofre, qualquer escopo
  "cofre:view@*"       → ver cofre em qualquer categoria
  "cofre:view@cat:5"   → ver cofre só da categoria 5
"""
from typing import Iterable, Set, Optional, Union
from sqlalchemy.orm import Session
from .models import Usuario, TeamMember, TeamRole, Role


# ── Cálculo de permissões efetivas ────────────────────────────────────────────

def permissoes_efetivas(usuario_id: int, db: Session) -> Set[str]:
    """Une permissões de todos os times do usuário."""
    perms: Set[str] = set()
    membros = db.query(TeamMember).filter(TeamMember.usuario_id == usuario_id).all()
    if not membros:
        return perms
    team_ids = [m.team_id for m in membros]
    team_roles = db.query(TeamRole).filter(TeamRole.team_id.in_(team_ids)).all()
    role_ids = [tr.role_id for tr in team_roles]
    if not role_ids:
        return perms
    roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
    for r in roles:
        perms.update(r.permissoes or [])
    return perms


# ── Verificação ───────────────────────────────────────────────────────────────

def tem_permissao(perms: Iterable[str], requerida: str) -> bool:
    """
    Verifica se `requerida` é satisfeita pelo conjunto `perms`.
    Considera wildcards.
    """
    if not perms:
        return False
    perms_set = set(perms)

    # Super-admin
    if "*" in perms_set:
        return True

    # Match exato
    if requerida in perms_set:
        return True

    # Separa módulo, ação e escopo
    if ":" not in requerida:
        return False
    modulo, resto = requerida.split(":", 1)
    if "@" in resto:
        acao, escopo = resto.split("@", 1)
    else:
        acao, escopo = resto, None

    # cofre:* → libera todas ações de cofre, qualquer escopo
    if f"{modulo}:*" in perms_set:
        return True

    # cofre:view@* → qualquer escopo da ação view
    if escopo and f"{modulo}:{acao}@*" in perms_set:
        return True

    # Sem escopo na requerida — basta a ação sem escopo
    if not escopo and f"{modulo}:{acao}" in perms_set:
        return True

    return False


# ── Categorias visíveis ───────────────────────────────────────────────────────

def categorias_visiveis(perms: Iterable[str], acao: str = "view") -> Union[str, Set[int]]:
    """
    Retorna:
      - "*" se o usuário pode ver TODAS categorias do cofre
      - set[int] com IDs das categorias visíveis caso contrário
    """
    perms_set = set(perms or [])
    if "*" in perms_set or "cofre:*" in perms_set or f"cofre:{acao}@*" in perms_set:
        return "*"
    ids: Set[int] = set()
    prefix = f"cofre:{acao}@cat:"
    for p in perms_set:
        if p.startswith(prefix):
            try:
                ids.add(int(p[len(prefix):]))
            except ValueError:
                pass
    return ids


def tem_acesso_cofre_categoria(perms: Iterable[str], categoria_id: Optional[int], acao: str = "view") -> bool:
    """Verifica se pode executar `acao` sobre cofre em determinada categoria."""
    return tem_permissao(perms, f"cofre:{acao}@cat:{categoria_id}" if categoria_id else f"cofre:{acao}@*")

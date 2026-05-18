from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import Usuario
from .security import decodificar_token
from .permissions import permissoes_efetivas, tem_permissao

bearer = HTTPBearer()

HIERARQUIA = {"owner": 4, "admin": 3, "operator": 2, "viewer": 1, "cofre": 0}


def get_usuario_atual(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    token = credentials.credentials
    payload = decodificar_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    usuario = db.query(Usuario).filter(
        Usuario.id == int(payload.get("sub")),
        Usuario.ativo == True,
    ).first()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

    return usuario


# ── RBAC v1 (legado) — mantido por compat enquanto migra ────────────────────

def requer_role(role_minima: str):
    def dependency(usuario: Usuario = Depends(get_usuario_atual)) -> Usuario:
        if HIERARQUIA.get(usuario.role, 0) < HIERARQUIA.get(role_minima, 99):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requer permissão de {role_minima} ou superior"
            )
        return usuario
    return dependency


def requer_cofre_ou_role(role_minima: str):
    """Legado — aceita role 'cofre' OU role >= role_minima."""
    def dependency(usuario: Usuario = Depends(get_usuario_atual)) -> Usuario:
        if usuario.role == "cofre":
            return usuario
        if HIERARQUIA.get(usuario.role, 0) < HIERARQUIA.get(role_minima, 99):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requer permissão de {role_minima} ou superior"
            )
        return usuario
    return dependency


# ── RBAC v2 — baseado em permissões ─────────────────────────────────────────

def requer(permissao: str):
    """
    Dependency moderna que checa permissão atômica.
    Considera tanto o RBAC v2 (times+roles) quanto o role legado para retrocompat.
    """
    def dependency(
        usuario: Usuario = Depends(get_usuario_atual),
        db: Session = Depends(get_db),
    ) -> Usuario:
        perms = permissoes_efetivas(usuario.id, db)
        if tem_permissao(perms, permissao):
            return usuario
        # Fallback: role legado owner/admin libera tudo durante a migração
        if usuario.role in ("owner", "admin"):
            return usuario
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Sem permissão: {permissao}"
        )
    return dependency


# Atalhos
CurrentUser   = Depends(get_usuario_atual)
RequireViewer = Depends(requer_role("viewer"))
RequireOp     = Depends(requer_role("operator"))
RequireAdmin  = Depends(requer_role("admin"))
RequireOwner  = Depends(requer_role("owner"))

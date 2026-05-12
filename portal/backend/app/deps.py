from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import Usuario
from .security import decodificar_token

bearer = HTTPBearer()

HIERARQUIA = {"owner": 4, "admin": 3, "operator": 2, "viewer": 1}


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


def requer_role(role_minima: str):
    def dependency(usuario: Usuario = Depends(get_usuario_atual)) -> Usuario:
        if HIERARQUIA.get(usuario.role, 0) < HIERARQUIA.get(role_minima, 99):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requer permissão de {role_minima} ou superior"
            )
        return usuario
    return dependency


# Atalhos de uso comum
CurrentUser   = Depends(get_usuario_atual)
RequireViewer = Depends(requer_role("viewer"))
RequireOp     = Depends(requer_role("operator"))
RequireAdmin  = Depends(requer_role("admin"))
RequireOwner  = Depends(requer_role("owner"))

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from ..database import get_db
from ..models import Usuario, RefreshToken
from ..security import verificar_senha, criar_access_token, criar_refresh_token, decodificar_token, hash_senha
from ..deps import get_usuario_atual

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: int
    nome: str


class RefreshRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    id: int
    nome: str
    email: str
    role: str
    tenant_id: int
    class Config:
        from_attributes = True


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.email == form.username,
        Usuario.ativo == True
    ).first()

    if not usuario or not verificar_senha(form.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )

    payload = {"sub": str(usuario.id), "tenant_id": usuario.tenant_id, "role": usuario.role}
    access  = criar_access_token(payload)
    refresh, expira = criar_refresh_token(payload)

    db.add(RefreshToken(usuario_id=usuario.id, token=refresh, expira_em=expira))
    db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        role=usuario.role,
        tenant_id=usuario.tenant_id,
        nome=usuario.nome,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decodificar_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == body.refresh_token,
        RefreshToken.expira_em > datetime.now(timezone.utc)
    ).first()
    if not db_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado ou revogado")

    usuario = db.query(Usuario).filter(Usuario.id == payload["sub"], Usuario.ativo == True).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

    # Rotação de refresh token
    db.delete(db_token)
    new_payload = {"sub": str(usuario.id), "tenant_id": usuario.tenant_id, "role": usuario.role}
    access = criar_access_token(new_payload)
    refresh, expira = criar_refresh_token(new_payload)
    db.add(RefreshToken(usuario_id=usuario.id, token=refresh, expira_em=expira))
    db.commit()

    return TokenResponse(access_token=access, refresh_token=refresh,
                         role=usuario.role, tenant_id=usuario.tenant_id, nome=usuario.nome)


@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(RefreshToken.token == body.refresh_token).delete()
    db.commit()
    return {"mensagem": "Logout realizado"}


@router.get("/me", response_model=MeResponse)
def me(usuario: Usuario = Depends(get_usuario_atual)):
    return usuario

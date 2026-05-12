from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, EmailStr
from ..database import get_db
from ..models import Usuario
from ..security import hash_senha
from ..deps import get_usuario_atual, requer_role

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

ROLES_VALIDAS = {"owner", "admin", "operator", "viewer"}


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: str = "viewer"


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    role: str
    ativo: bool
    tenant_id: int
    class Config:
        from_attributes = True


class UsuarioUpdate(BaseModel):
    nome: str | None = None
    role: str | None = None
    ativo: bool | None = None


@router.get("/", response_model=List[UsuarioOut])
def listar(
    db: Session = Depends(get_db),
    atual: Usuario = Depends(requer_role("admin"))
):
    return db.query(Usuario).filter(Usuario.tenant_id == atual.tenant_id).all()


@router.post("/", response_model=UsuarioOut, status_code=201)
def criar(
    dados: UsuarioCreate,
    db: Session = Depends(get_db),
    atual: Usuario = Depends(requer_role("admin"))
):
    if dados.role not in ROLES_VALIDAS:
        raise HTTPException(status_code=400, detail=f"Role inválida. Use: {ROLES_VALIDAS}")
    if db.query(Usuario).filter(Usuario.email == dados.email).first():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    usuario = Usuario(
        tenant_id  = atual.tenant_id,
        nome       = dados.nome,
        email      = dados.email,
        senha_hash = hash_senha(dados.senha),
        role       = dados.role,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{uid}", response_model=UsuarioOut)
def atualizar(
    uid: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    atual: Usuario = Depends(requer_role("admin"))
):
    u = db.query(Usuario).filter(Usuario.id == uid, Usuario.tenant_id == atual.tenant_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if dados.role and dados.role not in ROLES_VALIDAS:
        raise HTTPException(status_code=400, detail="Role inválida")
    for k, v in dados.model_dump(exclude_none=True).items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return u


@router.delete("/{uid}", status_code=204)
def deletar(
    uid: int,
    db: Session = Depends(get_db),
    atual: Usuario = Depends(requer_role("owner"))
):
    u = db.query(Usuario).filter(Usuario.id == uid, Usuario.tenant_id == atual.tenant_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if u.id == atual.id:
        raise HTTPException(status_code=400, detail="Não é possível deletar o próprio usuário")
    db.delete(u)
    db.commit()

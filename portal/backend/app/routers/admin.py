from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, EmailStr
from ..database import get_db
from ..models import Tenant, Usuario, Robo, Execucao
from ..security import hash_senha
from ..deps import get_usuario_atual
from ..models import Usuario as UsuarioModel

router = APIRouter(prefix="/admin", tags=["admin"])

PLATAFORMA_TENANT_ID = 1


def super_admin(usuario: UsuarioModel = Depends(get_usuario_atual)) -> UsuarioModel:
    if usuario.tenant_id != PLATAFORMA_TENANT_ID or usuario.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador da plataforma")
    return usuario


class TenantCreate(BaseModel):
    nome: str
    slug: str
    plano: str = "starter"
    owner_nome: str
    owner_email: EmailStr
    owner_senha: str


class TenantOut(BaseModel):
    id: int
    nome: str
    slug: str
    plano: str
    ativo: bool
    total_usuarios: int
    total_robos: int
    total_execucoes: int
    criado_em: str

    class Config:
        from_attributes = True


@router.get("/tenants", response_model=List[dict])
def listar_tenants(db: Session = Depends(get_db), _=Depends(super_admin)):
    tenants = db.query(Tenant).order_by(Tenant.id).all()
    result = []
    for t in tenants:
        result.append({
            "id": t.id,
            "nome": t.nome,
            "slug": t.slug,
            "plano": t.plano,
            "ativo": t.ativo,
            "criado_em": t.criado_em.isoformat() if t.criado_em else None,
            "total_usuarios": db.query(Usuario).filter(Usuario.tenant_id == t.id).count(),
            "total_robos": db.query(Robo).filter(Robo.tenant_id == t.id).count(),
            "total_execucoes": db.query(Execucao).filter(Execucao.tenant_id == t.id).count(),
        })
    return result


@router.post("/tenants", status_code=201, response_model=dict)
def criar_tenant(dados: TenantCreate, db: Session = Depends(get_db), _=Depends(super_admin)):
    if db.query(Tenant).filter(Tenant.slug == dados.slug).first():
        raise HTTPException(status_code=409, detail="Slug já existe")
    if db.query(Usuario).filter(Usuario.email == dados.owner_email).first():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    tenant = Tenant(nome=dados.nome, slug=dados.slug, plano=dados.plano)
    db.add(tenant)
    db.flush()

    owner = Usuario(
        tenant_id  = tenant.id,
        nome       = dados.owner_nome,
        email      = dados.owner_email,
        senha_hash = hash_senha(dados.owner_senha),
        role       = "owner",
    )
    db.add(owner)
    db.commit()

    return {
        "mensagem": f"Tenant '{tenant.nome}' criado com sucesso",
        "tenant_id": tenant.id,
        "slug": tenant.slug,
        "owner_email": owner.email,
    }


@router.patch("/tenants/{tenant_id}/ativo", response_model=dict)
def toggle_tenant(tenant_id: int, db: Session = Depends(get_db), _=Depends(super_admin)):
    if tenant_id == PLATAFORMA_TENANT_ID:
        raise HTTPException(status_code=400, detail="Não é possível desativar o tenant da plataforma")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    tenant.ativo = not tenant.ativo
    db.commit()
    return {"tenant_id": tenant.id, "ativo": tenant.ativo}

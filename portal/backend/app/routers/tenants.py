"""Gerenciamento do tenant — transferir ownership."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import Tenant, Usuario
from ..deps import requer, get_usuario_atual
from ..security import verificar_senha
from ..audit import registrar

router = APIRouter(prefix="/tenant", tags=["tenant"])


class TransferirOwnerIn(BaseModel):
    novo_owner_usuario_id: int
    senha_atual:           str   # confirma identidade do owner atual


class TenantOut(BaseModel):
    id:    int
    nome:  str
    slug:  str
    plano: str


@router.get("/", response_model=TenantOut)
def info(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    t = db.query(Tenant).filter(Tenant.id == u.tenant_id).first()
    return TenantOut(id=t.id, nome=t.nome, slug=t.slug, plano=t.plano)


@router.post("/transferir-ownership")
def transferir_ownership(
    body: TransferirOwnerIn,
    db: Session = Depends(get_db),
    u: Usuario  = Depends(requer("tenant:manage")),
):
    if u.role != "owner":
        raise HTTPException(403, "Apenas owners podem transferir ownership")
    if not verificar_senha(body.senha_atual, u.senha_hash):
        raise HTTPException(401, "Senha incorreta")

    novo = db.query(Usuario).filter(
        Usuario.id == body.novo_owner_usuario_id, Usuario.tenant_id == u.tenant_id
    ).first()
    if not novo:
        raise HTTPException(404, "Usuário não encontrado neste tenant")

    novo.role = "owner"
    db.commit()

    registrar(db, u.tenant_id, u.id, "tenant:owner-transferido",
              recurso_tipo="usuario", recurso_id=novo.id,
              detalhes={"novo_owner_email": novo.email})

    return {"mensagem": f"{novo.nome} agora é owner do tenant. Você continua como owner também."}

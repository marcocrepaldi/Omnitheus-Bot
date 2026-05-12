from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import CredencialTenant, Robo
from ..deps import requer_role
from ..models import Usuario

router = APIRouter(prefix="/credenciais", tags=["credenciais"])


class CredencialUpsert(BaseModel):
    robo_id: int
    dados: dict  # {"HARPER_USER": "...", "HARPER_PASS": "..."}


class CredencialOut(BaseModel):
    id: int
    robo_id: int
    tenant_id: int
    campos: list[str]          # chaves salvas
    dados_publicos: dict = {}  # valores não-sensíveis (sem campos de senha)

    class Config:
        from_attributes = True

# Campos considerados sensíveis — nunca retornados ao frontend
CAMPOS_SENSIVEIS = {"HARPER_PASS", "SENHA", "PASSWORD", "SECRET", "TOKEN"}


def _dados_publicos(dados: dict) -> dict:
    return {
        k: v for k, v in dados.items()
        if not any(s in k.upper() for s in CAMPOS_SENSIVEIS)
    }


@router.get("/", response_model=list[CredencialOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(requer_role("viewer"))):
    creds = db.query(CredencialTenant).filter(CredencialTenant.tenant_id == u.tenant_id).all()
    return [
        CredencialOut(
            id=c.id, robo_id=c.robo_id, tenant_id=c.tenant_id,
            campos=list(c.dados.keys()),
            dados_publicos=_dados_publicos(c.dados),
        )
        for c in creds
    ]


@router.post("/", status_code=201)
def salvar(dados: CredencialUpsert, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    robo = db.query(Robo).filter(
        Robo.id == dados.robo_id,
        (Robo.tenant_id == 1) | (Robo.tenant_id == u.tenant_id)
    ).first()
    if not robo:
        raise HTTPException(status_code=404, detail="Robô não encontrado")

    cred = db.query(CredencialTenant).filter(
        CredencialTenant.tenant_id == u.tenant_id,
        CredencialTenant.robo_id == dados.robo_id
    ).first()

    if cred:
        # MERGE: mantém valores existentes, sobrescreve apenas os campos enviados
        merged = dict(cred.dados)
        merged.update(dados.dados)
        cred.dados = merged
    else:
        cred = CredencialTenant(tenant_id=u.tenant_id, robo_id=dados.robo_id, dados=dados.dados)
        db.add(cred)

    db.commit()
    return {"mensagem": "Credenciais salvas com sucesso", "campos": list(cred.dados.keys())}


@router.delete("/{robo_id}", status_code=204)
def deletar(robo_id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    cred = db.query(CredencialTenant).filter(
        CredencialTenant.tenant_id == u.tenant_id,
        CredencialTenant.robo_id == robo_id
    ).first()
    if cred:
        db.delete(cred)
        db.commit()

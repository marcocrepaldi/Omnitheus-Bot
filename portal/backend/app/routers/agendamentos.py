from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Agendamento, Usuario
from ..schemas import AgendamentoCreate, AgendamentoOut
from ..deps import requer, get_usuario_atual

router = APIRouter(prefix="/agendamentos", tags=["agendamentos"])


@router.get("/", response_model=List[AgendamentoOut])
def listar_agendamentos(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    return (
        db.query(Agendamento)
        .filter(Agendamento.tenant_id == u.tenant_id)
        .order_by(Agendamento.id)
        .all()
    )


@router.post("/", response_model=AgendamentoOut, status_code=201)
def criar_agendamento(
    dados: AgendamentoCreate,
    db: Session = Depends(get_db),
    u: Usuario = Depends(requer("agendamentos:manage")),
):
    payload = dados.model_dump()
    # Garante isolamento por tenant — o front pode tentar mandar mas é ignorado
    payload["tenant_id"] = u.tenant_id
    ag = Agendamento(**payload)
    db.add(ag)
    db.commit()
    db.refresh(ag)
    return ag


@router.put("/{ag_id}", response_model=AgendamentoOut)
def atualizar_agendamento(
    ag_id: int,
    dados: AgendamentoCreate,
    db: Session = Depends(get_db),
    u: Usuario = Depends(requer("agendamentos:manage")),
):
    ag = db.query(Agendamento).filter(
        Agendamento.id == ag_id,
        Agendamento.tenant_id == u.tenant_id,
    ).first()
    if not ag:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    payload = dados.model_dump()
    payload.pop("tenant_id", None)  # não permite trocar de tenant
    for k, v in payload.items():
        setattr(ag, k, v)
    db.commit()
    db.refresh(ag)
    return ag


@router.delete("/{ag_id}", status_code=204)
def deletar_agendamento(
    ag_id: int,
    db: Session = Depends(get_db),
    u: Usuario = Depends(requer("agendamentos:manage")),
):
    ag = db.query(Agendamento).filter(
        Agendamento.id == ag_id,
        Agendamento.tenant_id == u.tenant_id,
    ).first()
    if not ag:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    db.delete(ag)
    db.commit()

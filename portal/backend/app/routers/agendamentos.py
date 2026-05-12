from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Agendamento
from ..schemas import AgendamentoCreate, AgendamentoOut

router = APIRouter(prefix="/agendamentos", tags=["agendamentos"])


@router.get("/", response_model=List[AgendamentoOut])
def listar_agendamentos(db: Session = Depends(get_db)):
    return db.query(Agendamento).order_by(Agendamento.id).all()


@router.post("/", response_model=AgendamentoOut, status_code=201)
def criar_agendamento(dados: AgendamentoCreate, db: Session = Depends(get_db)):
    ag = Agendamento(**dados.model_dump())
    db.add(ag)
    db.commit()
    db.refresh(ag)
    return ag


@router.put("/{ag_id}", response_model=AgendamentoOut)
def atualizar_agendamento(ag_id: int, dados: AgendamentoCreate, db: Session = Depends(get_db)):
    ag = db.query(Agendamento).filter(Agendamento.id == ag_id).first()
    if not ag:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    for k, v in dados.model_dump().items():
        setattr(ag, k, v)
    db.commit()
    db.refresh(ag)
    return ag


@router.delete("/{ag_id}", status_code=204)
def deletar_agendamento(ag_id: int, db: Session = Depends(get_db)):
    ag = db.query(Agendamento).filter(Agendamento.id == ag_id).first()
    if not ag:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    db.delete(ag)
    db.commit()

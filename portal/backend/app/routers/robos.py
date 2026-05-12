from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Robo
from ..schemas import RoboCreate, RoboOut
from ..deps import get_usuario_atual, requer_role
from ..models import Usuario

router = APIRouter(prefix="/robos", tags=["robos"])


@router.get("/", response_model=List[RoboOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(requer_role("viewer"))):
    return db.query(Robo).filter(Robo.tenant_id == u.tenant_id).order_by(Robo.id).all()


@router.post("/", response_model=RoboOut, status_code=201)
def criar(robo: RoboCreate, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    db_robo = Robo(**robo.model_dump(), tenant_id=u.tenant_id)
    db.add(db_robo)
    db.commit()
    db.refresh(db_robo)
    return db_robo


@router.get("/{robo_id}", response_model=RoboOut)
def obter(robo_id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("viewer"))):
    robo = db.query(Robo).filter(Robo.id == robo_id, Robo.tenant_id == u.tenant_id).first()
    if not robo:
        raise HTTPException(status_code=404, detail="Robô não encontrado")
    return robo


@router.put("/{robo_id}", response_model=RoboOut)
def atualizar(robo_id: int, dados: RoboCreate, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    robo = db.query(Robo).filter(Robo.id == robo_id, Robo.tenant_id == u.tenant_id).first()
    if not robo:
        raise HTTPException(status_code=404, detail="Robô não encontrado")
    for k, v in dados.model_dump().items():
        setattr(robo, k, v)
    db.commit()
    db.refresh(robo)
    return robo


@router.delete("/{robo_id}", status_code=204)
def deletar(robo_id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    robo = db.query(Robo).filter(Robo.id == robo_id, Robo.tenant_id == u.tenant_id).first()
    if not robo:
        raise HTTPException(status_code=404, detail="Robô não encontrado")
    db.delete(robo)
    db.commit()

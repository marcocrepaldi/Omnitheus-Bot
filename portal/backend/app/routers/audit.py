"""Listagem da auditoria — quem fez o quê no tenant."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from ..database import get_db
from ..models import AuditLog, Usuario
from ..deps import requer

router = APIRouter(prefix="/audit", tags=["auditoria"])


class AuditOut(BaseModel):
    id:           int
    usuario_id:   Optional[int]
    usuario_nome: Optional[str]
    acao:         str
    recurso_tipo: Optional[str]
    recurso_id:   Optional[int]
    detalhes:     Optional[dict]
    ip:           Optional[str]
    criado_em:    datetime


@router.get("/", response_model=List[AuditOut])
def listar(
    usuario_id: Optional[int]  = Query(None),
    acao:       Optional[str]  = Query(None),
    recurso:    Optional[str]  = Query(None),
    dias:       int            = Query(7,  ge=1, le=90),
    limit:      int            = Query(100, le=500),
    db: Session = Depends(get_db),
    u: Usuario  = Depends(requer("audit:view")),
):
    desde = datetime.now(timezone.utc) - timedelta(days=dias)
    q = db.query(AuditLog, Usuario).outerjoin(Usuario, Usuario.id == AuditLog.usuario_id).filter(
        AuditLog.tenant_id == u.tenant_id,
        AuditLog.criado_em >= desde,
    )
    if usuario_id: q = q.filter(AuditLog.usuario_id == usuario_id)
    if acao:       q = q.filter(AuditLog.acao.ilike(f"%{acao}%"))
    if recurso:    q = q.filter(AuditLog.recurso_tipo == recurso)
    rows = q.order_by(AuditLog.criado_em.desc()).limit(limit).all()
    return [
        AuditOut(
            id=a.id, usuario_id=a.usuario_id, usuario_nome=usr.nome if usr else None,
            acao=a.acao, recurso_tipo=a.recurso_tipo, recurso_id=a.recurso_id,
            detalhes=a.detalhes, ip=a.ip, criado_em=a.criado_em,
        ) for a, usr in rows
    ]

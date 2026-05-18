"""Helper de auditoria — registra ações sensíveis."""
import logging
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import Request
from .models import AuditLog

logger = logging.getLogger("audit")


def registrar(
    db: Session,
    tenant_id: int,
    usuario_id: Optional[int],
    acao: str,
    recurso_tipo: Optional[str] = None,
    recurso_id: Optional[int] = None,
    detalhes: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Registra evento na audit_log. Falha silenciosa (não pode quebrar a requisição)."""
    try:
        ip, ua = None, None
        if request is not None:
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")
        log = AuditLog(
            tenant_id=tenant_id, usuario_id=usuario_id, acao=acao,
            recurso_tipo=recurso_tipo, recurso_id=recurso_id,
            detalhes=detalhes, ip=ip, user_agent=ua,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Falha ao registrar audit ({acao}): {e}")
        try: db.rollback()
        except: pass

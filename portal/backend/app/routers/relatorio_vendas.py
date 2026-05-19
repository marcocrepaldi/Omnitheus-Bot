from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date

from ..database import get_db
from ..models import RelatorioVendas
from ..deps import requer_role

router = APIRouter(prefix="/relatorio-vendas", tags=["relatorio-vendas"])


@router.get("/")
def listar(
    db: Session = Depends(get_db),
    usuario=Depends(requer_role("viewer")),
    data_de:   Optional[str] = Query(None, description="DD/MM/YYYY"),
    data_ate:  Optional[str] = Query(None, description="DD/MM/YYYY"),
    situacao:  Optional[str] = Query(None),
    seguradora: Optional[str] = Query(None),
    ramo:      Optional[str] = Query(None),
    usuario_q: Optional[str] = Query(None, alias="usuario"),
    limit:     int = Query(200, le=1000),
    offset:    int = Query(0),
):
    q = (
        db.query(RelatorioVendas)
        .filter(RelatorioVendas.tenant_id == usuario.tenant_id)
    )

    if data_de:
        try:
            from datetime import datetime
            q = q.filter(RelatorioVendas.inicio_vigencia >= datetime.strptime(data_de, "%d/%m/%Y").date())
        except ValueError:
            pass
    if data_ate:
        try:
            from datetime import datetime
            q = q.filter(RelatorioVendas.inicio_vigencia <= datetime.strptime(data_ate, "%d/%m/%Y").date())
        except ValueError:
            pass
    if situacao:
        q = q.filter(RelatorioVendas.situacao.ilike(f"%{situacao}%"))
    if seguradora:
        q = q.filter(RelatorioVendas.seguradora.ilike(f"%{seguradora}%"))
    if ramo:
        q = q.filter(RelatorioVendas.ramo.ilike(f"%{ramo}%"))
    if usuario_q:
        q = q.filter(RelatorioVendas.usuario.ilike(f"%{usuario_q}%"))

    total = q.count()
    items = (
        q.order_by(RelatorioVendas.inicio_vigencia.desc(), RelatorioVendas.calculo)
        .offset(offset)
        .limit(limit)
        .all()
    )

    def _fmt(r: RelatorioVendas):
        return {
            "id":               r.id,
            "calculo":          r.calculo,
            "inicio_vigencia":  r.inicio_vigencia.strftime("%d/%m/%Y") if r.inicio_vigencia else None,
            "cliente":          r.cliente,
            "cpf_cnpj":         r.cpf_cnpj,
            "item":             r.item,
            "ramo":             r.ramo,
            "situacao":         r.situacao,
            "status_painel":    r.status_painel,
            "seguradora":       r.seguradora,
            "premio_fechado":   r.premio_fechado,
            "comissao_fechado": r.comissao_fechado,
            "pct_comissao":     r.pct_comissao,
            "premio_liquido":   r.premio_liquido,
            "data_efetivacao":  r.data_efetivacao.strftime("%d/%m/%Y") if r.data_efetivacao else None,
            "grupo_producao":   r.grupo_producao,
            "usuario":          r.usuario,
            "tipo_orcamento":   r.tipo_orcamento,
            "tipo_uso":         r.tipo_uso,
            "proposta_cia":     r.proposta_cia,
            "importado_em":     r.importado_em.isoformat() if r.importado_em else None,
        }

    return {"total": total, "items": [_fmt(i) for i in items]}


@router.get("/resumo")
def resumo(
    db: Session = Depends(get_db),
    usuario=Depends(requer_role("viewer")),
    data_de:  Optional[str] = Query(None, description="DD/MM/YYYY"),
    data_ate: Optional[str] = Query(None, description="DD/MM/YYYY"),
):
    q = (
        db.query(RelatorioVendas)
        .filter(
            RelatorioVendas.tenant_id == usuario.tenant_id,
            RelatorioVendas.situacao.ilike("Efetivado"),
        )
    )

    if data_de:
        try:
            from datetime import datetime
            q = q.filter(RelatorioVendas.inicio_vigencia >= datetime.strptime(data_de, "%d/%m/%Y").date())
        except ValueError:
            pass
    if data_ate:
        try:
            from datetime import datetime
            q = q.filter(RelatorioVendas.inicio_vigencia <= datetime.strptime(data_ate, "%d/%m/%Y").date())
        except ValueError:
            pass

    agg = db.query(
        func.count(RelatorioVendas.id).label("total_efetivados"),
        func.sum(RelatorioVendas.premio_fechado).label("premio_total"),
        func.sum(RelatorioVendas.comissao_fechado).label("comissao_total"),
    ).filter(
        RelatorioVendas.tenant_id == usuario.tenant_id,
        RelatorioVendas.situacao.ilike("Efetivado"),
    )

    if data_de:
        try:
            from datetime import datetime
            agg = agg.filter(
                RelatorioVendas.inicio_vigencia >= datetime.strptime(data_de, "%d/%m/%Y").date()
            )
        except ValueError:
            pass
    if data_ate:
        try:
            from datetime import datetime
            agg = agg.filter(
                RelatorioVendas.inicio_vigencia <= datetime.strptime(data_ate, "%d/%m/%Y").date()
            )
        except ValueError:
            pass

    row = agg.first()

    por_seguradora = (
        db.query(
            RelatorioVendas.seguradora,
            func.count(RelatorioVendas.id).label("qtd"),
            func.sum(RelatorioVendas.premio_fechado).label("premio"),
        )
        .filter(
            RelatorioVendas.tenant_id == usuario.tenant_id,
            RelatorioVendas.situacao.ilike("Efetivado"),
            RelatorioVendas.seguradora != "",
        )
        .group_by(RelatorioVendas.seguradora)
        .order_by(func.sum(RelatorioVendas.premio_fechado).desc())
        .limit(10)
        .all()
    )

    return {
        "total_efetivados": row.total_efetivados or 0,
        "premio_total":     round(row.premio_total or 0, 2),
        "comissao_total":   round(row.comissao_total or 0, 2),
        "por_seguradora": [
            {"seguradora": r.seguradora, "qtd": r.qtd, "premio": round(r.premio or 0, 2)}
            for r in por_seguradora
        ],
    }

from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from ..database import get_db
from ..models import Execucao, Robo, Usuario
from ..schemas import ExecucaoCreate, ExecucaoOut, DashboardStats
from ..deps import requer_role, get_usuario_atual

router = APIRouter(prefix="/execucoes", tags=["execucoes"])


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), u: Usuario = Depends(requer_role("viewer"))):
    total_robos         = db.query(Robo).filter(Robo.tenant_id == u.tenant_id).count()
    robos_ativos        = db.query(Robo).filter(Robo.tenant_id == u.tenant_id, Robo.ativo == True).count()
    total_execucoes     = db.query(Execucao).filter(Execucao.tenant_id == u.tenant_id).count()
    execucoes_com_falha = db.query(Execucao).filter(Execucao.tenant_id == u.tenant_id, Execucao.status == "falha").count()
    ultima = db.query(Execucao).filter(Execucao.tenant_id == u.tenant_id).order_by(Execucao.iniciado_em.desc()).first()
    credenciais = ultima.credenciais_com_erro if ultima and ultima.credenciais_com_erro else []
    return DashboardStats(
        total_robos=total_robos, robos_ativos=robos_ativos,
        total_execucoes=total_execucoes, execucoes_com_falha=execucoes_com_falha,
        ultima_execucao=ultima.iniciado_em if ultima else None,
        credenciais_com_erro=credenciais,
    )


@router.get("/", response_model=List[ExecucaoOut])
def listar(
    robo_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    u: Usuario = Depends(requer_role("viewer"))
):
    q = db.query(Execucao).filter(Execucao.tenant_id == u.tenant_id).order_by(Execucao.iniciado_em.desc())
    if robo_id:
        q = q.filter(Execucao.robo_id == robo_id)
    return q.limit(limit).all()


@router.post("/", response_model=ExecucaoOut, status_code=201)
def registrar(dados: ExecucaoCreate, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    execucao = Execucao(
        tenant_id=u.tenant_id,
        robo_id=dados.robo_id,
        status=dados.status,
        credenciais_com_erro=dados.credenciais_com_erro,
        total_erros=dados.total_erros,
        mensagem=dados.mensagem,
        finalizado_em=dados.finalizado_em or datetime.now(timezone.utc),
    )
    db.add(execucao)
    db.commit()
    db.refresh(execucao)
    return execucao


@router.post("/robos/{robo_id}/executar", status_code=202)
async def disparar(robo_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    robo = db.query(Robo).filter(Robo.id == robo_id, Robo.tenant_id == u.tenant_id).first()
    if not robo:
        raise HTTPException(status_code=404, detail="Robô não encontrado")
    from ..scheduler import executar_robo
    background_tasks.add_task(executar_robo, robo_id, u.tenant_id)
    return {"mensagem": f"Robô '{robo.nome}' disparado em background."}

import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Agendamento, Execucao

logger = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

ROBOT_MAP = {
    1: "robots.quiver_credenciais",
}


async def executar_robo(robo_id: int, tenant_id: int = 1):
    from .models import Robo as RoboModel
    db: Session = SessionLocal()
    robo = db.query(RoboModel).filter(RoboModel.id == robo_id).first()
    module_name = (robo.modulo if robo and robo.modulo else None) or ROBOT_MAP.get(robo_id)
    db.close()

    if not module_name:
        logger.error(f"Robô {robo_id} sem módulo mapeado.")
        return

    logger.info(f"Disparando robô {robo_id} ({module_name}) | tenant {tenant_id}...")
    db = SessionLocal()
    execucao = Execucao(robo_id=robo_id, tenant_id=tenant_id, status="em_execucao")
    db.add(execucao)
    db.commit()
    db.refresh(execucao)

    try:
        import importlib
        mod = importlib.import_module(module_name)
        resultado = await mod.executar()

        execucao.status               = resultado["status"]
        execucao.credenciais_com_erro = resultado["credenciais_com_erro"]
        execucao.total_erros          = len(resultado["credenciais_com_erro"])
        execucao.mensagem             = resultado.get("mensagem")
        execucao.finalizado_em        = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Robô {robo_id} finalizado: {resultado['status']}")
    except Exception as exc:
        execucao.status       = "erro"
        execucao.mensagem     = str(exc)
        execucao.finalizado_em = datetime.now(timezone.utc)
        db.commit()
        logger.error(f"Erro ao executar robô {robo_id}: {exc}", exc_info=True)
    finally:
        db.close()


def carregar_agendamentos():
    db: Session = SessionLocal()
    try:
        agendamentos = db.query(Agendamento).filter(Agendamento.ativo == True).all()
        scheduler.remove_all_jobs()
        for ag in agendamentos:
            try:
                scheduler.add_job(
                    executar_robo,
                    trigger=CronTrigger.from_crontab(ag.cron_expr, timezone="America/Sao_Paulo"),
                    args=[ag.robo_id],
                    id=f"robo_{ag.robo_id}_ag_{ag.id}",
                    replace_existing=True,
                    name=f"Robô {ag.robo_id} | {ag.cron_expr}",
                )
                logger.info(f"Agendamento carregado: robô {ag.robo_id} | {ag.cron_expr}")
            except Exception as e:
                logger.error(f"Cron inválido para agendamento {ag.id}: {e}")
    finally:
        db.close()


def iniciar_scheduler():
    carregar_agendamentos()
    # Recarrega agendamentos a cada 5 minutos para pegar mudanças no banco
    scheduler.add_job(
        carregar_agendamentos,
        trigger="interval",
        minutes=5,
        id="reload_agendamentos",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado.")

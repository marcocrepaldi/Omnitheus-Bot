import asyncio
import logging
import os
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
    2: "robots.suhai_troca_senha",
    3: "robots.quiver_atualiza_senha",
}


async def executar_robo(robo_id: int, tenant_id: int = 1):
    from .models import Robo as RoboModel, CredencialTenant

    db: Session = SessionLocal()
    robo = db.query(RoboModel).filter(RoboModel.id == robo_id).first()
    module_name = (robo.modulo if robo and robo.modulo else None) or ROBOT_MAP.get(robo_id)

    # Carrega credenciais do tenant — tem prioridade sobre as env vars do servidor
    cred = db.query(CredencialTenant).filter(
        CredencialTenant.tenant_id == tenant_id,
        CredencialTenant.robo_id == robo_id
    ).first()
    credenciais_tenant = cred.dados if cred else {}
    db.close()

    if not module_name:
        logger.error(f"Robô {robo_id} sem módulo mapeado.")
        return

    logger.info(
        f"Disparando robô {robo_id} ({module_name}) | tenant {tenant_id} "
        f"| credenciais: {list(credenciais_tenant.keys()) or 'env padrão'}"
    )

    # Injeta credenciais do tenant temporariamente no ambiente
    env_backup = {}
    for chave, valor in credenciais_tenant.items():
        env_backup[chave] = os.environ.get(chave)
        os.environ[chave] = str(valor)

    db = SessionLocal()
    execucao = Execucao(robo_id=robo_id, tenant_id=tenant_id, status="em_execucao")
    db.add(execucao)
    db.commit()
    db.refresh(execucao)

    TIMEOUT_SEGUNDOS = 8 * 60  # 8 minutos máximo por execução

    try:
        import importlib
        mod = importlib.import_module(module_name)
        resultado = await asyncio.wait_for(mod.executar(), timeout=TIMEOUT_SEGUNDOS)

        execucao.status               = resultado["status"]
        execucao.credenciais_com_erro = resultado["credenciais_com_erro"]
        execucao.total_erros          = len(resultado["credenciais_com_erro"])
        execucao.mensagem             = resultado.get("mensagem")
        execucao.finalizado_em        = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Robô {robo_id} | tenant {tenant_id} | finalizado: {resultado['status']}")
    except asyncio.TimeoutError:
        execucao.status        = "erro"
        execucao.mensagem      = f"Timeout: execução ultrapassou {TIMEOUT_SEGUNDOS//60} minutos e foi cancelada."
        execucao.finalizado_em = datetime.now(timezone.utc)
        db.commit()
        logger.error(f"Robô {robo_id} | tenant {tenant_id} | TIMEOUT após {TIMEOUT_SEGUNDOS}s")
    except Exception as exc:
        execucao.status        = "erro"
        execucao.mensagem      = str(exc)
        execucao.finalizado_em = datetime.now(timezone.utc)
        db.commit()
        logger.error(f"Erro ao executar robô {robo_id}: {exc}", exc_info=True)
    finally:
        db.close()
        # Restaura variáveis de ambiente originais
        for chave, valor_original in env_backup.items():
            if valor_original is None:
                os.environ.pop(chave, None)
            else:
                os.environ[chave] = valor_original


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
                    args=[ag.robo_id, ag.tenant_id],
                    id=f"robo_{ag.robo_id}_ag_{ag.id}",
                    replace_existing=True,
                    name=f"Robô {ag.robo_id} | tenant {ag.tenant_id} | {ag.cron_expr}",
                )
                logger.info(f"Agendamento: robô {ag.robo_id} | tenant {ag.tenant_id} | {ag.cron_expr}")
            except Exception as e:
                logger.error(f"Cron inválido para agendamento {ag.id}: {e}")
    finally:
        db.close()


def iniciar_scheduler():
    carregar_agendamentos()
    scheduler.add_job(
        carregar_agendamentos,
        trigger="interval",
        minutes=5,
        id="reload_agendamentos",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado.")

import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import engine
from . import models
from .routers import robos, execucoes, agendamentos, auth, usuarios, admin, credenciais
from .scheduler import iniciar_scheduler, scheduler

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s"))
for name in ("robot.quiver", "scheduler"):
    lg = logging.getLogger(name)
    lg.setLevel(logging.INFO)
    lg.addHandler(handler)

models.Base.metadata.create_all(bind=engine)


def _limpar_execucoes_presas():
    """Marca como ERRO qualquer execução que ficou EM_EXECUCAO após reinício do servidor."""
    from .database import SessionLocal
    from .models import Execucao
    from datetime import datetime, timezone
    db = SessionLocal()
    try:
        presas = db.query(Execucao).filter(Execucao.status == "em_execucao").all()
        for e in presas:
            e.status = "erro"
            e.mensagem = "Execução interrompida (servidor reiniciado)"
            e.finalizado_em = datetime.now(timezone.utc)
        if presas:
            db.commit()
            logging.getLogger("scheduler").warning(f"{len(presas)} execução(ões) presas marcadas como ERRO.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _limpar_execucoes_presas()
    iniciar_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(title="Portal Robôs Harper", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(usuarios.router)
app.include_router(robos.router)
app.include_router(execucoes.router)
app.include_router(agendamentos.router)
app.include_router(credenciais.router)


@app.get("/health")
def health():
    jobs = [{"id": j.id, "next_run": str(j.next_run_time)} for j in scheduler.get_jobs()]
    return {"status": "ok", "version": "2.0.0", "jobs_ativos": len(jobs)}

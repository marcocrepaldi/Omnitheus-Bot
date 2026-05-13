from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import CofreSenha, Usuario, CredencialTenant
from ..deps import requer_role
from ..vault import criptografar, descriptografar, gerar_senha

router = APIRouter(prefix="/cofre", tags=["cofre"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class CofreIn(BaseModel):
    seguradora_nome: str
    login: Optional[str] = None
    senha: str                        # texto plano — será criptografada
    url_portal: Optional[str] = None
    observacao: Optional[str] = None


class CofreOut(BaseModel):
    id: int
    seguradora_nome: str
    login: Optional[str]
    url_portal: Optional[str]
    observacao: Optional[str]
    tem_senha_anterior: bool
    atualizado_em: Optional[datetime]
    criado_em: datetime

    class Config:
        from_attributes = True


class CofreComSenhaOut(CofreOut):
    senha: str                        # descriptografada — só em endpoint específico


class RotacaoOut(BaseModel):
    seguradora_nome: str
    senha_nova: str
    mensagem: str


class RotacaoCompletaOut(BaseModel):
    seguradora_nome: str
    execucao_robo2_id: int
    execucao_robo3_id: int
    mensagem: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[CofreOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    itens = db.query(CofreSenha).filter(CofreSenha.tenant_id == u.tenant_id).order_by(CofreSenha.seguradora_nome).all()
    return [
        CofreOut(
            id=c.id,
            seguradora_nome=c.seguradora_nome,
            login=c.login,
            url_portal=c.url_portal,
            observacao=c.observacao,
            tem_senha_anterior=bool(c.senha_anterior_enc),
            atualizado_em=c.atualizado_em,
            criado_em=c.criado_em,
        )
        for c in itens
    ]


@router.get("/{id}/senha", response_model=CofreComSenhaOut)
def ver_senha(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    """Retorna a senha descriptografada — use com responsabilidade."""
    c = db.query(CofreSenha).filter(CofreSenha.id == id, CofreSenha.tenant_id == u.tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credencial não encontrada")
    return CofreComSenhaOut(
        id=c.id,
        seguradora_nome=c.seguradora_nome,
        login=c.login,
        url_portal=c.url_portal,
        observacao=c.observacao,
        tem_senha_anterior=bool(c.senha_anterior_enc),
        atualizado_em=c.atualizado_em,
        criado_em=c.criado_em,
        senha=descriptografar(c.senha_enc),
    )


@router.post("/", response_model=CofreOut, status_code=201)
def salvar(dados: CofreIn, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    """Cria ou atualiza uma credencial no cofre (merge: preserva senha anterior)."""
    c = db.query(CofreSenha).filter(
        CofreSenha.tenant_id == u.tenant_id,
        CofreSenha.seguradora_nome == dados.seguradora_nome.upper(),
    ).first()

    senha_enc = criptografar(dados.senha)

    if c:
        c.senha_anterior_enc = c.senha_enc   # preserva a anterior para rollback
        c.senha_enc          = senha_enc
        c.login              = dados.login or c.login
        c.url_portal         = dados.url_portal or c.url_portal
        c.observacao         = dados.observacao or c.observacao
    else:
        c = CofreSenha(
            tenant_id       = u.tenant_id,
            seguradora_nome = dados.seguradora_nome.upper(),
            login           = dados.login,
            senha_enc       = senha_enc,
            url_portal      = dados.url_portal,
            observacao      = dados.observacao,
        )
        db.add(c)

    db.commit()
    db.refresh(c)
    return CofreOut(
        id=c.id, seguradora_nome=c.seguradora_nome, login=c.login,
        url_portal=c.url_portal, observacao=c.observacao,
        tem_senha_anterior=bool(c.senha_anterior_enc),
        atualizado_em=c.atualizado_em, criado_em=c.criado_em,
    )


@router.post("/{id}/rotacionar", response_model=RotacaoOut)
def rotacionar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("operator"))):
    """
    Gera uma nova senha automaticamente, salva no cofre e retorna a nova senha.
    Use para acionar o fluxo automático: Robô 2 → atualiza cofre → Robô 3.
    """
    c = db.query(CofreSenha).filter(CofreSenha.id == id, CofreSenha.tenant_id == u.tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credencial não encontrada")

    nova_senha         = gerar_senha(16)
    c.senha_anterior_enc = c.senha_enc
    c.senha_enc          = criptografar(nova_senha)
    db.commit()

    return RotacaoOut(
        seguradora_nome=c.seguradora_nome,
        senha_nova=nova_senha,
        mensagem=f"Nova senha gerada para {c.seguradora_nome}. Execute o Robô 2 e depois o Robô 3.",
    )


@router.post("/{id}/rollback", response_model=CofreOut)
def rollback(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    """Restaura a senha anterior em caso de falha na rotação."""
    c = db.query(CofreSenha).filter(CofreSenha.id == id, CofreSenha.tenant_id == u.tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credencial não encontrada")
    if not c.senha_anterior_enc:
        raise HTTPException(status_code=400, detail="Sem senha anterior para restaurar")
    c.senha_enc          = c.senha_anterior_enc
    c.senha_anterior_enc = None
    db.commit()
    db.refresh(c)
    return CofreOut(
        id=c.id, seguradora_nome=c.seguradora_nome, login=c.login,
        url_portal=c.url_portal, observacao=c.observacao,
        tem_senha_anterior=False,
        atualizado_em=c.atualizado_em, criado_em=c.criado_em,
    )


@router.post("/{id}/rotacao-completa", response_model=RotacaoCompletaOut)
def rotacao_completa(
    id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    u: Usuario = Depends(requer_role("operator")),
):
    """
    Fluxo completo de rotação de senha:
      1. Gera nova senha e salva no cofre (senha_anterior = senha atual para rollback)
      2. Dispara Robô 2 (troca no portal da seguradora) em background
      3. Se Robô 2 OK → dispara Robô 3 (atualiza no Quiver) em background
      4. Se qualquer etapa falhar → rollback automático no cofre
    """
    # Busca entrada no cofre
    c = db.query(CofreSenha).filter(CofreSenha.id == id, CofreSenha.tenant_id == u.tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credencial não encontrada no cofre")

    # Busca credenciais Quiver do tenant (Robô 1 / 3)
    cred_quiver = db.query(CredencialTenant).filter(
        CredencialTenant.tenant_id == u.tenant_id,
        CredencialTenant.robo_id == 1,
    ).first()
    if not cred_quiver:
        raise HTTPException(status_code=400, detail="Configure as credenciais do Quiver em /credenciais (Robô 1) antes de rotacionar.")

    # Gera nova senha e preserva a anterior
    nova_senha = gerar_senha(16)
    senha_atual = descriptografar(c.senha_enc)
    c.senha_anterior_enc = c.senha_enc
    c.senha_enc = criptografar(nova_senha)
    db.commit()

    # Cria registros de execução para Robô 2 e Robô 3
    from ..models import Execucao
    from datetime import timezone
    ex2 = Execucao(tenant_id=u.tenant_id, robo_id=2, status="em_execucao")
    ex3 = Execucao(tenant_id=u.tenant_id, robo_id=3, status="em_execucao")
    db.add(ex2); db.add(ex3); db.commit()
    db.refresh(ex2); db.refresh(ex3)

    # Monta env vars para cada robô
    env_robo2 = {
        "SUHAI_USER":     c.login or "",
        "SUHAI_PASS":     senha_atual,
        "SUHAI_NEW_PASS": nova_senha,
    }
    env_robo3 = {
        **dict(cred_quiver.dados),
        "SEGURADORA_NOME": c.seguradora_nome,
        "SEGURADORA_USER": c.login or "",
        "SEGURADORA_PASS": nova_senha,
    }

    # Dispara em background
    background_tasks.add_task(
        _executar_rotacao_completa,
        cofre_id=id,
        tenant_id=u.tenant_id,
        ex2_id=ex2.id,
        ex3_id=ex3.id,
        env_robo2=env_robo2,
        env_robo3=env_robo3,
        senha_anterior_enc=c.senha_anterior_enc,
    )

    return RotacaoCompletaOut(
        seguradora_nome=c.seguradora_nome,
        execucao_robo2_id=ex2.id,
        execucao_robo3_id=ex3.id,
        mensagem=f"Rotação iniciada para {c.seguradora_nome}. Acompanhe em Logs.",
    )


async def _executar_rotacao_completa(
    cofre_id: int, tenant_id: int,
    ex2_id: int, ex3_id: int,
    env_robo2: dict, env_robo3: dict,
    senha_anterior_enc: str,
):
    """Background task: Robô 2 → atualiza cofre → Robô 3. Rollback em falha."""
    import asyncio, os, importlib, logging
    from datetime import datetime, timezone
    from ..database import SessionLocal
    from ..models import Execucao, CofreSenha
    from ..vault import criptografar

    logger = logging.getLogger("scheduler")
    db = SessionLocal()

    def _set_env(env: dict) -> dict:
        backup = {}
        for k, v in env.items():
            backup[k] = os.environ.get(k)
            os.environ[k] = str(v)
        return backup

    def _restore_env(backup: dict):
        for k, v in backup.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def _finalizar(ex_id: int, status: str, msg: str):
        ex = db.query(Execucao).filter(Execucao.id == ex_id).first()
        if ex:
            ex.status = status
            ex.mensagem = msg
            ex.finalizado_em = datetime.now(timezone.utc)
            db.commit()

    try:
        # ── Robô 2: troca no portal da seguradora ───────────────────────────
        logger.info(f"[Rotação] Iniciando Robô 2 para cofre {cofre_id}")
        backup2 = _set_env(env_robo2)
        try:
            mod2 = importlib.import_module("robots.suhai_troca_senha")
            res2 = await asyncio.wait_for(mod2.executar(), timeout=5 * 60)
        finally:
            _restore_env(backup2)

        if res2["status"] != "sucesso":
            # Rollback no cofre
            c = db.query(CofreSenha).filter(CofreSenha.id == cofre_id).first()
            if c and senha_anterior_enc:
                c.senha_enc = senha_anterior_enc
                c.senha_anterior_enc = None
                db.commit()
            _finalizar(ex2_id, "erro", f"Robô 2 falhou: {res2.get('mensagem')} — senha revertida no cofre.")
            _finalizar(ex3_id, "erro", "Cancelado: Robô 2 não concluiu.")
            logger.error(f"[Rotação] Robô 2 falhou: {res2}")
            return

        _finalizar(ex2_id, "sucesso", f"Senha trocada no portal {env_robo2.get('SUHAI_USER', '')}.")
        logger.info("[Rotação] Robô 2 OK. Iniciando Robô 3...")

        # ── Robô 3: atualiza no Quiver ──────────────────────────────────────
        backup3 = _set_env(env_robo3)
        try:
            mod3 = importlib.import_module("robots.quiver_atualiza_senha")
            res3 = await asyncio.wait_for(mod3.executar(), timeout=8 * 60)
        finally:
            _restore_env(backup3)

        if res3["status"] != "sucesso":
            _finalizar(ex3_id, "erro", f"Robô 3 falhou: {res3.get('mensagem')} — senha JÁ FOI trocada no portal mas não atualizada no Quiver.")
            logger.error(f"[Rotação] Robô 3 falhou: {res3}")
            return

        _finalizar(ex3_id, "sucesso", "Senha atualizada no Quiver com sucesso.")
        logger.info(f"[Rotação] Concluída com sucesso para cofre {cofre_id}!")

    except Exception as exc:
        logger.error(f"[Rotação] Erro inesperado: {exc}", exc_info=True)
        _finalizar(ex2_id, "erro", str(exc))
        _finalizar(ex3_id, "erro", "Abortado por erro inesperado.")
    finally:
        db.close()


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    c = db.query(CofreSenha).filter(CofreSenha.id == id, CofreSenha.tenant_id == u.tenant_id).first()
    if c:
        db.delete(c)
        db.commit()

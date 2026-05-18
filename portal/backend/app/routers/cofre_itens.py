"""
Cofre Pro — gerenciamento de credenciais estilo 1Password.
Campos dinâmicos, criptografia por campo, rotação automática via robôs.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone

from ..database import get_db
from ..models import CofreItem, Usuario, CredencialTenant, Execucao, CategoriaCofre
from ..deps import requer_cofre_ou_role, requer_role, get_usuario_atual
from ..vault import criptografar, descriptografar, gerar_senha
from ..permissions import permissoes_efetivas, categorias_visiveis, tem_acesso_cofre_categoria
from ..audit import registrar as audit_registrar

router = APIRouter(prefix="/cofre-itens", tags=["cofre-itens"])

CATEGORIAS = {"seguradora", "sistema", "cliente", "banco", "email", "outro"}
PURPOSES   = {"LOGIN", "PASSWORD", None}


# ── Schemas ───────────────────────────────────────────────────────────────────

class CampoIn(BaseModel):
    label:   str
    valor:   Optional[str] = None   # None = manter valor existente (edição)
    tipo:    str = "text"           # text | password | email | url
    oculto:  bool = False
    purpose: Optional[str] = None  # LOGIN | PASSWORD | None

class CofreItemIn(BaseModel):
    categoria:    str = "outro"           # legado — string
    categoria_id: Optional[int] = None    # novo — FK em categorias_cofre
    nome:         str
    url:          Optional[str] = None
    tags:         List[str] = []
    notas:        Optional[str] = None
    campos:       List[CampoIn] = []
    robo_vinculo: Optional[int] = None

class CofreItemBulkIn(BaseModel):
    itens: List[CofreItemIn]

class CampoOut(BaseModel):
    label:   str
    valor:   Optional[str]   # None se oculto
    tipo:    str
    oculto:  bool
    purpose: Optional[str]

class CofreItemOut(BaseModel):
    id:            int
    categoria:     str
    categoria_id:  Optional[int]
    nome:          str
    url:           Optional[str]
    tags:          List[str]
    notas:         Optional[str]
    campos:        List[CampoOut]
    robo_vinculo:  Optional[int]
    tem_historico: bool
    criado_em:     datetime
    atualizado_em: Optional[datetime]

class SincronizarOut(BaseModel):
    nome:              str
    execucao_robo3_id: int
    mensagem:          str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _processar_campos(campos_in: List[CampoIn], campos_existentes: list = None) -> list:
    resultado = []
    for i, c in enumerate(campos_in):
        existente = (campos_existentes or [])[i] if campos_existentes and i < len(campos_existentes) else None
        if c.oculto:
            if c.valor:
                enc = criptografar(c.valor)
            elif existente and existente.get("oculto") and existente.get("valor_enc"):
                enc = existente["valor_enc"]          # mantém atual
            else:
                raise HTTPException(400, f"Campo '{c.label}' é oculto e requer um valor.")
            resultado.append({"label": c.label, "valor": None, "valor_enc": enc,
                               "tipo": c.tipo, "oculto": True, "purpose": c.purpose})
        else:
            val = c.valor if c.valor is not None else (existente or {}).get("valor", "")
            resultado.append({"label": c.label, "valor": val, "valor_enc": None,
                               "tipo": c.tipo, "oculto": False, "purpose": c.purpose})
    return resultado


def _campos_out(campos: list) -> List[CampoOut]:
    return [CampoOut(label=c["label"],
                     valor=c.get("valor") if not c.get("oculto") else None,
                     tipo=c.get("tipo", "text"),
                     oculto=c.get("oculto", False),
                     purpose=c.get("purpose")) for c in campos]


def _to_out(item: CofreItem) -> CofreItemOut:
    return CofreItemOut(
        id=item.id, categoria=item.categoria, categoria_id=item.categoria_id,
        nome=item.nome, url=item.url, tags=item.tags or [], notas=item.notas,
        campos=_campos_out(item.campos or []),
        robo_vinculo=item.robo_vinculo,
        tem_historico=bool(item.historico),
        criado_em=item.criado_em, atualizado_em=item.atualizado_em,
    )


def _get(id: int, tenant_id: int, db: Session) -> CofreItem:
    item = db.query(CofreItem).filter(CofreItem.id == id, CofreItem.tenant_id == tenant_id).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")
    return item


def _tags(raw: List[str]) -> List[str]:
    return [t.strip().lower() for t in raw if t.strip()]


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CofreItemOut])
def listar(
    categoria:    Optional[str] = None,
    categoria_id: Optional[int] = None,
    q:            Optional[str] = None,
    tag:          Optional[str] = None,
    db: Session = Depends(get_db),
    u: Usuario  = Depends(requer_cofre_ou_role("operator")),
):
    # Filtro de categorias visíveis pelo RBAC v2
    perms = permissoes_efetivas(u.id, db)
    cats_visiveis = categorias_visiveis(perms, "view")
    # Owner/admin legado vê tudo (fallback)
    if u.role in ("owner", "admin"):
        cats_visiveis = "*"

    query = db.query(CofreItem).filter(CofreItem.tenant_id == u.tenant_id)

    # Aplica filtro RBAC se não for wildcard
    if cats_visiveis != "*":
        if not cats_visiveis:
            return []   # sem nenhuma categoria visível
        query = query.filter(CofreItem.categoria_id.in_(cats_visiveis))

    # Filtros do usuário
    if categoria and categoria != "todas":
        query = query.filter(CofreItem.categoria == categoria)
    if categoria_id:
        query = query.filter(CofreItem.categoria_id == categoria_id)

    itens = query.order_by(CofreItem.nome).all()

    if q:
        ql = q.lower()
        itens = [i for i in itens if
                 ql in i.nome.lower() or
                 ql in (i.notas or "").lower() or
                 any(ql in t for t in (i.tags or [])) or
                 any(ql in (c.get("valor") or "").lower()
                     for c in (i.campos or []) if not c.get("oculto"))]
    if tag:
        itens = [i for i in itens if tag in (i.tags or [])]

    return [_to_out(i) for i in itens]


@router.post("/", response_model=CofreItemOut, status_code=201)
def criar(dados: CofreItemIn, db: Session = Depends(get_db), u: Usuario = Depends(requer_cofre_ou_role("operator"))):
    if dados.categoria not in CATEGORIAS:
        raise HTTPException(400, f"Categoria inválida. Use: {CATEGORIAS}")
    item = CofreItem(
        tenant_id    = u.tenant_id,
        categoria    = dados.categoria,
        categoria_id = dados.categoria_id,
        nome         = dados.nome.strip(),
        url          = dados.url or None,
        tags         = _tags(dados.tags),
        notas        = dados.notas or None,
        campos       = _processar_campos(dados.campos),
        historico    = [],
        robo_vinculo = dados.robo_vinculo,
    )
    db.add(item); db.commit(); db.refresh(item)
    audit_registrar(db, u.tenant_id, u.id, "cofre:create",
                    recurso_tipo="cofre_item", recurso_id=item.id,
                    detalhes={"nome": item.nome})
    return _to_out(item)


@router.post("/importar", response_model=dict, status_code=201)
def importar(dados: CofreItemBulkIn, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    """Importação em lote — cria múltiplos itens de uma vez."""
    criados = 0
    erros   = []
    for idx, d in enumerate(dados.itens):
        try:
            if d.categoria not in CATEGORIAS:
                d.categoria = "outro"
            item = CofreItem(
                tenant_id    = u.tenant_id,
                categoria    = d.categoria,
                nome         = d.nome.strip(),
                url          = d.url or None,
                tags         = _tags(d.tags),
                notas        = d.notas or None,
                campos       = _processar_campos(d.campos),
                historico    = [],
                robo_vinculo = d.robo_vinculo,
            )
            db.add(item)
            criados += 1
        except Exception as e:
            erros.append({"indice": idx, "nome": d.nome, "erro": str(e)})
    db.commit()
    return {"criados": criados, "erros": erros}


@router.get("/{id}", response_model=CofreItemOut)
def detalhe(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_cofre_ou_role("operator"))):
    return _to_out(_get(id, u.tenant_id, db))


@router.put("/{id}", response_model=CofreItemOut)
def atualizar(id: int, dados: CofreItemIn, db: Session = Depends(get_db), u: Usuario = Depends(requer_cofre_ou_role("operator"))):
    if dados.categoria not in CATEGORIAS:
        raise HTTPException(400, f"Categoria inválida. Use: {CATEGORIAS}")
    item = _get(id, u.tenant_id, db)
    item.categoria    = dados.categoria
    item.categoria_id = dados.categoria_id
    item.nome         = dados.nome.strip()
    item.url          = dados.url or None
    item.tags         = _tags(dados.tags)
    item.notas        = dados.notas or None
    item.campos       = _processar_campos(dados.campos, item.campos or [])
    item.robo_vinculo = dados.robo_vinculo
    flag_modified(item, "campos")
    db.commit(); db.refresh(item)
    audit_registrar(db, u.tenant_id, u.id, "cofre:edit",
                    recurso_tipo="cofre_item", recurso_id=item.id,
                    detalhes={"nome": item.nome})
    return _to_out(item)


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    item = _get(id, u.tenant_id, db)
    db.delete(item); db.commit()


# ── Campos ────────────────────────────────────────────────────────────────────

@router.post("/{id}/campos/{idx}/revelar")
def revelar(id: int, idx: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_cofre_ou_role("operator"))):
    item   = _get(id, u.tenant_id, db)
    campos = item.campos or []
    if idx < 0 or idx >= len(campos):
        raise HTTPException(404, "Campo não encontrado")
    c = campos[idx]
    if not c.get("oculto"):
        raise HTTPException(400, "Campo não é oculto")
    try:
        valor = descriptografar(c["valor_enc"])
    except Exception:
        raise HTTPException(500, "Erro ao descriptografar. Verifique VAULT_KEY.")
    audit_registrar(db, u.tenant_id, u.id, "cofre:reveal",
                    recurso_tipo="cofre_item", recurso_id=id,
                    detalhes={"campo": c["label"], "item_nome": item.nome})
    return {"label": c["label"], "valor": valor}


@router.post("/{id}/campos/{idx}/trocar-senha")
def trocar_campo(id: int, idx: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_cofre_ou_role("operator"))):
    """Gera nova senha para o campo e guarda histórico (máx 5)."""
    item   = _get(id, u.tenant_id, db)
    campos = list(item.campos or [])
    if idx < 0 or idx >= len(campos):
        raise HTTPException(404, "Campo não encontrado")
    c = campos[idx]
    if not c.get("oculto"):
        raise HTTPException(400, "Só campos ocultos suportam troca de senha")

    nova = gerar_senha(16)
    historico = list(item.historico or [])
    historico.insert(0, {
        "valor_enc": c["valor_enc"], "label": c["label"],
        "campo_index": idx, "trocado_em": datetime.now(timezone.utc).isoformat(),
    })
    item.historico = historico[:5]
    campos[idx]   = {**c, "valor_enc": criptografar(nova)}
    item.campos   = campos
    flag_modified(item, "campos")
    flag_modified(item, "historico")
    db.commit()
    return {"label": c["label"], "senha_nova": nova}


@router.get("/{id}/historico")
def ver_historico(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    item = _get(id, u.tenant_id, db)
    result = []
    for h in (item.historico or []):
        try:
            valor = descriptografar(h["valor_enc"])
        except Exception:
            valor = "— erro ao descriptografar —"
        result.append({"label": h.get("label"), "valor": valor, "trocado_em": h.get("trocado_em")})
    return result


# ── Sincronizar com Quiver ────────────────────────────────────────────────────
#
# Fluxo correto:
# 1. Robô 1 detecta credencial expirada → manda e-mail
# 2. CLIENTE recupera a senha manualmente no portal da seguradora
# 3. CLIENTE atualiza a nova senha no cofre via UI
# 4. CLIENTE clica "Sincronizar com Quiver" → roda Robô 3 com a senha do cofre
#
# (Robô 2 não é mais usado neste fluxo — só faria sentido se a seguradora
#  permitisse trocar senha programaticamente, o que não é o caso na maioria.)

@router.post("/{id}/sincronizar-quiver", response_model=SincronizarOut)
def sincronizar_quiver(
    id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    u: Usuario  = Depends(requer_cofre_ou_role("operator")),
):
    """
    Atualiza a senha da seguradora no Quiver usando a senha que está no cofre.
    Roda só o Robô 3 — não troca senha no portal, apenas sincroniza no Quiver.
    """
    item = _get(id, u.tenant_id, db)
    if item.robo_vinculo != 2:
        raise HTTPException(400, "Sincronização disponível apenas para itens com 'Robô vinculado: SUHAI'")

    campos = item.campos or []
    login_idx = next((i for i, c in enumerate(campos) if c.get("purpose") == "LOGIN"), None)
    senha_idx = next((i for i, c in enumerate(campos) if c.get("purpose") == "PASSWORD"), None)
    if login_idx is None or senha_idx is None:
        raise HTTPException(400, "Configure os campos com Purpose=LOGIN e Purpose=PASSWORD no item")

    seguradora_user = campos[login_idx]["valor"]
    try:
        seguradora_senha = descriptografar(campos[senha_idx]["valor_enc"])
    except Exception:
        raise HTTPException(500, "Erro ao descriptografar a senha do cofre")

    cred_quiver = db.query(CredencialTenant).filter(
        CredencialTenant.tenant_id == u.tenant_id,
        CredencialTenant.robo_id == 1,
    ).first()
    if not cred_quiver:
        raise HTTPException(400, "Configure as credenciais do Quiver em /credenciais (Robô 1)")

    ex = Execucao(tenant_id=u.tenant_id, robo_id=3, status="em_execucao")
    db.add(ex); db.commit(); db.refresh(ex)

    env_robo3 = {
        **dict(cred_quiver.dados),
        "SEGURADORA_NOME": item.nome,
        "SEGURADORA_USER": seguradora_user,
        "SEGURADORA_PASS": seguradora_senha,
    }

    background_tasks.add_task(_sincronizar_bg, ex_id=ex.id, env_robo3=env_robo3, nome=item.nome)

    return SincronizarOut(
        nome=item.nome,
        execucao_robo3_id=ex.id,
        mensagem=f"Sincronização iniciada para {item.nome}. Acompanhe em Logs.",
    )


async def _sincronizar_bg(ex_id: int, env_robo3: dict, nome: str):
    """Background task: executa só o Robô 3."""
    import asyncio, os, importlib, logging
    from ..database import SessionLocal

    logger = logging.getLogger("scheduler")
    db = SessionLocal()

    def _fin(status, msg):
        ex = db.query(Execucao).filter(Execucao.id == ex_id).first()
        if ex:
            ex.status = status; ex.mensagem = msg
            ex.finalizado_em = datetime.now(timezone.utc); db.commit()

    backup = {}
    for k, v in env_robo3.items():
        backup[k] = os.environ.get(k)
        os.environ[k] = str(v)

    try:
        logger.info(f"[Sincronizar Quiver] Iniciando para {nome}")
        mod = importlib.import_module("robots.quiver_atualiza_senha")
        res = await asyncio.wait_for(mod.executar(), timeout=8 * 60)

        if res["status"] != "sucesso":
            _fin("erro", f"Robô 3 falhou: {res.get('mensagem')}")
            logger.error(f"[Sincronizar Quiver] Falhou: {res}")
            return

        _fin("sucesso", f"Senha de {nome} sincronizada no Quiver.")
        logger.info(f"[Sincronizar Quiver] OK para {nome}")
    except Exception as e:
        logger.error(f"[Sincronizar Quiver] Erro: {e}", exc_info=True)
        _fin("erro", str(e))
    finally:
        # Restaura env
        for k, v in backup.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v
        db.close()


# DEPRECATED — código antigo de rotação completa (mantido só para histórico)
def _rotacao_completa_OLD(
    id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    u: Usuario  = Depends(requer_cofre_ou_role("operator")),
):
    item = _get(id, u.tenant_id, db)
    if item.robo_vinculo != 2:
        raise HTTPException(400, "Rotação automática disponível apenas para itens vinculados ao Robô 2 (SUHAI)")

    campos = item.campos or []
    login_idx = next((i for i, c in enumerate(campos) if c.get("purpose") == "LOGIN"), None)
    senha_idx = next((i for i, c in enumerate(campos) if c.get("purpose") == "PASSWORD"), None)

    if login_idx is None or senha_idx is None:
        raise HTTPException(400, "Configure os campos com Purpose=LOGIN e Purpose=PASSWORD para usar rotação automática")

    suhai_user   = campos[login_idx]["valor"]
    senha_atual  = descriptografar(campos[senha_idx]["valor_enc"])
    senha_enc_bk = campos[senha_idx]["valor_enc"]   # backup para rollback

    # Credenciais Quiver (Robot 3)
    cred_quiver = db.query(CredencialTenant).filter(
        CredencialTenant.tenant_id == u.tenant_id,
        CredencialTenant.robo_id == 1,
    ).first()
    if not cred_quiver:
        raise HTTPException(400, "Configure as credenciais do Quiver em /credenciais (Robô 1) antes de rotacionar.")

    nova_senha = gerar_senha(16)

    # Salva nova senha no cofre (com backup para rollback)
    historico = list(item.historico or [])
    historico.insert(0, {
        "valor_enc": senha_enc_bk, "label": campos[senha_idx]["label"],
        "campo_index": senha_idx, "trocado_em": datetime.now(timezone.utc).isoformat(),
    })
    campos_novo              = list(campos)
    campos_novo[senha_idx]   = {**campos[senha_idx], "valor_enc": criptografar(nova_senha)}
    item.campos              = campos_novo
    item.historico           = historico[:5]
    flag_modified(item, "campos")
    flag_modified(item, "historico")

    # Cria execuções
    ex2 = Execucao(tenant_id=u.tenant_id, robo_id=2, status="em_execucao")
    ex3 = Execucao(tenant_id=u.tenant_id, robo_id=3, status="em_execucao")
    db.add(ex2); db.add(ex3); db.commit()
    db.refresh(ex2); db.refresh(ex3)

    env_robo2 = {"SUHAI_USER": suhai_user, "SUHAI_PASS": senha_atual, "SUHAI_NEW_PASS": nova_senha}
    env_robo3 = {**dict(cred_quiver.dados),
                 "SEGURADORA_NOME": item.nome, "SEGURADORA_USER": suhai_user, "SEGURADORA_PASS": nova_senha}

    background_tasks.add_task(
        _rotacao_bg, cofre_item_id=id, tenant_id=u.tenant_id,
        ex2_id=ex2.id, ex3_id=ex3.id,
        env_robo2=env_robo2, env_robo3=env_robo3,
        senha_idx=senha_idx, senha_enc_bk=senha_enc_bk,
    )

    return RotacaoOut(
        nome=item.nome, execucao_robo2_id=ex2.id, execucao_robo3_id=ex3.id,
        mensagem=f"Rotação iniciada para {item.nome}. Acompanhe em Logs.",
    )


async def _rotacao_bg(
    cofre_item_id: int, tenant_id: int,
    ex2_id: int, ex3_id: int,
    env_robo2: dict, env_robo3: dict,
    senha_idx: int, senha_enc_bk: str,
):
    import asyncio, os, importlib, logging
    from ..database import SessionLocal
    from ..vault import criptografar

    logger = logging.getLogger("scheduler")
    db     = SessionLocal()

    def _env(e):
        bk = {}
        for k, v in e.items():
            bk[k] = os.environ.get(k)
            os.environ[k] = str(v)
        return bk

    def _restore(bk):
        for k, v in bk.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v

    def _fin(ex_id, status, msg):
        ex = db.query(Execucao).filter(Execucao.id == ex_id).first()
        if ex:
            ex.status = status; ex.mensagem = msg
            ex.finalizado_em = datetime.now(timezone.utc); db.commit()

    def _rollback():
        item = db.query(CofreItem).filter(CofreItem.id == cofre_item_id).first()
        if item:
            campos = list(item.campos or [])
            if senha_idx < len(campos):
                campos[senha_idx] = {**campos[senha_idx], "valor_enc": senha_enc_bk}
                item.campos = campos
                flag_modified(item, "campos")
                db.commit()

    try:
        logger.info(f"[Rotação Pro] Robô 2 para item {cofre_item_id}")
        bk2 = _env(env_robo2)
        try:
            mod2 = importlib.import_module("robots.suhai_troca_senha")
            res2 = await asyncio.wait_for(mod2.executar(), timeout=5 * 60)
        finally:
            _restore(bk2)

        if res2["status"] != "sucesso":
            _rollback()
            _fin(ex2_id, "erro", f"Robô 2 falhou: {res2.get('mensagem')} — senha revertida.")
            _fin(ex3_id, "erro", "Cancelado: Robô 2 não concluiu.")
            return

        _fin(ex2_id, "sucesso", f"Senha trocada no portal {env_robo2.get('SUHAI_USER')}.")
        logger.info("[Rotação Pro] Robô 2 OK. Iniciando Robô 3...")

        bk3 = _env(env_robo3)
        try:
            mod3 = importlib.import_module("robots.quiver_atualiza_senha")
            res3 = await asyncio.wait_for(mod3.executar(), timeout=8 * 60)
        finally:
            _restore(bk3)

        if res3["status"] != "sucesso":
            _fin(ex3_id, "erro", f"Robô 3 falhou: {res3.get('mensagem')}")
            return

        _fin(ex3_id, "sucesso", "Senha atualizada no Quiver com sucesso.")
        logger.info(f"[Rotação Pro] Concluída para item {cofre_item_id}!")

    except Exception as e:
        logger.error(f"[Rotação Pro] Erro: {e}", exc_info=True)
        _fin(ex2_id, "erro", str(e))
        _fin(ex3_id, "erro", "Abortado por erro inesperado.")
        _rollback()
    finally:
        db.close()

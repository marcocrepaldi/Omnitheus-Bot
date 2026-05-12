from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import CofreSenha, Usuario
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


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer_role("admin"))):
    c = db.query(CofreSenha).filter(CofreSenha.id == id, CofreSenha.tenant_id == u.tenant_id).first()
    if c:
        db.delete(c)
        db.commit()

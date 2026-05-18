"""CRUD de Roles (perfis) customizáveis e catálogo de permissões."""
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import Role, Usuario, TeamRole
from ..deps import requer, get_usuario_atual
from ..seeds.roles_sistema import PERMISSOES_CATALOGO

router = APIRouter(prefix="/roles", tags=["roles"])


class RoleIn(BaseModel):
    nome:       str
    slug:       Optional[str] = None
    descricao:  Optional[str] = None
    permissoes: List[str] = []


class RoleOut(BaseModel):
    id:         int
    nome:       str
    slug:       str
    descricao:  Optional[str]
    sistema:    bool
    permissoes: List[str]
    qtd_times:  int
    criado_em:  datetime


def _slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "role"


def _to_out(r: Role, qtd_times: int) -> RoleOut:
    return RoleOut(
        id=r.id, nome=r.nome, slug=r.slug, descricao=r.descricao,
        sistema=r.sistema, permissoes=r.permissoes or [],
        qtd_times=qtd_times, criado_em=r.criado_em,
    )


def _qtd_times(db: Session, role_id: int) -> int:
    return db.query(TeamRole).filter(TeamRole.role_id == role_id).count()


@router.get("/", response_model=List[RoleOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    roles = db.query(Role).filter(Role.tenant_id == u.tenant_id).order_by(Role.sistema.desc(), Role.nome).all()
    return [_to_out(r, _qtd_times(db, r.id)) for r in roles]


@router.get("/permissoes-disponiveis")
def listar_permissoes(u: Usuario = Depends(get_usuario_atual)):
    """Retorna catálogo de permissões agrupadas por módulo — alimenta o builder na UI."""
    return PERMISSOES_CATALOGO


@router.post("/", response_model=RoleOut, status_code=201)
def criar(dados: RoleIn, db: Session = Depends(get_db), u: Usuario = Depends(requer("roles:manage"))):
    slug = dados.slug or _slugify(dados.nome)
    existe = db.query(Role).filter(Role.tenant_id == u.tenant_id, Role.slug == slug).first()
    if existe:
        raise HTTPException(400, f"Já existe role com slug '{slug}'")
    r = Role(
        tenant_id=u.tenant_id, nome=dados.nome.strip(), slug=slug,
        descricao=dados.descricao, sistema=False, permissoes=dados.permissoes,
    )
    db.add(r); db.commit(); db.refresh(r)
    return _to_out(r, 0)


@router.put("/{id}", response_model=RoleOut)
def atualizar(id: int, dados: RoleIn, db: Session = Depends(get_db), u: Usuario = Depends(requer("roles:manage"))):
    r = db.query(Role).filter(Role.id == id, Role.tenant_id == u.tenant_id).first()
    if not r:
        raise HTTPException(404, "Role não encontrada")
    if r.sistema:
        # roles do sistema só permitem editar nome/descricao, NÃO permissões
        r.nome      = dados.nome.strip()
        r.descricao = dados.descricao
    else:
        r.nome      = dados.nome.strip()
        if dados.slug and dados.slug != r.slug:
            r.slug = _slugify(dados.slug)
        r.descricao  = dados.descricao
        r.permissoes = dados.permissoes
    db.commit(); db.refresh(r)
    return _to_out(r, _qtd_times(db, r.id))


@router.post("/{id}/duplicar", response_model=RoleOut, status_code=201)
def duplicar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer("roles:manage"))):
    orig = db.query(Role).filter(Role.id == id, Role.tenant_id == u.tenant_id).first()
    if not orig:
        raise HTTPException(404, "Role não encontrada")
    novo_slug = _slugify(f"{orig.slug}-copia")
    n = 2
    while db.query(Role).filter(Role.tenant_id == u.tenant_id, Role.slug == novo_slug).first():
        novo_slug = _slugify(f"{orig.slug}-copia-{n}"); n += 1
    novo = Role(
        tenant_id=u.tenant_id, nome=f"{orig.nome} (cópia)", slug=novo_slug,
        descricao=orig.descricao, sistema=False, permissoes=list(orig.permissoes or []),
    )
    db.add(novo); db.commit(); db.refresh(novo)
    return _to_out(novo, 0)


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer("roles:manage"))):
    r = db.query(Role).filter(Role.id == id, Role.tenant_id == u.tenant_id).first()
    if not r:
        raise HTTPException(404, "Role não encontrada")
    if r.sistema:
        raise HTTPException(400, "Role do sistema — não pode ser deletada")
    if _qtd_times(db, id) > 0:
        raise HTTPException(400, "Role está atribuída a times — remova das atribuições antes")
    db.delete(r); db.commit()

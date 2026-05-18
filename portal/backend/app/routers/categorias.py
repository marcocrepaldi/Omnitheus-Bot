"""CRUD de categorias do cofre — customizáveis por tenant."""
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import CategoriaCofre, CofreItem, Usuario
from ..deps import requer, get_usuario_atual

router = APIRouter(prefix="/categorias", tags=["categorias"])


class CategoriaIn(BaseModel):
    nome:  str
    slug:  Optional[str] = None
    icone: Optional[str] = None
    cor:   Optional[str] = None
    ordem: int = 0


class CategoriaOut(BaseModel):
    id:        int
    nome:      str
    slug:      str
    icone:     Optional[str]
    cor:       Optional[str]
    ordem:     int
    sistema:   bool
    qtd_itens: int
    criado_em: datetime


def _slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "categoria"


def _to_out(c: CategoriaCofre, qtd: int) -> CategoriaOut:
    return CategoriaOut(
        id=c.id, nome=c.nome, slug=c.slug, icone=c.icone, cor=c.cor,
        ordem=c.ordem, sistema=c.sistema, qtd_itens=qtd, criado_em=c.criado_em,
    )


@router.get("/", response_model=List[CategoriaOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    cats = db.query(CategoriaCofre).filter(
        CategoriaCofre.tenant_id == u.tenant_id
    ).order_by(CategoriaCofre.ordem, CategoriaCofre.nome).all()
    contagens = dict(
        db.query(CofreItem.categoria_id, func.count(CofreItem.id))
        .filter(CofreItem.tenant_id == u.tenant_id, CofreItem.categoria_id.isnot(None))
        .group_by(CofreItem.categoria_id).all()
    )
    return [_to_out(c, contagens.get(c.id, 0)) for c in cats]


@router.post("/", response_model=CategoriaOut, status_code=201)
def criar(dados: CategoriaIn, db: Session = Depends(get_db), u: Usuario = Depends(requer("categorias:manage"))):
    slug = (dados.slug or _slugify(dados.nome))
    existe = db.query(CategoriaCofre).filter(
        CategoriaCofre.tenant_id == u.tenant_id, CategoriaCofre.slug == slug
    ).first()
    if existe:
        raise HTTPException(400, f"Já existe categoria com slug '{slug}'")
    cat = CategoriaCofre(
        tenant_id=u.tenant_id, nome=dados.nome.strip(), slug=slug,
        icone=dados.icone, cor=dados.cor, ordem=dados.ordem, sistema=False,
    )
    db.add(cat); db.commit(); db.refresh(cat)
    return _to_out(cat, 0)


@router.put("/{id}", response_model=CategoriaOut)
def atualizar(id: int, dados: CategoriaIn, db: Session = Depends(get_db), u: Usuario = Depends(requer("categorias:manage"))):
    cat = db.query(CategoriaCofre).filter(
        CategoriaCofre.id == id, CategoriaCofre.tenant_id == u.tenant_id
    ).first()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    cat.nome  = dados.nome.strip()
    if dados.slug and dados.slug != cat.slug:
        cat.slug = _slugify(dados.slug)
    cat.icone = dados.icone
    cat.cor   = dados.cor
    cat.ordem = dados.ordem
    db.commit(); db.refresh(cat)
    qtd = db.query(func.count(CofreItem.id)).filter(CofreItem.categoria_id == id).scalar() or 0
    return _to_out(cat, qtd)


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer("categorias:manage"))):
    cat = db.query(CategoriaCofre).filter(
        CategoriaCofre.id == id, CategoriaCofre.tenant_id == u.tenant_id
    ).first()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    if cat.sistema:
        raise HTTPException(400, "Categoria do sistema — não pode ser deletada (apenas renomeada)")
    qtd = db.query(func.count(CofreItem.id)).filter(CofreItem.categoria_id == id).scalar() or 0
    if qtd > 0:
        raise HTTPException(400, f"Categoria tem {qtd} item(s) vinculados — mova ou exclua antes")
    db.delete(cat); db.commit()

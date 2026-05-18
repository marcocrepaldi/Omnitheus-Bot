"""CRUD de Times — grupos de usuários com roles atribuídas."""
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import Team, TeamMember, TeamRole, Role, Usuario
from ..deps import requer, get_usuario_atual

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamIn(BaseModel):
    nome:      str
    slug:      Optional[str] = None
    descricao: Optional[str] = None
    cor:       Optional[str] = None
    member_ids: List[int] = []
    role_ids:   List[int] = []


class MemberOut(BaseModel):
    id:    int
    nome:  str
    email: str


class RoleSimpleOut(BaseModel):
    id:   int
    nome: str
    slug: str


class TeamOut(BaseModel):
    id:        int
    nome:      str
    slug:      str
    descricao: Optional[str]
    cor:       Optional[str]
    membros:   List[MemberOut]
    roles:     List[RoleSimpleOut]
    criado_em: datetime


def _slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "time"


def _team_out(db: Session, t: Team) -> TeamOut:
    members_q = db.query(TeamMember, Usuario).join(Usuario, Usuario.id == TeamMember.usuario_id).filter(TeamMember.team_id == t.id).all()
    members = [MemberOut(id=u.id, nome=u.nome, email=u.email) for _, u in members_q]
    roles_q = db.query(TeamRole, Role).join(Role, Role.id == TeamRole.role_id).filter(TeamRole.team_id == t.id).all()
    roles = [RoleSimpleOut(id=r.id, nome=r.nome, slug=r.slug) for _, r in roles_q]
    return TeamOut(
        id=t.id, nome=t.nome, slug=t.slug, descricao=t.descricao, cor=t.cor,
        membros=members, roles=roles, criado_em=t.criado_em,
    )


@router.get("/", response_model=List[TeamOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    teams = db.query(Team).filter(Team.tenant_id == u.tenant_id).order_by(Team.nome).all()
    return [_team_out(db, t) for t in teams]


@router.post("/", response_model=TeamOut, status_code=201)
def criar(dados: TeamIn, db: Session = Depends(get_db), u: Usuario = Depends(requer("teams:manage"))):
    slug = dados.slug or _slugify(dados.nome)
    if db.query(Team).filter(Team.tenant_id == u.tenant_id, Team.slug == slug).first():
        raise HTTPException(400, f"Já existe time com slug '{slug}'")
    t = Team(tenant_id=u.tenant_id, nome=dados.nome.strip(), slug=slug,
             descricao=dados.descricao, cor=dados.cor)
    db.add(t); db.commit(); db.refresh(t)
    # Members
    for uid in dados.member_ids:
        if db.query(Usuario).filter(Usuario.id == uid, Usuario.tenant_id == u.tenant_id).first():
            db.add(TeamMember(team_id=t.id, usuario_id=uid))
    # Roles
    for rid in dados.role_ids:
        if db.query(Role).filter(Role.id == rid, Role.tenant_id == u.tenant_id).first():
            db.add(TeamRole(team_id=t.id, role_id=rid))
    db.commit()
    return _team_out(db, t)


@router.put("/{id}", response_model=TeamOut)
def atualizar(id: int, dados: TeamIn, db: Session = Depends(get_db), u: Usuario = Depends(requer("teams:manage"))):
    t = db.query(Team).filter(Team.id == id, Team.tenant_id == u.tenant_id).first()
    if not t:
        raise HTTPException(404, "Time não encontrado")
    t.nome      = dados.nome.strip()
    if dados.slug and dados.slug != t.slug:
        t.slug = _slugify(dados.slug)
    t.descricao = dados.descricao
    t.cor       = dados.cor

    # Sincroniza members
    atuais_m = {m.usuario_id for m in db.query(TeamMember).filter(TeamMember.team_id == id).all()}
    novos_m  = set(dados.member_ids)
    for uid in atuais_m - novos_m:
        db.query(TeamMember).filter(TeamMember.team_id == id, TeamMember.usuario_id == uid).delete()
    for uid in novos_m - atuais_m:
        if db.query(Usuario).filter(Usuario.id == uid, Usuario.tenant_id == u.tenant_id).first():
            db.add(TeamMember(team_id=id, usuario_id=uid))

    # Sincroniza roles
    atuais_r = {tr.role_id for tr in db.query(TeamRole).filter(TeamRole.team_id == id).all()}
    novos_r  = set(dados.role_ids)
    for rid in atuais_r - novos_r:
        db.query(TeamRole).filter(TeamRole.team_id == id, TeamRole.role_id == rid).delete()
    for rid in novos_r - atuais_r:
        if db.query(Role).filter(Role.id == rid, Role.tenant_id == u.tenant_id).first():
            db.add(TeamRole(team_id=id, role_id=rid))

    db.commit(); db.refresh(t)
    return _team_out(db, t)


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db), u: Usuario = Depends(requer("teams:manage"))):
    t = db.query(Team).filter(Team.id == id, Team.tenant_id == u.tenant_id).first()
    if not t:
        raise HTTPException(404, "Time não encontrado")
    db.delete(t); db.commit()

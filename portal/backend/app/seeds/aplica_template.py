"""Aplica o template RBAC v2 (Corretora) em um tenant.

Idempotente: cria apenas o que ainda não existe.
"""
import logging
from sqlalchemy.orm import Session
from ..models import (
    Tenant, Usuario, CategoriaCofre, Role, Team, TeamMember, TeamRole,
    CofreItem,
)
from .categorias_template import CATEGORIAS_CORRETORA, LEGADO_PARA_SLUG
from .roles_sistema import ROLES_SISTEMA

logger = logging.getLogger("rbac")


def aplica_template_no_tenant(db: Session, tenant_id: int) -> dict:
    """Garante que o tenant tem categorias, roles e times padrão. Migra dados legados."""
    stats = {"categorias_criadas": 0, "roles_criadas": 0, "times_criados": 0,
             "members_adicionados": 0, "cofre_itens_migrados": 0}

    # 1. CATEGORIAS — cria as do template
    cat_por_slug: dict[str, int] = {}
    for cat in CATEGORIAS_CORRETORA:
        existente = db.query(CategoriaCofre).filter(
            CategoriaCofre.tenant_id == tenant_id,
            CategoriaCofre.slug == cat["slug"],
        ).first()
        if not existente:
            existente = CategoriaCofre(tenant_id=tenant_id, sistema=True, **cat)
            db.add(existente)
            db.flush()
            stats["categorias_criadas"] += 1
        cat_por_slug[cat["slug"]] = existente.id

    # 2. ROLES — cria as do sistema
    role_por_slug: dict[str, Role] = {}
    for r in ROLES_SISTEMA:
        existente = db.query(Role).filter(
            Role.tenant_id == tenant_id, Role.slug == r["slug"]
        ).first()
        if not existente:
            existente = Role(
                tenant_id=tenant_id, sistema=True,
                nome=r["nome"], slug=r["slug"],
                descricao=r["descricao"], permissoes=r["permissoes"],
            )
            db.add(existente)
            db.flush()
            stats["roles_criadas"] += 1
        role_por_slug[r["slug"]] = existente

    # 3. TIME PADRÃO POR ROLE — cria um time por role do sistema
    time_por_role_slug: dict[str, Team] = {}
    cores_time = {"owner": "purple", "admin": "blue", "operator": "emerald",
                  "viewer": "neutral", "cofre": "amber"}
    for slug, role in role_por_slug.items():
        nome_time = f"Time {role.nome}"
        existente = db.query(Team).filter(
            Team.tenant_id == tenant_id, Team.slug == f"padrao-{slug}"
        ).first()
        if not existente:
            existente = Team(
                tenant_id=tenant_id, nome=nome_time, slug=f"padrao-{slug}",
                cor=cores_time.get(slug, "neutral"),
                descricao=f"Time padrão {role.nome} — criado automaticamente.",
            )
            db.add(existente)
            db.flush()
            # Atribui a role correspondente
            db.add(TeamRole(team_id=existente.id, role_id=role.id))
            stats["times_criados"] += 1
        time_por_role_slug[slug] = existente

    # 4. MIGRA USUÁRIOS — cada usuário entra no time correspondente ao seu role atual
    usuarios = db.query(Usuario).filter(Usuario.tenant_id == tenant_id).all()
    for u in usuarios:
        role_slug = (u.role or "viewer").lower()
        if role_slug not in time_por_role_slug:
            role_slug = "viewer"
        team = time_por_role_slug[role_slug]
        ja_membro = db.query(TeamMember).filter(
            TeamMember.team_id == team.id, TeamMember.usuario_id == u.id
        ).first()
        if not ja_membro:
            db.add(TeamMember(team_id=team.id, usuario_id=u.id))
            stats["members_adicionados"] += 1

    # 5. MIGRA cofre_itens.categoria (string) → categoria_id (FK)
    itens = db.query(CofreItem).filter(
        CofreItem.tenant_id == tenant_id,
        CofreItem.categoria_id.is_(None),
    ).all()
    for item in itens:
        slug_atual = (item.categoria or "outro").lower()
        slug_novo = LEGADO_PARA_SLUG.get(slug_atual, "outro")
        if slug_novo in cat_por_slug:
            item.categoria_id = cat_por_slug[slug_novo]
            stats["cofre_itens_migrados"] += 1

    db.commit()
    return stats


def aplica_template_em_todos_tenants(db: Session) -> None:
    tenants = db.query(Tenant).all()
    for t in tenants:
        try:
            s = aplica_template_no_tenant(db, t.id)
            if any(s.values()):
                logger.info(f"[RBAC] Tenant {t.id} ({t.slug}): {s}")
        except Exception as e:
            db.rollback()
            logger.error(f"[RBAC] Erro no tenant {t.id}: {e}", exc_info=True)

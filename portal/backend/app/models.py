from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Float, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


# ─── Multi-tenancy ──────────────────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"

    id          = Column(Integer, primary_key=True, index=True)
    nome        = Column(String(150), nullable=False)
    slug        = Column(String(60), unique=True, nullable=False, index=True)
    ativo       = Column(Boolean, default=True)
    plano       = Column(String(30), default="starter")  # starter | pro | enterprise
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())

    usuarios    = relationship("Usuario", back_populates="tenant", cascade="all, delete")
    robos       = relationship("Robo", back_populates="tenant", cascade="all, delete")


# ─── Autenticação ────────────────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id           = Column(Integer, primary_key=True, index=True)
    tenant_id    = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome         = Column(String(150), nullable=False)
    email        = Column(String(200), unique=True, nullable=False, index=True)
    senha_hash   = Column(String(200), nullable=False)
    role         = Column(String(20), default="viewer")  # owner | admin | operator | viewer
    ativo        = Column(Boolean, default=True)
    criado_em    = Column(DateTime(timezone=True), server_default=func.now())

    tenant       = relationship("Tenant", back_populates="usuarios")
    tokens       = relationship("RefreshToken", back_populates="usuario", cascade="all, delete")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id           = Column(Integer, primary_key=True, index=True)
    usuario_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    token        = Column(String(500), unique=True, nullable=False, index=True)
    expira_em    = Column(DateTime(timezone=True), nullable=False)
    criado_em    = Column(DateTime(timezone=True), server_default=func.now())

    usuario      = relationship("Usuario", back_populates="tokens")


# ─── Core ────────────────────────────────────────────────────────────────────

class Robo(Base):
    __tablename__ = "robos"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome        = Column(String(100), nullable=False)
    descricao   = Column(Text)
    modulo      = Column(String(100), nullable=True)  # ex: robots.quiver_credenciais
    ativo       = Column(Boolean, default=True)
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())

    tenant      = relationship("Tenant", back_populates="robos")
    agendamentos = relationship("Agendamento", back_populates="robo", cascade="all, delete")
    execucoes   = relationship("Execucao", back_populates="robo", cascade="all, delete")


class Agendamento(Base):
    __tablename__ = "agendamentos"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    robo_id     = Column(Integer, ForeignKey("robos.id"), nullable=False)
    cron_expr   = Column(String(100), nullable=False)
    ativo       = Column(Boolean, default=True)
    proximo_run = Column(DateTime(timezone=True), nullable=True)
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())

    robo        = relationship("Robo", back_populates="agendamentos")


class CredencialTenant(Base):
    """Credenciais por tenant por robô — substituem as variáveis de ambiente."""
    __tablename__ = "credenciais_tenant"
    __table_args__ = (UniqueConstraint("tenant_id", "robo_id", name="uq_cred_tenant_robo"),)

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    robo_id     = Column(Integer, ForeignKey("robos.id"), nullable=False, index=True)
    dados       = Column(JSON, nullable=False, default=dict)  # {chave: valor}
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())


class CofreSenha(Base):
    """Cofre de senhas por tenant — armazena credenciais de seguradoras criptografadas."""
    __tablename__ = "cofre_senhas"
    __table_args__ = (UniqueConstraint("tenant_id", "seguradora_nome", name="uq_cofre_tenant_seg"),)

    id               = Column(Integer, primary_key=True, index=True)
    tenant_id        = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    seguradora_nome  = Column(String(100), nullable=False)   # ex: SUHAI, BRADESCO
    login            = Column(String(200), nullable=True)    # usuário no portal da seguradora
    senha_enc        = Column(Text, nullable=False)          # senha criptografada (Fernet)
    senha_anterior_enc = Column(Text, nullable=True)         # senha anterior (rollback)
    url_portal       = Column(String(300), nullable=True)    # URL do portal da seguradora
    observacao       = Column(Text, nullable=True)
    atualizado_em    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    criado_em        = Column(DateTime(timezone=True), server_default=func.now())


class CofreItem(Base):
    """Cofre estilo 1Password — campos dinâmicos com criptografia por campo."""
    __tablename__ = "cofre_itens"

    id            = Column(Integer, primary_key=True, index=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    categoria     = Column(String(20), nullable=False, default="outro")
    # Legado — mantido por compat. Use categoria_id para o novo RBAC.
    categoria_id  = Column(Integer, ForeignKey("categorias_cofre.id"), nullable=True, index=True)
    nome          = Column(String(200), nullable=False)
    url           = Column(String(500), nullable=True)
    tags          = Column(JSON, nullable=False, default=list)
    notas         = Column(Text, nullable=True)
    campos        = Column(JSON, nullable=False, default=list)
    historico     = Column(JSON, nullable=False, default=list)
    robo_vinculo  = Column(Integer, nullable=True)
    criado_em     = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ─── RBAC v2 — Categorias, Roles, Times, Auditoria ──────────────────────────

class CategoriaCofre(Base):
    """Categorias customizáveis do cofre, por tenant."""
    __tablename__ = "categorias_cofre"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_cat_tenant_slug"),)

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome        = Column(String(80),  nullable=False)
    slug        = Column(String(80),  nullable=False)
    icone       = Column(String(40),  nullable=True)     # nome do ícone lucide-react
    cor         = Column(String(20),  nullable=True)     # hex ou nome tailwind
    ordem       = Column(Integer,     nullable=False, default=0)
    sistema     = Column(Boolean,     default=False)     # categoria do template (não pode deletar)
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())


class Role(Base):
    """Papel (role) customizável com lista de permissões."""
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_role_tenant_slug"),)

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome        = Column(String(80),  nullable=False)
    slug        = Column(String(80),  nullable=False)
    descricao   = Column(Text,        nullable=True)
    sistema     = Column(Boolean,     default=False)     # roles do template (não pode deletar)
    permissoes  = Column(JSON,        nullable=False, default=list)
    # Lista de strings: ["cofre:view@*", "cofre:reveal@cat:5", "robos:execute"]
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())


class Team(Base):
    """Time/grupo de usuários — agrupa permissões via roles."""
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_team_tenant_slug"),)

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome        = Column(String(80),  nullable=False)
    slug        = Column(String(80),  nullable=False)
    descricao   = Column(Text,        nullable=True)
    cor         = Column(String(20),  nullable=True)
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())


class TeamMember(Base):
    """Usuários membros de times — N:N."""
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "usuario_id", name="uq_team_user"),)

    id          = Column(Integer, primary_key=True, index=True)
    team_id     = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    criado_em   = Column(DateTime(timezone=True), server_default=func.now())


class TeamRole(Base):
    """Roles atribuídas a times — N:N."""
    __tablename__ = "team_roles"
    __table_args__ = (UniqueConstraint("team_id", "role_id", name="uq_team_role"),)

    id          = Column(Integer, primary_key=True, index=True)
    team_id     = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id     = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)


class AuditLog(Base):
    """Log de auditoria — ações sensíveis: revelar senha, editar, deletar, listar cofre."""
    __tablename__ = "audit_log"

    id            = Column(Integer, primary_key=True, index=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    usuario_id    = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    acao          = Column(String(80),  nullable=False, index=True)
    # Ex: "cofre:reveal", "cofre:edit", "cofre:list", "cofre:delete", "usuarios:create"
    recurso_tipo  = Column(String(40),  nullable=True)   # cofre_item, usuario, role, team...
    recurso_id    = Column(Integer,     nullable=True)
    detalhes      = Column(JSON,        nullable=True)
    ip            = Column(String(45),  nullable=True)
    user_agent    = Column(Text,        nullable=True)
    criado_em     = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class RelatorioVendas(Base):
    """Relatório Orçamento por Situação importado do Quiver (Robô 4)."""
    __tablename__ = "relatorio_vendas"
    __table_args__ = (
        UniqueConstraint("tenant_id", "calculo", "seguradora", name="uq_rv_calculo_seg"),
    )

    id                 = Column(Integer, primary_key=True, index=True)
    tenant_id          = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    nivel              = Column(String(50))
    inicio_vigencia    = Column(Date, nullable=True)
    divisao            = Column(String(200))
    cliente            = Column(String(200))
    cpf_cnpj           = Column(String(30))
    calculo            = Column(String(20), nullable=False)
    email_cliente      = Column(String(200))
    item               = Column(String(500))
    situacao           = Column(String(50))
    grupo_producao     = Column(String(200))
    ramo               = Column(String(100))
    tipo_orcamento     = Column(String(100))
    seguradora         = Column(String(100), nullable=False, default="")
    premio_fechado     = Column(Float, nullable=True)
    comissao_fechado   = Column(Float, nullable=True)
    pct_comissao       = Column(Float, nullable=True)
    premio_liquido     = Column(Float, nullable=True)
    data_transmissao   = Column(Date, nullable=True)
    data_efetivacao    = Column(Date, nullable=True)
    tipo_cotacao       = Column(String(100))
    tipo_pessoa        = Column(String(20))
    usuario            = Column(String(200))
    corretora          = Column(String(200))
    produtor_interno   = Column(String(500))
    usuario_efetivacao = Column(String(200))
    proposta_cia       = Column(String(50))
    status_painel      = Column(String(50))
    tipo_uso           = Column(String(100))
    data_hora_inclusao = Column(DateTime, nullable=True)
    dados_seguradoras  = Column(JSON, nullable=True)
    importado_em       = Column(DateTime(timezone=True), server_default=func.now())


class Execucao(Base):
    __tablename__ = "execucoes"

    id                   = Column(Integer, primary_key=True, index=True)
    tenant_id            = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    robo_id              = Column(Integer, ForeignKey("robos.id"), nullable=False)
    status               = Column(String(20), nullable=False)  # sucesso | falha | erro | em_execucao
    credenciais_com_erro = Column(JSON, default=list)
    total_erros          = Column(Integer, default=0)
    mensagem             = Column(Text, nullable=True)
    iniciado_em          = Column(DateTime(timezone=True), server_default=func.now())
    finalizado_em        = Column(DateTime(timezone=True), nullable=True)

    robo        = relationship("Robo", back_populates="execucoes")

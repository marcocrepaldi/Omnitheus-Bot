from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
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

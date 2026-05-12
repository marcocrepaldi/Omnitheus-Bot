"""
Cria o primeiro tenant e usuário owner.
Uso: python seed.py
"""
import os
from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine
from app import models
from app.security import hash_senha

models.Base.metadata.create_all(bind=engine)

TENANT_NOME  = os.getenv("SEED_TENANT", "Harper Seguros")
TENANT_SLUG  = os.getenv("SEED_SLUG", "harper")
OWNER_NOME   = os.getenv("SEED_NOME", "Marco Crepaldi")
OWNER_EMAIL  = os.getenv("SEED_EMAIL", "ti@harperseguros.com.br")
OWNER_SENHA  = os.getenv("SEED_SENHA", "Trocar@123")

db = SessionLocal()

tenant = db.query(models.Tenant).filter(models.Tenant.slug == TENANT_SLUG).first()
if not tenant:
    tenant = models.Tenant(nome=TENANT_NOME, slug=TENANT_SLUG, plano="starter")
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    print(f"✅ Tenant criado: {tenant.nome} (id={tenant.id})")
else:
    print(f"ℹ️  Tenant já existe: {tenant.nome} (id={tenant.id})")

owner = db.query(models.Usuario).filter(models.Usuario.email == OWNER_EMAIL).first()
if not owner:
    owner = models.Usuario(
        tenant_id  = tenant.id,
        nome       = OWNER_NOME,
        email      = OWNER_EMAIL,
        senha_hash = hash_senha(OWNER_SENHA),
        role       = "owner",
    )
    db.add(owner)
    db.commit()
    print(f"✅ Owner criado: {owner.email}")
    print(f"   Senha inicial: {OWNER_SENHA}  ← TROQUE no primeiro acesso!")
else:
    print(f"ℹ️  Owner já existe: {owner.email}")

# Migra robôs existentes sem tenant para este tenant
robos_sem_tenant = db.query(models.Robo).filter(models.Robo.tenant_id == None).all()
for r in robos_sem_tenant:
    r.tenant_id = tenant.id
if robos_sem_tenant:
    db.commit()
    print(f"✅ {len(robos_sem_tenant)} robô(s) migrado(s) para tenant {tenant.slug}")

db.close()
print("\n🚀 Seed concluído!")

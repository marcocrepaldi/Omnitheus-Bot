# Omnitheus Bot — Arquitetura da Plataforma

## O que é

**Omnitheus Bot** é uma plataforma SaaS de automação de processos para corretoras de seguros.
A plataforma permite que corretoras contratem o serviço, cadastrem suas credenciais e agendem robôs
que executam tarefas automáticas em seus sistemas — sem precisar instalar nada localmente.

---

## O que foi construído

### Robô inaugural — Quiver: Verificação de Credenciais
Acessa o sistema Quiver da corretora, navega até a Central de Senhas e identifica
quais seguradoras estão com credenciais inválidas. Envia relatório por e-mail.

**Tecnologia:** Python + Playwright (browser headless) + 2captcha (resolve reCAPTCHA v2)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    bot.omnitheus.com.br                      │
│                   VPS Ubuntu 24.04 (212.85.22.247)          │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Traefik │───▶│  Frontend    │    │    Backend       │  │
│  │  (proxy) │    │  Next.js 14  │    │  FastAPI 0.115   │  │
│  │  SSL/TLS │───▶│  Tailwind    │───▶│  APScheduler    │  │
│  └──────────┘    └──────────────┘    │  Playwright      │  │
│                                      └────────┬─────────┘  │
│  ┌──────────────────────────────────┐         │             │
│  │  PostgreSQL 16 (omnitheus-postgres)│◀───────┘             │
│  │  Database: robo_harper           │                       │
│  └──────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Modelo de Dados

```
tenants              ← Empresas clientes da plataforma
  └── usuarios       ← Usuários por empresa (roles: owner/admin/operator/viewer)
  └── robos          ← Robôs disponíveis (tenant_id=1 = plataforma = visível a todos)
  └── agendamentos   ← Cron schedules por tenant
  └── execucoes      ← Histórico de execuções por tenant
  └── credenciais_tenant  ← Credenciais do cliente por robô (URL, usuário, senha)
  └── refresh_tokens ← Controle de sessões JWT
```

---

## Multi-tenancy

- Cada empresa é um **tenant** isolado
- Dados filtrados por `tenant_id` em todas as queries
- **Robôs da plataforma** (tenant_id=1) são visíveis para todos os clientes
- Cada cliente cadastra suas próprias credenciais via `/credenciais`

---

## Segurança

| Camada | Tecnologia |
|---|---|
| Senha | bcrypt hash |
| Autenticação | JWT (access 15min + refresh 7d com rotação) |
| Autorização | RBAC: owner > admin > operator > viewer |
| Isolamento | tenant_id em todas as tabelas |
| Transporte | HTTPS via Traefik + Let's Encrypt |

---

## Serviços da Plataforma (env do servidor)

| Serviço | Responsável |
|---|---|
| Chave 2captcha | Plataforma (env TWOCAPTCHA_KEY) |
| E-mail remetente | Plataforma (env EMAIL_USER/PASS) |
| URL do Quiver | **Cliente** (cadastra em /credenciais) |
| Usuário Quiver | **Cliente** (cadastra em /credenciais) |
| Senha Quiver | **Cliente** (cadastra em /credenciais) |
| E-mail destinatário | **Cliente** (cadastra em /credenciais) |

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS + TypeScript |
| Backend | FastAPI (Python 3.12) |
| Banco | PostgreSQL 16 |
| Scheduler | APScheduler (asyncio) |
| Automação | Playwright + Chromium headless |
| Captcha | 2captcha API |
| Auth | JWT (python-jose) + bcrypt |
| Proxy | Traefik 3 + Let's Encrypt |
| Container | Docker + Docker Compose |
| VPS | Ubuntu 24.04 — 212.85.22.247 |

---

## Estrutura de Diretórios

```
/Users/marcocrepaldi/Documents/Omnitheus-Bot/
├── portal/
│   ├── backend/           ← FastAPI + auth + scheduler + robôs
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py  ← SQLAlchemy models
│   │   │   ├── security.py← JWT + bcrypt
│   │   │   ├── deps.py    ← RBAC dependencies
│   │   │   ├── scheduler.py← APScheduler
│   │   │   └── routers/   ← auth, robos, execucoes, agendamentos,
│   │   │                     usuarios, admin, credenciais
│   │   └── robots/
│   │       └── quiver_credenciais.py
│   ├── frontend/          ← Next.js
│   │   └── src/app/       ← dashboard, robos, credenciais,
│   │                         agendamentos, logs, usuarios, clientes
│   └── docker-compose.yml
└── robos/
    └── quiver/            ← script local para testes
```

---

## VPS — Na Produção

```
/root/portal-robos/        ← deploy na VPS
├── backend/
├── frontend/
├── docker-compose.yml
└── .env                   ← credenciais da plataforma (nunca no git)
```

---

## Acesso à Produção

| URL | Descrição |
|---|---|
| https://bot.omnitheus.com.br | Portal (produção) |
| https://bot.omnitheus.com.br/api/docs | Swagger da API |
| http://localhost:3001 | Portal (desenvolvimento local) |
| http://localhost:8000 | API (desenvolvimento local) |

**Credencial master:** `ti@harperseguros.com.br` / `Trocar@123`

---

## Roadmap

- [x] Robô 1: Verificação de credenciais Quiver
- [ ] Robô 2: Troca automática de senha quando falha detectada
- [ ] Self-service: cadastro de clientes + pagamento (Stripe)
- [ ] Troca de senha pelo portal
- [ ] Notificações em tempo real (WebSocket)
- [ ] Relatórios históricos por seguradora

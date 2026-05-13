# Omnitheus Bot — Guia Completo para Claude

## O que é o projeto

**Omnitheus Bot** é uma plataforma SaaS de automação de processos para corretoras de seguros.
Permite que corretoras cadastrem suas credenciais, agendem robôs e recebam alertas automáticos
quando credenciais de seguradoras estão inválidas — com rotação automática de senha.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 App Router + Tailwind CSS + TypeScript |
| Backend | FastAPI (Python 3.12) + SQLAlchemy |
| Banco | PostgreSQL 16 (`omnitheus-postgres` container na VPS) |
| Scheduler | APScheduler (asyncio) |
| Automação | Playwright + Chromium headless |
| Captcha | 2captcha API (`af7c78c3162a48035d8904143aa955b6`) |
| Criptografia | Fernet AES (python `cryptography`) — cofre de senhas |
| Auth | JWT (python-jose) access 15min + refresh 7d com rotação |
| Proxy | Traefik 3 via Docker labels (entrypoint: `https`, não `websecure`) |
| Container | Docker + Docker Compose |
| VPS | Ubuntu 24.04 — `212.85.22.247` |

---

## Arquitetura de Diretórios

```
/Users/marcocrepaldi/Documents/Omnitheus-Bot/
├── CLAUDE.md               ← este arquivo
├── ARQUITETURA.md          ← documentação técnica legada
├── portal/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py         ← FastAPI + lifespan (limpa execuções presas)
│   │   │   ├── models.py       ← SQLAlchemy: Tenant, Usuario, Robo, Execucao,
│   │   │   │                     CredencialTenant, CofreSenha, RefreshToken
│   │   │   ├── vault.py        ← criptografar/descriptografar/gerar_senha (Fernet)
│   │   │   ├── security.py     ← JWT + bcrypt
│   │   │   ├── deps.py         ← RBAC dependencies
│   │   │   ├── scheduler.py    ← APScheduler + timeout 8min + ROBOT_MAP
│   │   │   └── routers/
│   │   │       ├── auth.py
│   │   │       ├── robos.py
│   │   │       ├── execucoes.py    ← inclui robo_nome na resposta
│   │   │       ├── agendamentos.py
│   │   │       ├── credenciais.py  ← merge (não substitui) + dados_publicos
│   │   │       ├── cofre.py        ← CRUD + rotacionar + rollback + rotacao-completa
│   │   │       ├── usuarios.py
│   │   │       └── admin.py
│   │   ├── robots/
│   │   │   ├── quiver_credenciais.py    ← Robô 1: detecta credenciais inválidas
│   │   │   ├── suhai_troca_senha.py     ← Robô 2: troca senha no portal SUHAI
│   │   │   └── quiver_atualiza_senha.py ← Robô 3: atualiza senha no Quiver via API
│   │   ├── .env                ← secrets da plataforma (nunca no git)
│   │   └── requirements.txt
│   ├── frontend/
│   │   └── src/app/
│   │       ├── login/          ← autenticação JWT
│   │       ├── page.tsx        ← dashboard
│   │       ├── robos/          ← CRUD + disparo manual
│   │       ├── credenciais/    ← campos por robô (CAMPOS_POR_ROBO)
│   │       ├── cofre/          ← cofre de senhas em grid 3 colunas
│   │       ├── agendamentos/
│   │       ├── logs/           ← EX-XXXX, nome do robô, duração
│   │       ├── usuarios/
│   │       └── clientes/       ← superAdmin only
│   └── docker-compose.yml
```

---

## Multi-tenancy e RBAC

```
tenants              ← Empresas clientes
  └── usuarios       ← owner > admin > operator > viewer
  └── robos          ← tenant_id=1 = plataforma (visível a todos)
  └── agendamentos
  └── execucoes
  └── credenciais_tenant  ← credenciais por robô (merge no save)
  └── cofre_senhas        ← cofre AES por seguradora
  └── refresh_tokens
```

**Tenants ativos:**
- `tenant_id=1` — Omnitheus (admin/plataforma) — usuário: `ti@harperseguros.com.br`
- `tenant_id=2` — Harper Seguros (cliente) — usuário: `debora@harperseguros.com.br`

---

## Robôs

### Robô 1 — Quiver: Verificação de Credenciais (`quiver_credenciais.py`)
- Login no Quiver com reCAPTCHA v2 via 2captcha
- Navega até Central de Senhas via `SelecionaModuloJQuery()` (JS, não clique visual)
- Abre Central de Senhas (`btConfiguracoes`)
- Coleta `.cia-com-erro` no frame `centralsenhas.quiver.net.br`
- Envia e-mail de alerta com lista de seguradoras inválidas
- **Credenciais necessárias:** `HARPER_URL`, `HARPER_USER`, `HARPER_PASS`, `TWOCAPTCHA_KEY`, `EMAIL_TO`

### Robô 2 — SUHAI: Troca de Senha (`suhai_troca_senha.py`)
- Login em `https://i4pro.suhaiseguradora.com.br/Default.aspx`
- Campos: `#cd_usuario`, `#nm_senha`, botão `#botaoEntrar`
- Navega para Alterar Senha via `ConfirmaPaginaMenu(null, 'Default.aspx?eng_idtela=-344...')`
- Frame da tela: URL contém `eng_idtela=-344`
- Preenche `#nm_senha_atual`, `#nm_senha`, `#nm_senha_confirma` e clica `#TRBTNC_-2321`
- Sem captcha — executa em ~15 segundos
- **Credenciais necessárias:** `SUHAI_USER`, `SUHAI_PASS`, `SUHAI_NEW_PASS`

### Robô 3 — Quiver: Atualiza Senha no Quiver (`quiver_atualiza_senha.py`)
- Login no Quiver (igual Robô 1, com captcha)
- Abre Central de Senhas para estabelecer sessão Angular
- Usa Angular scope para selecionar seguradora: `selecionarSeguradora(ciaCodigo)`
- Obtém objeto da credencial via: `editarCredencial(credencial)` no scope
- Faz **PUT direto na API**: `PUT /credenciais/TOKEN/credenciaisSeguradoraFila`
  - Remove props `$$hashKey` (Angular internals) antes do PUT
- **Mapeamento ciaCodigo:** `SUHAI=4952` (adicionar novas em `CIA_CODIGOS`)
- Token da sessão: `4FEA614E6E3045D59FE2E2A6D3393AC4` (fixo para Harper)
- **Credenciais necessárias:** `HARPER_URL`, `HARPER_USER`, `HARPER_PASS`, `TWOCAPTCHA_KEY`, `SEGURADORA_NOME`, `SEGURADORA_PASS`

---

## Cofre de Senhas

### Modelo (`CofreSenha`)
```python
tenant_id, seguradora_nome (unique por tenant),
login, senha_enc (Fernet), senha_anterior_enc (rollback),
url_portal, observacao, atualizado_em, criado_em
```

### Chave de criptografia
```
VAULT_KEY=ShLh4bc5VSvzH6GOpgINSV5ZZCco6FsGQNn2odqiUS4=
```
Deve estar no `.env` do backend E declarada no `docker-compose.yml` (`environment`).

### API `/cofre`
| Endpoint | Descrição |
|---|---|
| `GET /cofre/` | Lista (sem senhas) |
| `GET /cofre/{id}/senha` | Retorna senha descriptografada |
| `POST /cofre/` | Cria ou atualiza (merge) |
| `POST /cofre/{id}/rotacionar` | Gera nova senha automática |
| `POST /cofre/{id}/rotacao-completa` | Dispara Robô 2 → atualiza cofre → Robô 3 |
| `POST /cofre/{id}/rollback` | Restaura senha anterior |
| `DELETE /cofre/{id}` | Remove |

### Fluxo de Rotação Completa
```
Clica ⚡ Rotação Completa no cofre
  ↓
Gera nova senha (16 chars: maiúscula + minúscula + número + símbolo)
Salva no cofre (senha_anterior preservada para rollback)
  ↓
EX-XXXX  Robô 2 → Troca no portal da seguradora (~15s para SUHAI)
  ↓ se falhar → rollback automático no cofre
EX-XXXX  Robô 3 → Atualiza no Quiver via API direta (~3min com captcha)
  ↓
✅ Seguradoras e Quiver sincronizados
```

### Frontend `/cofre`
- Grid 3 colunas (responsivo 1→2→3)
- Badge **"pendente"** = credencial fictícia (observação contém "fictíc")
- ✏️ Lápis abre formulário inline: login + senha + URL
- **⚡ Rotação Auto** só aparece em credenciais sem badge "pendente"
- Polling automático do status (a cada 8s, até 80 tentativas)

---

## VPS — Produção

```
212.85.22.247 (Ubuntu 24.04)
/root/portal-robos/
├── backend/
├── frontend/
├── docker-compose.yml
└── .env   ← DATABASE_URL, TWOCAPTCHA_KEY, EMAIL_*, VAULT_KEY, DOMAIN
```

### Traefik — IMPORTANTE
O Easypanel gerencia o Traefik na VPS. **Rotas configuradas via Docker labels** nos containers
(não mais via `main.yaml` estático que o Easypanel sobrescreve).

```yaml
# Entrypoint correto no Easypanel: 'https' (NÃO 'websecure')
traefik.http.routers.robos-www.entrypoints=https
traefik.http.routers.robos-api.entrypoints=https
```

**Se o site cair** (raro agora com labels), verificar e restaurar:
```bash
ssh root@212.85.22.247  # senha: Lim@1924@Lim@1924
python3 /root/fix_traefik.py
```

### Deploy padrão
```bash
# Sync arquivos
sshpass -p 'Lim@1924@Lim@1924' rsync -avz --exclude='.next' --exclude='node_modules' \
  --exclude='venv' --exclude='__pycache__' --exclude='.env' \
  portal/ root@212.85.22.247:/root/portal-robos/

# Rebuild e restart
ssh root@212.85.22.247
cd /root/portal-robos
docker compose build --no-cache frontend backend
docker compose up -d
```

### Banco de dados
```
Host:     212.85.22.247:5432
Database: robo_harper
User:     robo_harper_user
Password: RoboHarper2026
Container: omnitheus-postgres
```

### URLs de Produção
| URL | Descrição |
|---|---|
| https://bot.omnitheus.com.br | Portal (produção) |
| https://bot.omnitheus.com.br/api/docs | Swagger da API |
| http://localhost:3001 | Portal (dev local) |
| http://localhost:8000 | API (dev local) |

---

## Credenciais da Plataforma (`.env` backend)

```env
DATABASE_URL=postgresql://robo_harper_user:RoboHarper2026@host.docker.internal:5432/robo_harper
TWOCAPTCHA_KEY=af7c78c3162a48035d8904143aa955b6
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=marcocrepalldi@gmail.com
EMAIL_PASS=mlrd qzdt wyen ahwx
VAULT_KEY=ShLh4bc5VSvzH6GOpgINSV5ZZCco6FsGQNn2odqiUS4=
DOMAIN=bot.omnitheus.com.br
```

**Credenciais master:** `ti@harperseguros.com.br` / `Trocar@123`
**Harper Seguros (cliente):** `debora@harperseguros.com.br` / `Lim@1924`

---

## Scheduler — ROBOT_MAP

```python
ROBOT_MAP = {
    1: "robots.quiver_credenciais",      # Robô 1 — Verificação Quiver
    2: "robots.suhai_troca_senha",       # Robô 2 — Troca senha SUHAI
    3: "robots.quiver_atualiza_senha",   # Robô 3 — Atualiza Quiver via API
}
```

- Timeout por execução: **8 minutos** (`asyncio.wait_for`)
- Ao iniciar o backend: execuções `em_execucao` são marcadas como `erro` automaticamente
- Credenciais do tenant são injetadas no `os.environ` antes da execução e restauradas depois

---

## Notas Importantes para Desenvolvimento

1. **Traefik entrypoints:** usar `https`/`http`, nunca `websecure`/`web` (padrão Easypanel)
2. **Quiver navSide:** elementos ocultos — usar JS direto (`SelecionaModuloJQuery`) em vez de `.click()`
3. **Angular $$hashKey:** remover propriedades `$$` antes de PUT na API da Central de Senhas
4. **VAULT_KEY:** deve estar no `.env` E na seção `environment:` do `docker-compose.yml`
5. **Merge de credenciais:** `POST /credenciais/` e `POST /cofre/` fazem merge (não substituem)
6. **Build frontend:** sempre `npm run build && npm start` em produção (não `npm run dev`)
7. **Quiver token API:** `4FEA614E6E3045D59FE2E2A6D3393AC4` (numSerie=3005831, Harper Seguros)
8. **SUHAI ciaCodigo:** 4952 (mapeado em `CIA_CODIGOS` no Robô 3)

---

## Roadmap

- [x] Robô 1: Verificação de credenciais Quiver
- [x] Robô 2: Troca automática de senha SUHAI
- [x] Robô 3: Atualização automática no Quiver via API
- [x] Cofre de senhas com criptografia AES + rotação automática
- [x] Multi-tenant com RBAC (owner/admin/operator/viewer)
- [x] Logs com ID de execução (EX-XXXX) e duração
- [ ] Robôs para outras seguradoras (além de SUHAI)
- [ ] Rotação automática agendada (Robô 1 detecta → aciona Robô 2+3 automaticamente)
- [ ] Self-service: cadastro de clientes + pagamento (Stripe)
- [ ] Troca de senha pelo portal (para usuários do sistema)
- [ ] Notificações em tempo real (WebSocket)

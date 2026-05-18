# Omnitheus Bot — Guia Completo para Claude

## O que é o projeto

**Omnitheus Bot** é uma plataforma SaaS de automação de processos para corretoras de seguros.
Permite que corretoras cadastrem suas credenciais, agendem robôs e recebam alertas automáticos
quando credenciais de seguradoras estão inválidas — com sincronização de senha no Quiver.

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
| Auth | JWT (python-jose) access 4h + refresh 7d com rotação + auto-refresh frontend |
| Proxy | Traefik 3 via Docker labels (entrypoint: `https`, não `websecure`) |
| Container | Docker + Docker Compose |
| VPS | Ubuntu 24.04 — `212.85.22.247` |

---

## Arquitetura de Diretórios

```
/Users/marcocrepaldi/Documents/Omnitheus-Bot/
├── CLAUDE.md               ← este arquivo
├── ARQUITETURA.md          ← documentação técnica legada
├── scripts/                ← scripts utilitários (import, investigação Quiver, migração)
├── portal/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py            ← FastAPI + lifespan + _migrar() + _seed_rbac_v2()
│   │   │   ├── models.py          ← SQLAlchemy: + CategoriaCofre, Role, Team, TeamMember,
│   │   │   │                        TeamRole, AuditLog (RBAC v2)
│   │   │   ├── schemas.py
│   │   │   ├── vault.py           ← criptografar/descriptografar/gerar_senha (Fernet)
│   │   │   ├── security.py        ← JWT (4h) + bcrypt + perms no payload
│   │   │   ├── deps.py            ← requer_role (legado) + requer (RBAC v2)
│   │   │   ├── permissions.py     ← engine RBAC v2 com wildcards
│   │   │   ├── audit.py           ← helper de registro de auditoria
│   │   │   ├── scheduler.py       ← APScheduler + timeout 8min + ROBOT_MAP
│   │   │   ├── seeds/             ← Template Corretora aplicado em todo tenant
│   │   │   │   ├── categorias_template.py
│   │   │   │   ├── roles_sistema.py     ← catálogo de permissões + 5 roles padrão
│   │   │   │   └── aplica_template.py   ← idempotente, roda no startup
│   │   │   └── routers/
│   │   │       ├── auth.py            ← /login retorna permissoes[]
│   │   │       ├── robos.py
│   │   │       ├── execucoes.py       ← dashboard enriquecido
│   │   │       ├── agendamentos.py
│   │   │       ├── credenciais.py
│   │   │       ├── cofre.py           ← CofreSenha (legado, ainda em uso pelos robôs)
│   │   │       ├── cofre_itens.py     ← Cofre Pro (1Password) — filtra por permissão
│   │   │       ├── categorias.py      ← CRUD categorias customizáveis
│   │   │       ├── roles_admin.py     ← CRUD roles + catálogo de permissões
│   │   │       ├── teams.py           ← CRUD times + N:N com usuários e roles
│   │   │       ├── audit.py           ← Listagem com filtros
│   │   │       ├── tenants.py         ← Transferir ownership
│   │   │       ├── usuarios.py        ← PATCH /{uid}/senha + role cofre
│   │   │       └── admin.py
│   │   ├── robots/
│   │   │   ├── quiver_credenciais.py    ← Robô 1: detecta credenciais inválidas
│   │   │   ├── suhai_troca_senha.py     ← Robô 2: troca senha no portal SUHAI (não usado mais)
│   │   │   └── quiver_atualiza_senha.py ← Robô 3: atualiza senha no Quiver via API
│   │   │                                   + NORMALIZA checkboxes indeterminados (X → S)
│   │   ├── .env                ← secrets da plataforma
│   │   └── requirements.txt
│   ├── frontend/
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── auth.ts           ← apiFetch com auto-refresh em 401/403
│   │       │   └── permissions.ts    ← temPermissao() lendo JWT no client
│   │       ├── components/
│   │       │   └── Sidebar.tsx       ← renderiza por permissão, grupo "Administração"
│   │       └── app/
│   │           ├── login/
│   │           ├── page.tsx           ← dashboard rico
│   │           ├── robos/             ← grid 3 colunas
│   │           ├── credenciais/       ← grid 3 colunas
│   │           ├── cofre/             ← Cofre Pro: campos dinâmicos + busca + sincronizar
│   │           ├── categorias/        ← CRUD categorias customizáveis (RBAC v2)
│   │           ├── roles/             ← CRUD roles + builder de permissões
│   │           ├── times/             ← CRUD times + atribuição N:N
│   │           ├── auditoria/         ← Lista filtrada de eventos sensíveis
│   │           ├── agendamentos/      ← picker visual (sem cron exposto)
│   │           ├── logs/              ← grid 2 colunas
│   │           ├── usuarios/          ← grid 3 colunas + redefinir senha inline
│   │           └── clientes/          ← superAdmin only
│   └── docker-compose.yml
```

---

## Multi-tenancy + RBAC v2

### Modelo de dados

```
TENANT
  │
  ├── usuarios                ← legado: role string (mantido por compat)
  ├── categorias_cofre        ← customizáveis: nome, slug, icone, cor, ordem, sistema
  ├── roles                   ← customizáveis + sistema=true (templates)
  │     └── permissoes JSON: ["cofre:view@*", "cofre:reveal@cat:5", "robos:execute"]
  ├── teams                   ← grupos de usuários
  │     ├── team_members      (N:N team × usuario)
  │     └── team_roles        (N:N team × role)
  ├── cofre_itens             ← agora com categoria_id (FK em categorias_cofre)
  └── audit_log               ← acoes sensíveis: cofre:reveal, cofre:edit, cofre:delete...
```

### Sistema de permissões

Formato: `<modulo>:<acao>[@escopo]`

| Permissão | Significado |
|-----------|-------------|
| `*` | super-admin (owner) |
| `cofre:*` | todas ações no cofre |
| `cofre:view@*` | ver lista, qualquer categoria |
| `cofre:view@cat:5` | ver lista APENAS da categoria 5 |
| `cofre:reveal@cat:5` | revelar senha apenas da categoria 5 |
| `robos:execute` | disparar robôs |

**Engine** em `app/permissions.py`:
- `permissoes_efetivas(usuario_id, db)` — une perms de todos os times
- `tem_permissao(perms, requerida)` — com wildcards
- `categorias_visiveis(perms)` — retorna `"*"` ou `set[int]` para filtrar listagem

### Roles padrão do sistema (auto-aplicadas)

| Role | Permissões |
|------|-----------|
| **Owner** | `["*"]` |
| **Admin** | tudo exceto `*` global (gerencia tenant) |
| **Operator** | dashboard, cofre full, robos:execute, agendamentos |
| **Viewer** | só leitura |
| **Cofre Básico** | só `cofre:view@*` + `cofre:reveal@*` |

Cliente pode **duplicar uma role do sistema e customizar** — ex: criar "Financeiro" só com `cofre:view@cat:Banco` + `cofre:reveal@cat:Banco`.

### Auditoria

Eventos registrados em `audit_log`:
- `cofre:create` — criação de item
- `cofre:edit` — edição de item
- `cofre:reveal` — revelar senha (sensível)
- `cofre:delete` — exclusão (via futura ação)
- `tenant:owner-transferido`

Retenção: dados ficam na tabela; UI lista por padrão últimos 7 dias com filtros.

### Onboarding

Quando um novo tenant é criado, `_seed_rbac_v2()` no startup:
1. Cria 8 categorias do template **Corretora** (Banco, Auto, Saúde, Vida, Empresarial, Sistemas, E-mail, Outro)
2. Cria 5 roles padrão do sistema
3. Cria 5 times padrão (um por role) e atribui usuário existente conforme `role` legado
4. Migra `cofre_itens.categoria` (string) → `categoria_id` (FK)

**Idempotente** — pode rodar quantas vezes quiser.

### Tenants ativos

- `tenant_id=1` — Harper Seguros (admin/plataforma) — usuário: `ti@harperseguros.com.br`
- `tenant_id=2` — Harper Corretora (**cliente piloto**) — usuários: Débora (owner), Danubia, Evandro, Enzo (operator), Jefferson (cofre)

---

## Cofre Pro — Modelo 1Password (`cofre_itens`)

### Estrutura
```python
CofreItem:
  tenant_id, categoria_id (FK), nome, url, tags JSON, notas,
  robo_vinculo (int | None),  # ex: 2 → SUHAI
  campos JSON: [{
    label, valor, valor_enc (Fernet),
    tipo: "text"|"password"|"email"|"url",
    oculto: bool,
    purpose: "LOGIN"|"PASSWORD"|None  # usado pela sincronização
  }]
  historico JSON: [últimas 5 senhas trocadas]
```

### API `/cofre-itens`

| Endpoint | Permissão | Descrição |
|----------|-----------|-----------|
| `GET /cofre-itens/` | cofre/operator | Lista filtrada pelas categorias visíveis do usuário |
| `POST /cofre-itens/` | cofre/operator | Criar item |
| `PUT /cofre-itens/{id}` | cofre/operator | Editar item |
| `DELETE /cofre-itens/{id}` | admin | Excluir |
| `POST /cofre-itens/{id}/campos/{idx}/revelar` | cofre/operator | Descriptografa campo oculto + AUDITA |
| `POST /cofre-itens/{id}/campos/{idx}/trocar-senha` | cofre/operator | Gera nova senha (histórico até 5) |
| `POST /cofre-itens/{id}/sincronizar-quiver` | cofre/operator | Roda **só o Robô 3** com senha atual |
| `POST /cofre-itens/importar` | admin | Bulk import (lista de items) |
| `GET /cofre-itens/{id}/historico` | admin | Histórico descriptografado |

### Fluxo de senha expirada (CORRETO — atualmente em uso)

```
🤖 Robô 1 detecta credencial expirada (todo dia 08:00)
  ↓
📧 E-mail enviado para a corretora (EMAIL_TO pode ter múltiplos destinatários)
  ↓
👤 Cliente recupera senha manualmente no portal da seguradora
  ↓
✏️  Cliente atualiza a nova senha no cofre via UI
  ↓
⚡ Cliente clica em "Sincronizar Quiver"
  ↓
🤖 Robô 3 atualiza no Quiver via PUT direto na API
      + NORMALIZA checkboxes em estado "X" (indeterminado/amarelo) para "S"
  ↓
✅ Quiver e seguradora sincronizados
```

**O Robô 2 não é mais usado nesse fluxo** — só fazia sentido se a seguradora permitisse trocar senha programaticamente, o que não é o caso (SUHAI exige recuperação via e-mail).

### Frontend `/cofre`
- Grid 3 colunas (responsivo)
- Filtro por categoria + busca por texto
- Itens carregados via API filtrada por permissão (usuário "Financeiro" só vê categoria Banco)
- Drawer lateral de criação/edição com **campos dinâmicos** (label + valor + tipo + purpose + criptografar)
- Visual diferenciado para campos de senha (fundo escuro avermelhado)
- Botão ⚡ **Sincronizar Quiver** só aparece em itens com `robo_vinculo` configurado

---

## Robôs

### Robô 1 — Quiver: Verificação de Credenciais (`quiver_credenciais.py`)
- Login no Quiver com reCAPTCHA v2 via 2captcha
- Navega até Central de Senhas via `SelecionaModuloJQuery()`
- Coleta `.cia-com-erro` no frame `centralsenhas.quiver.net.br`
- Envia e-mail de alerta **com suporte a múltiplos destinatários** (separados por `,` ou `;`)
- Log detalhado SMTP (detecta rejeição/erro por destinatário)
- **Credenciais:** `HARPER_URL`, `HARPER_USER`, `HARPER_PASS`, `TWOCAPTCHA_KEY`, `EMAIL_TO`
- **Agendado**: `0 8 * * *` para tenant 2 (Harper Corretora — diário 08:00)

### Robô 2 — SUHAI: Troca de Senha (`suhai_troca_senha.py`) — **NÃO USADO**
- Existe para histórico, mas o fluxo atual não chama mais.
- Razão: portais de seguradoras geralmente exigem reset via e-mail.

### Robô 3 — Quiver: Atualiza Senha no Quiver (`quiver_atualiza_senha.py`)
- Login no Quiver (igual Robô 1, com captcha)
- Abre Central de Senhas para estabelecer sessão Angular
- Seleciona seguradora via Angular scope: `selecionarSeguradora(ciaCodigo)`
- Obtém objeto da credencial via `editarCredencial(credencial)` no scope
- **Normaliza checkboxes indeterminados** ⭐ (descoberta importante):
  - Os 7 checkboxes da tela (Cálculo, Comissão, Emissão, Parcelas, Proposta, Login Automático, Credencial padrão) usam:
    - `ng-true-value="S"` → ativado (verde)
    - `ng-false-value="N"` → desativado
    - `ng-indeterminate-value="X"` → **amarelo/indeterminado** (quando senha expira)
  - O robô detecta campos com valor `"X"` e força para `"S"` (preserva funcionalidade ativa) ou `"N"` (apenas `integracoes`/`sinistro`)
  - **Sem essa normalização, o PUT é aceito mas a senha não é validada** — esse era o bug que fazia "senha não salvar" no Quiver
- Remove props `$$hashKey` (Angular internals) antes do PUT
- Faz **PUT direto na API**: `PUT /credenciais/TOKEN/credenciaisSeguradoraFila`
- **Mapeamento ciaCodigo:** `SUHAI=4952`, `BRADESCO=5177`, `ALLIANZ=5177` (CIA_CODIGOS)
- Token da sessão: `4FEA614E6E3045D59FE2E2A6D3393AC4` (fixo para Harper)
- **Credenciais:** `HARPER_URL`, `HARPER_USER`, `HARPER_PASS`, `TWOCAPTCHA_KEY`, `SEGURADORA_NOME`, `SEGURADORA_PASS`

#### Estrutura do objeto credencial (Angular)
```json
{
  "idCredencial": 58780,
  "descricaoCredencial": "SUHAI",
  "ciaCodigo": 4952,
  "usuarioCredencial": "suhai3148",
  "senhaCredencial": "****",
  // 7 checkboxes da UI — todos S/N/X
  "comissaoCredencial": "S",
  "emissaoCredencial": "S",
  "propostaCredencial": "S",
  "parcelasCredencial": "S",
  "calculoCredencial": "S",
  "loginAutomaticoCredencial": "S",
  "credencialPadrao": "S",
  // adicionais
  "integracoesCredencial": "N",
  "sinistroCredencial": "N",
  "JsonComplemento1": {...},  // metadados específicos por seguradora
  "JsonComplemento2": [...]
}
```

---

## Dashboard (`/` — `page.tsx`)

### API `/execucoes/dashboard`
```python
total_robos               # inclui robôs tenant_id=1 + tenant próprio
robos_ativos
total_execucoes
execucoes_com_falha       # "falha" + "erro"
ultima_execucao           # datetime
ultima_execucao_status    # "sucesso" | "falha" | "erro"
ultima_execucao_robo      # nome
ultima_execucao_duracao   # segundos
credenciais_com_erro      # lista de strings
ultimas_execucoes         # últimas 6
```

### Componentes
- **4 StatCards:** Total Robôs, Execuções, Com Falha, Taxa de Sucesso %
- **Painel "Último Relatório":** data + hora + "há X min", robô, status, duração
- **Credenciais com erro** integradas
- **Histórico Recente:** últimas 6 execuções (mini-tabela)

---

## Auth & Permissões — Frontend

### `lib/auth.ts`
- `apiFetch(url, init)` — wrapper sobre fetch que:
  - Injeta `Authorization: Bearer <access_token>` automaticamente
  - Em caso de 401/403 chama `/auth/refresh` e refaz a requisição
  - Em caso de refresh falhar → `limparSessao()` + redirect `/login`
  - Usa **request coalescing** para evitar múltiplos refresh simultâneos
- Cookie `access_token` armazenado em localStorage (4h) + cookie httpOnly não usado por simplicidade
- Cookie `user_role` para o middleware Next.js

### `lib/permissions.ts` (NEW)
- `getPermissoes()` — decodifica JWT e retorna `perms[]`
- `temPermissao(perm)` — checa com wildcards (`*`, `cofre:*`, `cofre:view@*`)
- `categoriasVisiveisCofre()` — `null` (todas) ou `int[]` (filtradas)

Usado no `Sidebar.tsx` para renderizar links só do que o usuário pode acessar.

### Token JWT
- Access: 4h (`ACCESS_TOKEN_EXPIRE_MINUTES=240`)
- Refresh: 7 dias
- Payload do access inclui: `sub, tenant_id, role, perms[]`
- Permite filtrar UI sem extra round-trip

---

## Layout Padrão de Todas as Páginas

`bg-neutral-50 dark:bg-neutral-950` no `<main>` + grid de cards:

| Página | Grid |
|---|---|
| `/robos`, `/agendamentos`, `/usuarios`, `/credenciais`, `/cofre`, `/categorias`, `/roles`, `/times` | `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` |
| `/logs` | `grid-cols-1 xl:grid-cols-2` |
| `/auditoria` | tabela inline (lista vertical) |

Cards: ícone + título no topo, conteúdo no meio, ações no rodapé com `border-t`.

### Agendamentos — picker visual
Sem cron exposto. Frequências: ☀️ Todo dia · 📅 Seg-Sex · 🗓️ Dias escolhidos · ⏱️ A cada hora · ⚙️ Avançado. `cronToHuman()` converte para texto na lista.

### Usuários — avatar
`<Initials nome={u.nome} />` gera círculo com 2 iniciais coloridas. Mostra times do usuário em badges.

### Sidebar — grupo "Administração"
Links de gestão (Categorias, Perfis, Times, Usuários, Auditoria) ficam num grupo colapsável. Visibilidade controlada por `temPermissao(link.perm)`.

---

## VPS — Produção

```
212.85.22.247 (Ubuntu 24.04)
/root/portal-robos/
├── backend/
├── frontend/
├── docker-compose.yml
└── .env   ← DATABASE_URL, TWOCAPTCHA_KEY, EMAIL_*, VAULT_KEY, DOMAIN, ACCESS_TOKEN_EXPIRE_MINUTES=240
```

### Deploy rápido (sem rebuild — só mudou .py)
```bash
sshpass -p 'Lim@1924@Lim@1924' rsync -avz \
  portal/backend/app/.../arquivo.py \
  root@212.85.22.247:/root/portal-robos/backend/.../

sshpass -p 'Lim@1924@Lim@1924' ssh root@212.85.22.247 \
  "docker cp /root/portal-robos/backend/.../arquivo.py portal-robos-backend-1:/app/.../ && \
   docker compose -f /root/portal-robos/docker-compose.yml restart backend"
```

### Deploy completo (com rebuild)
```bash
sshpass -p 'Lim@1924@Lim@1924' rsync -avz portal/backend/app/ root@212.85.22.247:/root/portal-robos/backend/app/
sshpass -p 'Lim@1924@Lim@1924' rsync -avz portal/frontend/src/ root@212.85.22.247:/root/portal-robos/frontend/src/
sshpass -p 'Lim@1924@Lim@1924' ssh root@212.85.22.247 \
  "cd /root/portal-robos && docker compose build --no-cache backend frontend && docker compose up -d"
```

### Banco
```
Host:     212.85.22.247:5432  (também acessível por host.docker.internal nos containers)
Database: robo_harper
User:     robo_harper_user
Password: RoboHarper2026
Container: omnitheus-postgres
```

### URLs
| URL | Descrição |
|---|---|
| https://bot.omnitheus.com.br | Portal (produção) |
| https://bot.omnitheus.com.br/api/docs | Swagger |
| http://localhost:3000 | Portal (dev) |
| http://localhost:8000 | API (dev) |

---

## Credenciais

```env
DATABASE_URL=postgresql://robo_harper_user:RoboHarper2026@host.docker.internal:5432/robo_harper
TWOCAPTCHA_KEY=af7c78c3162a48035d8904143aa955b6
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=marcocrepalldi@gmail.com
EMAIL_PASS=mlrd qzdt wyen ahwx
VAULT_KEY=ShLh4bc5VSvzH6GOpgINSV5ZZCco6FsGQNn2odqiUS4=
DOMAIN=bot.omnitheus.com.br
ACCESS_TOKEN_EXPIRE_MINUTES=240
```

**Logins:**
- `ti@harperseguros.com.br` / `Trocar@123` (tenant 1, owner)
- `debora@harperseguros.com.br` / `Lim@1924` (tenant 2, owner do cliente piloto)
- `jefferson@harperseguros.com.br` / ... (tenant 2, role cofre)
- VPS: `root@212.85.22.247` / `Lim@1924@Lim@1924`

---

## Scheduler — ROBOT_MAP

```python
ROBOT_MAP = {
    1: "robots.quiver_credenciais",      # Robô 1 — Verificação Quiver
    2: "robots.suhai_troca_senha",       # Robô 2 — NÃO USADO no fluxo atual
    3: "robots.quiver_atualiza_senha",   # Robô 3 — Sincroniza no Quiver
}
```

- Timeout: 8 min (`asyncio.wait_for`)
- Startup: execuções `em_execucao` são marcadas como `erro`
- Credenciais do tenant injetadas via `os.environ` antes da execução

---

## Investigação Quiver — Scripts úteis

```
scripts/
├── investigar_quiver_edit_credencial.py  ← captura estrutura da credencial
├── investigar_quiver_checks.py           ← análise dos ng-true-value/false/indeterminate
├── dump_quiver_edit.py                   ← dump completo do HTML do form
├── importar_aba_senhas.py                ← import inicial do cofre via XLSX
└── importar_dados_harper.py              ← import alternativo
```

Padrão para rodar dentro do container backend:
```bash
docker cp script.py portal-robos-backend-1:/tmp/x.py
docker exec -e HARPER_USER='Debora' -e HARPER_PASS='Lim@1924' \
            -e TWOCAPTCHA_KEY='...' \
            portal-robos-backend-1 python3 /tmp/x.py
```

---

## Notas Importantes

1. **Traefik entrypoints:** usar `https`/`http`, NUNCA `websecure`/`web` (padrão Easypanel)
2. **Quiver navSide:** usar JS direto (`SelecionaModuloJQuery`) em vez de `.click()`
3. **Angular `$$hashKey`:** remover antes de qualquer PUT na API
4. **Quiver checkboxes indeterminados (X):** SEMPRE normalizar para S/N antes do PUT — sem isso, a senha não valida
5. **VAULT_KEY:** deve estar no `.env` E no `environment:` do `docker-compose.yml`
6. **Merge de credenciais:** `POST /credenciais/` e `POST /cofre/` fazem merge (não substituem)
7. **Build frontend:** `npm run build && npm start` em produção (não `npm run dev`)
8. **Quiver token API:** `4FEA614E6E3045D59FE2E2A6D3393AC4` (numSerie=3005831, Harper)
9. **ciaCodigos:** SUHAI=4952, BRADESCO=5177, ALLIANZ=5177 — adicionar novas em `CIA_CODIGOS`
10. **Dashboard robos count:** inclui `tenant_id=1` (plataforma) no count de tenants secundários
11. **JWT perms:** sempre incluir `perms[]` no payload do access — frontend filtra UI por isso
12. **apiFetch:** SEMPRE usar `apiFetch` em vez de `fetch` no frontend — auto-refresh transparente
13. **Categoria do cofre:** `categoria_id` (FK) é o novo, `categoria` (string) é legado mantido por compat
14. **Sincronizar Quiver:** chama só Robô 3 com a senha atual do cofre — não troca senha no portal

---

## Roadmap

### ✅ Concluído
- [x] Robô 1: Verificação de credenciais Quiver
- [x] Robô 2: Troca automática de senha SUHAI (descontinuado no fluxo)
- [x] Robô 3: Atualização automática no Quiver via API
- [x] Robô 3: Normalização de checkboxes indeterminados (X → S)
- [x] Cofre Pro com criptografia AES por campo + campos dinâmicos
- [x] Multi-tenant + RBAC v2 (categorias, roles, times customizáveis)
- [x] Auditoria de ações sensíveis (revelar/editar senhas)
- [x] Logs com ID de execução (EX-XXXX) e duração
- [x] Dashboard rico: painel de último relatório + histórico + taxa de sucesso
- [x] Layout grid 3 colunas em todas as páginas
- [x] Agendamentos com picker visual — sem exposição de cron
- [x] Busca por texto no cofre
- [x] Usuários com avatar + redefinir senha inline
- [x] Auto-refresh de JWT (apiFetch)
- [x] Múltiplos destinatários de e-mail no Robô 1
- [x] Perfil "cofre" (cliente acessa só o cofre, redirecionamento via middleware)
- [x] Template Corretora aplicado automaticamente em novo tenant

### 🚧 Próximas evoluções
- [ ] Robô 4 — Relatório de Vendas: download + análise de XLSX do Quiver
- [ ] Robôs para outras seguradoras (Mapfre, Porto, Bradesco, etc)
- [ ] Self-service: cadastro de novos clientes + pagamento (Stripe)
- [ ] Notificações em tempo real (WebSocket)
- [ ] Wizard visual de onboarding para novos tenants
- [ ] Transferência de ownership na UI (endpoint backend já existe)
- [ ] Particionamento mensal do `audit_log` + retenção 90 dias

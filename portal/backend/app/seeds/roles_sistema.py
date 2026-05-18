"""Roles do sistema — aplicadas automaticamente em cada tenant."""

# Catálogo completo de permissões — usado pela UI do builder
PERMISSOES_CATALOGO = {
    "Dashboard": [
        ("dashboard:view", "Ver dashboard"),
    ],
    "Cofre de Senhas": [
        ("cofre:view@*",      "Ver lista do cofre (todas categorias)"),
        ("cofre:reveal@*",    "Revelar senhas (todas categorias)"),
        ("cofre:write@*",     "Criar / editar itens (todas categorias)"),
        ("cofre:delete@*",    "Excluir itens"),
        ("cofre:sync@*",      "Sincronizar com Quiver"),
        ("cofre:history@*",   "Ver histórico de senhas"),
    ],
    "Robôs": [
        ("robos:view",     "Ver lista de robôs"),
        ("robos:execute",  "Disparar robôs manualmente"),
        ("robos:manage",   "Criar / editar / excluir robôs"),
    ],
    "Agendamentos": [
        ("agendamentos:view",   "Ver agendamentos"),
        ("agendamentos:manage", "Criar / editar / excluir agendamentos"),
    ],
    "Credenciais": [
        ("credenciais:view",   "Ver credenciais dos robôs"),
        ("credenciais:manage", "Editar credenciais dos robôs"),
    ],
    "Logs": [
        ("logs:view", "Ver logs de execução"),
    ],
    "Administração": [
        ("usuarios:view",    "Ver usuários"),
        ("usuarios:manage",  "Criar / editar / excluir usuários"),
        ("teams:manage",     "Gerenciar times"),
        ("roles:manage",     "Gerenciar perfis (roles)"),
        ("categorias:manage","Gerenciar categorias do cofre"),
        ("audit:view",       "Ver auditoria"),
        ("tenant:manage",    "Configurações do tenant"),
    ],
}

# Roles padrão do sistema. Cada tenant recebe esses na criação.
ROLES_SISTEMA = [
    {
        "nome":      "Owner",
        "slug":      "owner",
        "descricao": "Dono — acesso total ao tenant.",
        "permissoes": ["*"],
    },
    {
        "nome":      "Admin",
        "slug":      "admin",
        "descricao": "Gerencia tudo no tenant (sem ações destrutivas globais).",
        "permissoes": [
            "dashboard:view",
            "cofre:view@*", "cofre:reveal@*", "cofre:write@*", "cofre:sync@*", "cofre:history@*",
            "robos:view", "robos:execute", "robos:manage",
            "agendamentos:view", "agendamentos:manage",
            "credenciais:view", "credenciais:manage",
            "logs:view",
            "usuarios:view", "usuarios:manage",
            "teams:manage", "roles:manage", "categorias:manage", "audit:view",
        ],
    },
    {
        "nome":      "Operator",
        "slug":      "operator",
        "descricao": "Operação diária — dispara robôs e edita o cofre.",
        "permissoes": [
            "dashboard:view",
            "cofre:view@*", "cofre:reveal@*", "cofre:write@*", "cofre:sync@*",
            "robos:view", "robos:execute",
            "agendamentos:view", "agendamentos:manage",
            "credenciais:view",
            "logs:view",
        ],
    },
    {
        "nome":      "Viewer",
        "slug":      "viewer",
        "descricao": "Somente leitura.",
        "permissoes": [
            "dashboard:view",
            "cofre:view@*",
            "robos:view",
            "agendamentos:view",
            "logs:view",
        ],
    },
    {
        "nome":      "Cofre Básico",
        "slug":      "cofre",
        "descricao": "Apenas o cofre — vê e revela senhas.",
        "permissoes": [
            "cofre:view@*", "cofre:reveal@*",
        ],
    },
]

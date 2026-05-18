"""Template de categorias para o segmento 'Corretora'."""

CATEGORIAS_CORRETORA = [
    {"nome": "Banco",        "slug": "banco",       "icone": "CreditCard",  "cor": "green",   "ordem": 1},
    {"nome": "Auto",         "slug": "auto",        "icone": "Car",         "cor": "red",     "ordem": 2},
    {"nome": "Saúde",        "slug": "saude",       "icone": "HeartPulse",  "cor": "rose",    "ordem": 3},
    {"nome": "Vida",         "slug": "vida",        "icone": "ShieldCheck", "cor": "amber",   "ordem": 4},
    {"nome": "Empresarial",  "slug": "empresarial", "icone": "Building2",   "cor": "purple",  "ordem": 5},
    {"nome": "Sistemas",     "slug": "sistemas",    "icone": "Monitor",     "cor": "blue",    "ordem": 6},
    {"nome": "E-mail",       "slug": "email",       "icone": "Mail",        "cor": "yellow",  "ordem": 7},
    {"nome": "Outro",        "slug": "outro",       "icone": "KeyRound",    "cor": "neutral", "ordem": 99},
]

# Mapeamento das categorias antigas (string em cofre_itens.categoria) → slug novo
LEGADO_PARA_SLUG = {
    "seguradora": "auto",       # default seguradora vai para auto (ajustável)
    "sistema":    "sistemas",
    "cliente":    "empresarial",
    "banco":      "banco",
    "email":      "email",
    "outro":      "outro",
}

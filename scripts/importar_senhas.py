"""
Importa o arquivo SENHAS.xlsx para o Cofre Pro.
Uso: python3 importar_senhas.py [--dry-run]
Requer: pip install openpyxl requests
"""
import sys
import json
import zipfile
import xml.etree.ElementTree as ET
import requests

# ── Config ────────────────────────────────────────────────────────────────────

XLSX_PATH  = "/Users/marcocrepaldi/Downloads/SENHAS.xlsx"
API_URL    = "http://localhost:8000"   # mude para https://bot.omnitheus.com.br/api em produção
EMAIL      = "ti@harperseguros.com.br"
SENHA      = "Trocar@123"
DRY_RUN    = "--dry-run" in sys.argv

# ── Parser ────────────────────────────────────────────────────────────────────

def parse_xlsx(path):
    """Extrai strings e células da primeira planilha."""
    with zipfile.ZipFile(path) as z:
        with z.open("xl/sharedStrings.xml") as f:
            tree = ET.parse(f)
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            strings = [
                "".join(t.text or "" for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
                for si in tree.findall(".//ns:si", ns)
            ]
        with z.open("xl/worksheets/sheet1.xml") as f:
            tree = ET.parse(f)
            ns2 = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            rows = []
            for row in tree.findall(".//ns:row", ns2):
                cells = []
                for c in row.findall("ns:c", ns2):
                    t = c.get("t", "")
                    v = c.find("ns:v", ns2)
                    if v is not None and v.text:
                        cells.append(strings[int(v.text)] if t == "s" else v.text)
                    else:
                        cells.append("")
                rows.append(cells)
    return rows

def get(row, idx):
    return row[idx].strip() if idx < len(row) else ""

# ── Mapeamento manual das entradas conhecidas ─────────────────────────────────
# A planilha tem layout complexo. Extraímos por blocos conhecidos.

def extrair_itens(rows):
    itens = []

    # Processa blocos de colunas conhecidos da planilha
    # Linha 4 em diante tem pares LABEL → VALOR espalhados horizontalmente
    SEGURADORAS_MAPA = [
        # (col_inicio, nome_seguradora, url)
        (2,  "Sul América Corretor",      "https://www.sulamerica.com.br/"),
        (4,  "Bradesco Corretor",         "https://www.corretoronline.com.br/"),
        (6,  "Harper Corretora",          ""),
        (8,  "GNDI Corretor",             "https://gndi.force.com/corretor/s/login/"),
        (10, "MetLife",                   ""),
        (12, "Prevent Senior",            "https://portalweb.preventsenior.com.br/"),
        (14, "Porto Seguro",              ""),
        (16, "Allianz Corretor",          ""),
        (18, "Sompo",                     ""),
        (20, "Omint Atlas",               "https://www.omint.com.br/minha-omint/login/"),
        (24, "CNU - Dataminer",           ""),
        (26, "Manuella - CNU Qualicorp",  ""),
        (28, "CarePlus Corretor",         "https://www8.careplus.com.br/portalrplus/"),
        (30, "IZA Seguradora",            "https://portal.iza.com.vc/"),
    ]

    # Extrai pares label/valor de cada bloco
    for col, nome, url in SEGURADORAS_MAPA:
        campos = []
        for row in rows[3:]:  # pula cabeçalho
            label = get(row, col)
            valor = get(row, col + 1)
            if label and valor and label.upper() not in ("LOGIN", "SENHA", "CÓDIGO", "CNPJ", "E MAIL", "SITE", "LINK", "ACESSO"):
                pass  # ignora cabeçalhos repetidos
            if label and valor:
                label_clean = label.strip().rstrip(":")
                is_senha = any(x in label_clean.upper() for x in ["SENHA", "PASS"])
                campos.append({
                    "label":   label_clean,
                    "valor":   valor,
                    "tipo":    "password" if is_senha else "text",
                    "oculto":  is_senha,
                    "purpose": "PASSWORD" if is_senha else ("LOGIN" if "LOGIN" in label_clean.upper() or "USUÁRIO" in label_clean.upper() else None),
                })
        if campos:
            itens.append({
                "categoria":    "seguradora",
                "nome":         nome,
                "url":          url or None,
                "tags":         [nome.split()[0].lower()],
                "notas":        None,
                "campos":       campos[:8],  # máx 8 campos por item
                "robo_vinculo": None,
            })

    # Entradas adicionais manuais identificadas na planilha
    extras = [
        {
            "categoria": "sistema",
            "nome": "Quiver — MID (Edileia)",
            "url": "",
            "tags": ["quiver", "mid"],
            "notas": "Acesso MID do sistema Quiver",
            "campos": [
                {"label": "E-mail", "valor": "edileia@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "Edi9868@", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "robo_vinculo": None,
        },
        {
            "categoria": "sistema",
            "nome": "Quiver — EB",
            "url": "",
            "tags": ["quiver", "eb"],
            "notas": "Acesso EB do sistema Quiver",
            "campos": [
                {"label": "E-mail", "valor": "edileia@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "Harperseguros2024#", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "robo_vinculo": None,
        },
        {
            "categoria": "sistema",
            "nome": "Quiver — BI",
            "url": "",
            "tags": ["quiver", "bi"],
            "campos": [
                {"label": "Login", "valor": "0ESIK", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "216455", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "notas": None,
            "robo_vinculo": None,
        },
        {
            "categoria": "seguradora",
            "nome": "SUHAI",
            "url": "https://i4pro.suhaiseguradora.com.br/",
            "tags": ["suhai", "automacao"],
            "notas": "Credencial principal para rotação automática (Robô 2)",
            "campos": [
                {"label": "Usuário", "valor": "suhai3148", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "XPgnykY!HYk90Wo3", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "robo_vinculo": 2,
        },
        {
            "categoria": "email",
            "nome": "E-mail Harper — operacional",
            "url": None,
            "tags": ["email", "harper"],
            "campos": [
                {"label": "E-mail", "valor": "operacional@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "Harper2020", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "notas": None,
            "robo_vinculo": None,
        },
        {
            "categoria": "email",
            "nome": "E-mail Harper — benefícios",
            "url": None,
            "tags": ["email", "harper"],
            "campos": [
                {"label": "E-mail", "valor": "harpersegurosbebeficios229@gmail.com", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "harrper2017", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "notas": None,
            "robo_vinculo": None,
        },
        {
            "categoria": "sistema",
            "nome": "Multicalculo Saúde",
            "url": "www.multicalculosaude.com.br",
            "tags": ["multicalculo"],
            "campos": [
                {"label": "Login", "valor": "debora@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "harper2015", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "notas": None,
            "robo_vinculo": None,
        },
        {
            "categoria": "sistema",
            "nome": "Qualicorp Venda Web",
            "url": "https://www.vendadigitalqualicorp.com.br/#/login",
            "tags": ["qualicorp"],
            "campos": [
                {"label": "Login", "valor": "debora@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "hARPER2021", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "notas": None,
            "robo_vinculo": None,
        },
        {
            "categoria": "sistema",
            "nome": "ADM Seg",
            "url": None,
            "tags": ["admseg"],
            "campos": [
                {"label": "Login", "valor": "EDILEIA", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
                {"label": "Senha", "valor": "2017", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            ],
            "notas": None,
            "robo_vinculo": None,
        },
        {
            "categoria": "banco",
            "nome": "Bradesco — Harper Corretora",
            "url": None,
            "tags": ["bradesco", "banco"],
            "campos": [
                {"label": "Agência", "valor": "1432", "tipo": "text", "oculto": False, "purpose": None},
                {"label": "Conta", "valor": "98000-5", "tipo": "text", "oculto": False, "purpose": None},
                {"label": "CNPJ", "valor": "11.940.950/0001-12", "tipo": "text", "oculto": False, "purpose": None},
            ],
            "notas": "Conta corrente Harper Seguros",
            "robo_vinculo": None,
        },
    ]
    itens.extend(extras)
    return itens

# ── Auth ──────────────────────────────────────────────────────────────────────

def login():
    r = requests.post(f"{API_URL}/auth/login",
                      data={"username": EMAIL, "password": SENHA},
                      headers={"Content-Type": "application/x-www-form-urlencoded"})
    r.raise_for_status()
    return r.json()["access_token"]

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"📂 Lendo {XLSX_PATH}...")
    rows = parse_xlsx(XLSX_PATH)
    itens = extrair_itens(rows)

    print(f"📋 {len(itens)} itens para importar:")
    for i in itens:
        print(f"   [{i['categoria']:12}] {i['nome']} ({len(i['campos'])} campos)")

    if DRY_RUN:
        print("\n✅ Dry-run: nenhum dado enviado.")
        print("\nJSON gerado:")
        print(json.dumps({"itens": itens}, ensure_ascii=False, indent=2)[:3000], "...")
        return

    print(f"\n🔑 Autenticando em {API_URL}...")
    token = login()

    print("📤 Enviando para a API...")
    r = requests.post(
        f"{API_URL}/cofre-itens/importar",
        json={"itens": itens},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    r.raise_for_status()
    result = r.json()
    print(f"\n✅ {result['criados']} itens criados com sucesso!")
    if result["erros"]:
        print(f"⚠️  {len(result['erros'])} erros:")
        for e in result["erros"]:
            print(f"   - {e['nome']}: {e['erro']}")

if __name__ == "__main__":
    main()

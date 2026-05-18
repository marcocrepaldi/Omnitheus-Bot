"""
Importa credenciais da planilha 'Dados Harper.xlsx' para o Cofre Pro.

A planilha tem layout livre (não é uma tabela). Cada seção começa com o nome
da seguradora/sistema em uma linha, e abaixo vêm os campos Login/Senha/Código/etc.

Estratégia: scanear linha por linha, identificar headers de seção e agrupar
os campos seguintes até o próximo header.

Uso: python3 importar_dados_harper.py [--dry-run]
"""
import sys
import re
import json
import zipfile
import xml.etree.ElementTree as ET
import requests

XLSX_PATH = "/Users/marcocrepaldi/Downloads/Dados Harper.xlsx"
API_URL   = "http://localhost:8000"
EMAIL     = "ti@harperseguros.com.br"
SENHA     = "Trocar@123"
DRY_RUN   = "--dry-run" in sys.argv


# ── Parser XLSX ────────────────────────────────────────────────────────────────

def parse_xlsx(path):
    with zipfile.ZipFile(path) as z:
        with z.open("xl/sharedStrings.xml") as f:
            tree = ET.parse(f)
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            strings = ["".join(t.text or "" for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
                       for si in tree.findall(".//ns:si", ns)]
        # A aba "Senhas" é o sheet1.xml (detectado por inspeção)
        with z.open("xl/worksheets/sheet1.xml") as f:
            tree = ET.parse(f)
            rows = []
            for row in tree.findall(".//ns:row", ns):
                cells = []
                for c in row.findall("ns:c", ns):
                    t = c.get("t", "")
                    v = c.find("ns:v", ns)
                    if v is not None and v.text:
                        cells.append((strings[int(v.text)] if t == "s" else v.text).strip())
                    else:
                        cells.append("")
                rows.append(cells)
    return rows


# ── Items pré-mapeados (curadoria manual baseada na planilha) ─────────────────

ITENS = [
    # ── Seguradoras ───────────────────────────────────────────────────────────
    {
        "categoria": "seguradora", "nome": "Porto Seguro",
        "url": "https://www.portoseguro.com.br",
        "tags": ["porto", "auto"],
        "campos": [
            {"label": "Código", "valor": "1461060", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "4qrht3ml", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Susep", "valor": "67342J", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Sucursal Pacaembu (11) 3366-7000 · Gerente João Carlos 99993-3590",
    },
    {
        "categoria": "seguradora", "nome": "Porto — Campanha Conquistadores",
        "url": "https://www.campanhaconquistadores.com.br/login",
        "tags": ["porto", "campanha"],
        "campos": [
            {"label": "Login", "valor": "67342J", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper23", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "seguradora", "nome": "Azul Seguros — Novo",
        "url": "http://www.azulseguros.com.br",
        "tags": ["azul", "auto"],
        "campos": [
            {"label": "Login", "valor": "700159", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "DEBORA15", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Login antigo: 830025 / Harper@123 — Sucursal Santo Amaro (11) 5525-5900",
    },
    {
        "categoria": "seguradora", "nome": "Itaú Seguros",
        "url": None,
        "tags": ["itau"],
        "campos": [
            {"label": "Login", "valor": "884911111", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "debora16", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Central Itaú (11) 3003-6006 · Help Desk (11) 3003-1777",
    },
    {
        "categoria": "seguradora", "nome": "Allianz Seguros",
        "url": "http://www.allianz.com.br",
        "tags": ["allianz"],
        "campos": [
            {"label": "Login", "valor": "BA110340", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "2025H@rper.", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Susep", "valor": "100643721/Nova 202031958", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Filial Santo Amaro (11) 5098-3850 · Letícia Pitkowski 5098-3863",
    },
    {
        "categoria": "seguradora", "nome": "Liberty Seguros",
        "url": "http://www.libertyseguros.com.br",
        "tags": ["liberty"],
        "campos": [
            {"label": "Usuário", "valor": "lastnebz", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "debora16", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Código LS", "valor": "99024841", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "Susep", "valor": "10657743", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Daniela (11) 97951-0600 · TI: 100657743/190108",
    },
    {
        "categoria": "seguradora", "nome": "HDI Seguros",
        "url": "http://www.hdi.com.br",
        "tags": ["hdi"],
        "campos": [
            {"label": "Usuário", "valor": "30048210870", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "harper01", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Help Desk 0800-770-1066 · Cód vistoria 100673421",
    },
    {
        "categoria": "seguradora", "nome": "Sul América — Auto",
        "url": "http://www.sulamerica.com.br",
        "tags": ["sulamerica", "auto"],
        "campos": [
            {"label": "Código NAC", "valor": "98864", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "46932", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Cálculo Auto", "valor": "715124", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "SIMAS", "valor": "21QIE", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Emissão (11) 3003-0837 · 0800 727 5555",
    },
    {
        "categoria": "seguradora", "nome": "Chubb Seguros",
        "url": "http://www.chubb.com.br",
        "tags": ["chubb"],
        "campos": [
            {"label": "Código Harper", "valor": "951349", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "Login", "valor": "harper", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "CHUBB02", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Help Desk (11) 3003-4364 · Enely Jurado cadastro@m2seguros.com.br",
    },
    {
        "categoria": "seguradora", "nome": "Sompo Seguros — Site",
        "url": "http://www.maritima.com.br",
        "tags": ["sompo", "maritima"],
        "campos": [
            {"label": "Código", "valor": "0121653", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Debora123", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "URA: senha 534420 · Filial Santo Amaro (11) 5188-2400",
    },
    {
        "categoria": "seguradora", "nome": "Mapfre",
        "url": "http://www.mapfre.com.br",
        "tags": ["mapfre"],
        "campos": [
            {"label": "Código", "valor": "87872", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper19#", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Susep", "valor": "00000100673421", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Help Desk 4002-9000 · Flavia foluz@mapfre.com.br",
    },
    {
        "categoria": "seguradora", "nome": "Bradesco Seguros",
        "url": None,
        "tags": ["bradesco"],
        "campos": [
            {"label": "Usuário", "valor": "11940950000112", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Sucursal", "valor": "966 (antiga 964 - Ipiranga)", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "CPD", "valor": "412253", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Central emissão (11) 4004-2711 · Vida (11) 3265-5433 · Andrea Godoy",
    },
    {
        "categoria": "seguradora", "nome": "Yasuda",
        "url": "http://www.yasuda.com.br",
        "tags": ["yasuda"],
        "campos": [
            {"label": "Login", "valor": "harp02", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "harper45", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Asteca Corretora · Eduardo Mathias 3156-6500",
    },
    {
        "categoria": "seguradora", "nome": "Golden Cross",
        "url": None,
        "tags": ["golden"],
        "campos": [
            {"label": "Login", "valor": "207500002", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "69496967", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "seguradora", "nome": "Zurich",
        "url": "http://www.zurichminasbrasil.com.br",
        "tags": ["zurich"],
        "campos": [
            {"label": "Usuário", "valor": "549540", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "harper01%", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Assistência 24h 0800-2854141 · Anderson Costa anderson.costa@br.zurich.com",
    },
    {
        "categoria": "seguradora", "nome": "Alfa Seguradora",
        "url": "http://www.alfaseguradora.com.br",
        "tags": ["alfa"],
        "campos": [
            {"label": "Login", "valor": "HARPER", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "26364656", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Gerente Plataforma: Manoel (11) 97543-0640",
    },
    {
        "categoria": "seguradora", "nome": "Tokio Marine — Debora",
        "url": "http://www.tokiomarine.com.br",
        "tags": ["tokio"],
        "campos": [
            {"label": "Código", "valor": "328.515.998-79", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "@Harper123", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Gerente Cintia 4568-9300",
    },
    {
        "categoria": "seguradora", "nome": "Tokio Marine — 408",
        "url": "http://www.tokiomarine.com.br",
        "tags": ["tokio"],
        "campos": [
            {"label": "Código", "valor": "408.307.338-17", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper2026@", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "seguradora", "nome": "Cardiff Seguros",
        "url": "http://www.labourseguros.com.br",
        "tags": ["cardiff"],
        "campos": [
            {"label": "Usuário", "valor": "Harperadm", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper123", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Eliana Cerqueira · Sucursal (11) 3253-8644",
    },
    {
        "categoria": "seguradora", "nome": "Sura",
        "url": None,
        "tags": ["sura"],
        "campos": [
            {"label": "Login", "valor": "Harper", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "DEBORA01", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Tamiris PRPA (11) 96392-6509",
    },
    {
        "categoria": "seguradora", "nome": "Seguros Unimed",
        "url": None,
        "tags": ["unimed", "saude"],
        "campos": [
            {"label": "Login", "valor": "15809", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper14", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "0800-770-3611 · evida@segurosunimed.com.br · Diego Ribeiro",
    },
    {
        "categoria": "seguradora", "nome": "Ituran",
        "url": "http://www.ituran.com.br",
        "tags": ["ituran", "rastreador"],
        "campos": [
            {"label": "Login", "valor": "harper.corretora", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "harper01", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Tel (11) 3616-9090",
    },
    {
        "categoria": "seguradora", "nome": "Affinity Corretora",
        "url": "https://affinitycorretora.com.br/",
        "tags": ["affinity"],
        "campos": [
            {"label": "Login", "valor": "debora@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper2021", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Adriana Ciarini (11) 95977-6000",
    },

    # ── Sistemas ──────────────────────────────────────────────────────────────
    {
        "categoria": "sistema", "nome": "Locaweb",
        "url": None,
        "tags": ["locaweb", "hospedagem"],
        "campos": [
            {"label": "Usuário", "valor": "Harper", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper2019best9", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "NET — Serviço",
        "url": None,
        "tags": ["net", "internet"],
        "campos": [
            {"label": "Login", "valor": "12285982000194", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper19", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Cliente", "valor": "10621", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "NET — Site de Contratos",
        "url": None,
        "tags": ["net", "internet"],
        "campos": [
            {"label": "Login", "valor": "harperseguros", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper2019", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "Cliicksign",
        "url": None,
        "tags": ["clicksign", "assinatura"],
        "campos": [
            {"label": "Login", "valor": "harper@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "#Quiver23", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "Sodexo — Harper",
        "url": None,
        "tags": ["sodexo"],
        "campos": [
            {"label": "Login", "valor": "debora@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "harper 12", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": "Tel (11) 4003-7633",
    },
    {
        "categoria": "sistema", "nome": "Sodexo — Ultraffinity",
        "url": None,
        "tags": ["sodexo", "ultraffinity"],
        "campos": [
            {"label": "Login", "valor": "harper@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "harper 10", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "Planos Online — Beneficios",
        "url": "http://www.guiadecorretores.com.br",
        "tags": ["planos-online"],
        "campos": [
            {"label": "Login", "valor": "beneficios@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "12345", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "Planos Online — Comissão",
        "url": "http://www.guiadecorretores.com.br",
        "tags": ["planos-online", "comissao"],
        "campos": [
            {"label": "Login", "valor": "15262", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "planos2012", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "Calcule (Unimed)",
        "url": None,
        "tags": ["calcule", "unimed"],
        "campos": [
            {"label": "Login", "valor": "15809", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "94829390", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },

    # ── Wi-Fi ─────────────────────────────────────────────────────────────────
    {
        "categoria": "sistema", "nome": "Rede Wi-Fi — Harper 2G",
        "url": None,
        "tags": ["wifi"],
        "campos": [
            {"label": "SSID", "valor": "HARPER_2G", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "123#HARPER", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "sistema", "nome": "Rede Wi-Fi — Harper 5G",
        "url": None,
        "tags": ["wifi"],
        "campos": [
            {"label": "SSID", "valor": "HARPER_5G", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "123#HARPER", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },

    # ── Telefonia TIM ─────────────────────────────────────────────────────────
    {
        "categoria": "sistema", "nome": "TIM — Harper Comercial",
        "url": "https://meutim.tim.com.br/novo/login",
        "tags": ["tim", "telefone"],
        "campos": [
            {"label": "Login", "valor": "11938006783", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "5573", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Tel Comercial", "valor": "(11) 93800-6183", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Acesso TIM senha: 1550",
    },
    {
        "categoria": "sistema", "nome": "TIM — Harper Benefícios",
        "url": "https://meutim.tim.com.br/novo/login",
        "tags": ["tim", "telefone"],
        "campos": [
            {"label": "Login", "valor": "11950014923", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "2324", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
            {"label": "Tel Benefícios", "valor": "(11) 95001-4923", "tipo": "text", "oculto": False, "purpose": None},
        ],
        "notas": "Acesso TIM senha: 4655",
    },

    # ── Compras / Outros ──────────────────────────────────────────────────────
    {
        "categoria": "outro", "nome": "Kabum",
        "url": "https://www.kabum.com.br",
        "tags": ["kabum", "compras"],
        "campos": [
            {"label": "Login", "valor": "harper@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper123@", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "outro", "nome": "Kalunga",
        "url": None,
        "tags": ["kalunga", "compras"],
        "campos": [
            {"label": "Login", "valor": "119409500001-12", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper123@", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },
    {
        "categoria": "outro", "nome": "Magazine",
        "url": None,
        "tags": ["magazine", "compras"],
        "campos": [
            {"label": "Login", "valor": "119409500001-12", "tipo": "text", "oculto": False, "purpose": "LOGIN"},
            {"label": "Senha", "valor": "Harper123@", "tipo": "password", "oculto": True, "purpose": "PASSWORD"},
        ],
        "notas": None,
    },

    # ── Dados institucionais Harper ───────────────────────────────────────────
    {
        "categoria": "outro", "nome": "Harper Corretora — Dados Institucionais",
        "url": None,
        "tags": ["harper", "institucional"],
        "campos": [
            {"label": "SUSEP", "valor": "100673421 / Nova 202031958", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "CNPJ", "valor": "11.940.950/0001-12", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "Inscrição Municipal", "valor": "4.070.615.0", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "Endereço", "valor": "Rua Pais Leme 215, Conj 1008/1009 - Pinheiros - CEP 05424-010", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "Telefone", "valor": "(11) 2639-4655", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "Fax", "valor": "(11) 2638-8076", "tipo": "text", "oculto": False, "purpose": None},
            {"label": "E-mail", "valor": "harper@harperseguros.com.br", "tipo": "email", "oculto": False, "purpose": None},
        ],
        "notas": "Inscrição Estadual: Isento",
    },
]


# ── Auth ──────────────────────────────────────────────────────────────────────

def login():
    r = requests.post(f"{API_URL}/auth/login",
                      data={"username": EMAIL, "password": SENHA},
                      headers={"Content-Type": "application/x-www-form-urlencoded"})
    r.raise_for_status()
    return r.json()["access_token"]


def listar_existentes(token):
    """Retorna set de nomes já cadastrados (para evitar duplicatas)."""
    r = requests.get(f"{API_URL}/cofre-itens/",
                     headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return {item["nome"].lower() for item in r.json()}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"📋 {len(ITENS)} itens preparados para importação:\n")
    for i in ITENS:
        print(f"   [{i['categoria']:12}] {i['nome']:42} ({len(i['campos'])} campos)")

    if DRY_RUN:
        print("\n✅ Dry-run: nenhum dado enviado.")
        return

    print(f"\n🔑 Autenticando em {API_URL}...")
    token = login()

    print("📥 Verificando duplicatas...")
    existentes = listar_existentes(token)
    novos = [i for i in ITENS if i["nome"].lower() not in existentes]
    duplicados = [i["nome"] for i in ITENS if i["nome"].lower() in existentes]

    if duplicados:
        print(f"⏭  Pulando {len(duplicados)} já existentes: {', '.join(duplicados)}")

    if not novos:
        print("Nada novo para importar.")
        return

    print(f"\n📤 Enviando {len(novos)} novos itens...")
    r = requests.post(
        f"{API_URL}/cofre-itens/importar",
        json={"itens": novos},
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

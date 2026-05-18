"""
Importa a aba 'Senhas' do arquivo 'Dados Harper.xlsx' — curadoria manual.

Cada item foi extraído manualmente das colunas A e C da aba Senhas (sheet5.xml).
"""
import sys
import requests

API_URL = "http://localhost:8000"
EMAIL   = "ti@harperseguros.com.br"
SENHA   = "Trocar@123"
DRY_RUN = "--dry-run" in sys.argv

# Helper para criar item rapidamente
def item(nome, login, senha, *, cat="seguradora", url=None, extra=None, notas=None, tags=None, robo=None):
    campos = [
        {"label": "Login", "valor": login, "tipo": "email" if "@" in str(login) else "text",
         "oculto": False, "purpose": "LOGIN"},
        {"label": "Senha", "valor": senha, "tipo": "password",
         "oculto": True, "purpose": "PASSWORD"},
    ]
    if extra:
        for label, val in extra.items():
            campos.append({"label": label, "valor": val, "tipo": "text", "oculto": False, "purpose": None})
    return {
        "categoria": cat,
        "nome": nome,
        "url": url,
        "tags": tags or [nome.split()[0].lower()],
        "notas": notas,
        "campos": campos,
        "robo_vinculo": robo,
    }


ITENS = [
    # ── Coluna A da aba Senhas ────────────────────────────────────────────────
    item("Allianz Seguros", "BA110340", "@123Harper$",
         tags=["allianz"]),

    item("Darwim Seguros", "harper@harperseguros.com.br", "Harper@01",
         tags=["darwim"]),

    item("HDI Seguros", "30048210870", "harper01",
         url="https://www.hdi.com.br/hdidigital/",
         tags=["hdi"]),

    item("Chubb Seguros", "debora@harperseguros.com.br", "123@Harper",
         extra={"Código": "Harper"},
         tags=["chubb"]),

    item("Mapfre", "300.482.108-70", "@123Harper",
         url="https://negocios.mapfre.com.br/acesso",
         extra={"Susep": "202031958", "Código": "87872"},
         tags=["mapfre"]),

    item("Zurich", "549540", "Harper18@",
         url="https://espacoparceiros.zurich.com.br/Home",
         tags=["zurich"]),

    item("Tokio Marine Seguradora", "328.515.998-79", "Harper@2026",
         url="https://portalparceiros.tokiomarine.com.br/",
         tags=["tokio"]),

    item("Sura", "Harper", "@2023Corretora",
         url="https://externo.segurossura.com.br/plccotaweb/pages/segundaViaRD.jsf",
         tags=["sura"]),

    item("Suhai Cotador — Débora", "suhai3148", "2520@Harper",
         tags=["suhai", "cotador"]),

    item("Suhai Cotador — Jeni", "40830733817", "Jeni@Harper21",
         tags=["suhai", "cotador", "jeniffer"]),

    item("Amil", "068616", "Harper2025$",
         tags=["amil"]),

    item("Potencial Seguros", "harper@harperseguros.com.br", "Harper@123",
         url="https://parceiro.pottencial.com.br/inicio",
         extra={"Código": "1272"},
         tags=["potencial"]),

    item("Mongeral Seguros", "colaborativa@harperseguros.com.br", "harper01",
         extra={"Código": "1272"},
         tags=["mongeral"]),

    item("Mitsui Seguros", "colaborativa@harperseguros.com.br", "Harper20@",
         url="https://www4.msig.com.br/Kitonline/Inicio/PaginaInicial/PaginaIni",
         extra={"Código": "0673421-adm"},
         tags=["mitsui"]),

    item("AIG — Débora", "debora@harperseguros.com.br", "@123Harper",
         url="https://www-450.aig.com.br/portal/",
         tags=["aig"]),

    item("AIG — Jeniffer", "jeniffer@harperseguros.com.br", "Jeni@123Harper",
         url="https://www-450.aig.com.br/portal/login",
         tags=["aig", "jeniffer"]),

    item("MetLife", "202031958", "Harper#123",
         tags=["metlife"]),

    item("Excelsior — Garantia", "debora@harperseguros.com.br", "20harper",
         url="https://www.excelsiorseguros.com.br/excelsiornetnoticiasin",
         extra={"Senha Portal Garantia": "Harper@123"},
         tags=["excelsior"]),

    item("Excelsior — WEBKIT", "Harper.cor", "123Harpe",
         tags=["excelsior", "webkit"]),

    item("ADT Monitoramento", "operacional@harperseguros.com.br", "H@rper2020",
         url="https://portalcliente.adt.com.br/Dashboard/Index",
         cat="sistema",
         tags=["adt"]),

    item("Berkley Seguros", "202031958", "@Harper1237",
         url="https://www.berkley.com.br/institucional/pages/corretor",
         tags=["berkley"]),

    item("Berkley — Acesso Individual", "jeniffer@harperseguros.com.br", "@Harper1237",
         url="https://latam-brazil.wrberkley.auth0.com/u/login",
         tags=["berkley", "jeniffer"]),

    item("Icatu", "11940950000112", "1234",
         url="https://www.icatuseguros.com.br/casadocorretor/login",
         extra={"Site": "www.theocorretora.com.br"},
         tags=["icatu"]),

    item("Azul Seguros", "Harper.cor", "@Seguro26",
         tags=["azul"]),

    item("Swiss RE", "debora@harperseguros.com.br", "H@per.24*24$=o",
         url="https://corsobr.swissre.com/corsobr/",
         tags=["swiss-re"]),

    item("Swiss RE — Jeniffer", "jeniffer@harperseguros.com.br", "xR9p@uu4Y#dFYUj",
         url="https://corsobr.swissre.com/corsobr/",
         tags=["swiss-re", "jeniffer"]),

    item("Vivo Móvel", "11.940.950/0001-12", "800342",
         cat="sistema",
         tags=["vivo", "telefone"]),

    item("Vivo Internet", "11.940.950/0001-12", "895621",
         cat="sistema",
         tags=["vivo", "internet"]),

    item("Amil — adicional", "068616", "Harper22@",
         tags=["amil"]),

    item("Fator", "300.482.108-70", "@Vendas2026#",
         url="https://canaldigital.fatorconnect.com.br/dashboard",
         tags=["fator"]),

    item("Newe Seguros", "harper@harperseguros.com.br", "123Harper@2025",
         url="https://portalriscosfinanceiros.neweseguros.com/login",
         tags=["newe"]),

    item("LOOVI — Guilherme", "guilherme@harperseguros.com.br", "Loovi2024**",
         url="https://escritoriovirtual.loovi.com.br/",
         tags=["loovi"]),

    item("LOOVI — Jeniffer", "jeniffer@harperseguros.com.br", "123HarperJeni@",
         url="https://escritoriovirtual.loovi.com.br/",
         tags=["loovi", "jeniffer"]),

    item("Excelsior Empresariais", "00274245", "123@Harper2024",
         url="https://cotador.sistemaexcelsior.com.br",
         tags=["excelsior", "empresarial"]),

    # ── Coluna C da aba Senhas ────────────────────────────────────────────────
    item("Liberty Seguros / Yelum", "30048210870", "@1234Harper$$",
         url="https://novomeuespacocorretor.yelumseguros.com.br/home",
         extra={"Código Liberty": "99024841"},
         tags=["liberty", "yelum"]),

    item("Mapfre Seguros — Cod Interno", "118136", "2025#Harper",
         extra={"Susep": "202031958"},
         tags=["mapfre"]),

    item("Sul América", "98864", "46932",
         tags=["sulamerica"]),

    item("Sompo Seguros", "0121653", "debora",
         tags=["sompo"]),

    item("Bradesco Seguros", "11940950000112", "Harper$2026$",
         url="https://wwwn.bradescoseguros.com.br/pnegocios",
         extra={"Sucursal": "966", "CPF Alternativo": "300.482.108-70"},
         tags=["bradesco"]),

    item("Bradesco — Vistoria Inspectos", "harper@harperseguros.com.br", "@Harper123",
         url="http://inspectos.com",
         cat="sistema",
         tags=["bradesco", "vistoria"]),

    item("Bradesco — Vistoria Autovist", "harper@harperseguros.com.br", "Harper22@",
         url="https://autovist.com.br/acesso/parceiros/login/",
         cat="sistema",
         tags=["bradesco", "vistoria"]),

    item("Alfa", "HARPER", "Harper123",
         tags=["alfa"]),

    item("Suhai Apólice", "suhai3148", "Harper22@",
         url="https://i4pro.suhaiseguradora.com.br/Default.aspx",
         tags=["suhai", "apolice"],
         robo=2,
         notas="Vinculado ao Robô 2 para rotação automática"),

    item("Suhai Cotador — Giulia", "49126150808", "Harper@2025",
         tags=["suhai", "cotador", "giulia"]),

    item("AXA Seguros", "harper@harperseguros.com.br", "Harper@123456*",
         url="https://e-solutions.axa.com.br/#!/home",
         tags=["axa"]),

    item("AXA Garantia", "danubia@harperseguros.com.br", "Seguros26#",
         url="http://garantia.axa.com.br",
         tags=["axa", "garantia"]),

    item("Ituran", "harper.corretora", "@Harper123",
         url="https://parceiros.ituran.com.br/#/pages/alertas",
         cat="sistema",
         tags=["ituran"]),

    item("Akad", "300.482.108-70", "Harper$2026",
         url="https://digital.akadseguros.com.br/login",
         tags=["akad"]),

    item("Essor", "11940950000112", "@Seguro$26vendas%",
         url="http://portal.essor.com.br/entrada/",
         tags=["essor"]),

    item("Allianz — Net Corretor", "BA110340", "@123Harper$",
         url="https://www.allianznet.com.br/ngx-epac/private/home",
         tags=["allianz"]),

    item("EZZE Seguros", "HARPER", "Harper2022",
         url="http://www.ezzeseguros.com.br",
         tags=["ezze"]),

    item("Junto Seguros", "harper_cor", "Garantia2020!",
         url="https://plataforma.juntoseguros.com/login",
         extra={"Código de Acesso": "442709"},
         tags=["junto"]),

    item("VR — Nota Fiscal", "debora@harperseguros.com.br", "GqAYskjY6Gzbuw",
         url="https://vendas.vr.com.br/portal/home-logado.html",
         cat="sistema",
         tags=["vr"]),

    item("Simulador Online", "HARPER", "@123Harper",
         url="https://app.simuladoronline.com/usuarios/consultar",
         cat="sistema",
         tags=["simulador"]),

    item("BMG Safe2Go", "debora@harperseguros.com.br", "123H@rper",
         url="https://bmg.safe2go.com.br/Contas/Login",
         cat="sistema",
         tags=["bmg"]),

    item("Cotador Zurich Engenharia", "jeniffer@harperseguros.com.br", "Zurich@15",
         cat="sistema",
         tags=["zurich", "engenharia", "jeniffer"]),

    item("Unimed Central Nacional", "corcnu885", "26394655",
         url="https://www.centralnacionalunimed.com.br/inovacom",
         tags=["unimed"]),

    item("Kovr", "202031958", "Harper2025$",
         url="https://portal.kovr.com.br/Portal_Invest/Account/Index",
         cat="sistema",
         tags=["kovr"]),

    item("Excelsior — Garantia (Propostas)", "harper@harperseguros.com.br", "Harper@123",
         url="https://garantia.sistemaexcelsior.com.br/propostas",
         tags=["excelsior", "garantia"]),

    item("ClickSign", "harper@harperseguros.com.br", "Seg2024#",
         url="https://app.clicksign.com/signin",
         cat="sistema",
         tags=["clicksign"]),

    item("Sombrero — Garantias", "harper@harperseguros.com.br", "haRper@2025",
         url="https://portalgarantias.sombreroseguros.com.br/login",
         tags=["sombrero", "garantia"]),

    item("AVLA Garantia", "harper@harperseguros.com.br", "Harper@2024",
         tags=["avla", "garantia"]),

    item("AVLA Empresarial / RE", "harper@harperseguros.com.br", "Harper@2024",
         url="https://property-br.avla.com/login",
         tags=["avla", "empresarial"]),

    item("Planos Online", "operacional@harperseguros.com.br", "123456",
         cat="sistema",
         tags=["planos-online"]),

    item("Planos Online — Comissões", "15262", "planos2012",
         cat="sistema",
         tags=["planos-online", "comissao"]),
]


def login():
    r = requests.post(f"{API_URL}/auth/login",
                      data={"username": EMAIL, "password": SENHA},
                      headers={"Content-Type": "application/x-www-form-urlencoded"})
    r.raise_for_status()
    return r.json()["access_token"]


def listar_existentes(token):
    r = requests.get(f"{API_URL}/cofre-itens/",
                     headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return {it["nome"].lower() for it in r.json()}


def main():
    print(f"📋 {len(ITENS)} itens preparados da aba 'Senhas':\n")
    for i in ITENS:
        rb = " ⚡ROBÔ" if i.get("robo_vinculo") else ""
        print(f"   [{i['categoria']:11}] {i['nome'][:45]:45}  ({len(i['campos'])} campos){rb}")

    if DRY_RUN:
        print("\n✅ Dry-run.")
        return

    print(f"\n🔑 Autenticando...")
    token = login()
    existentes = listar_existentes(token)

    novos = [i for i in ITENS if i["nome"].lower() not in existentes]
    pulados = [i["nome"] for i in ITENS if i["nome"].lower() in existentes]

    if pulados:
        print(f"⏭  Pulando {len(pulados)} já existentes: {', '.join(pulados)}")

    if not novos:
        print("Nada novo.")
        return

    print(f"\n📤 Enviando {len(novos)} itens...")
    r = requests.post(
        f"{API_URL}/cofre-itens/importar",
        json={"itens": novos},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    r.raise_for_status()
    result = r.json()
    print(f"\n✅ {result['criados']} criados!")
    if result["erros"]:
        for e in result["erros"]:
            print(f"   ⚠ {e['nome']}: {e['erro']}")


if __name__ == "__main__":
    main()

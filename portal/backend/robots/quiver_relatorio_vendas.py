"""
Robô 4 — Quiver: Relatório de Vendas (Orçamento por Situação)

Fluxo:
  1. Login no Quiver (com reCAPTCHA v2 via 2captcha)
  2. Navega até Relatórios > Orçamento por situação
  3. Seleciona Nível=CORRETORA, Divisão (env QUIVER_DIVISAO), período=ontem
  4. Executa e baixa o arquivo CSV
  5. Parseia o CSV e faz upsert na tabela relatorio_vendas

Credenciais (env vars injetadas pelo scheduler via credenciais_tenant):
  HARPER_URL, HARPER_USER, HARPER_PASS, TWOCAPTCHA_KEY
  QUIVER_DIVISAO  — padrão: "HARPER CORRETORA DE SEGUROS LTDA"
  TENANT_ID       — injetado automaticamente pelo scheduler
  DATABASE_URL    — global (não precisa estar em credenciais_tenant)

Agendamento sugerido: 0 6 * * * (todo dia 06:00)
"""
import asyncio
import concurrent.futures
import csv
import io
import logging
import os
from datetime import date, datetime, timedelta

from playwright.async_api import async_playwright
from twocaptcha import TwoCaptcha

RECAPTCHA_KEY = "6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI"

logger = logging.getLogger("robot.quiver_relatorio")
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter(
        "%(asctime)s [robot.quiver_relatorio] %(levelname)s: %(message)s"
    ))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)


# ── Mapeamento CSV → campo DB ─────────────────────────────────────────────────

HEADER_MAP = {
    "Nível":                     "nivel",
    "Inicio de vigência":        "inicio_vigencia",
    "Divisão":                   "divisao",
    "Cliente":                   "cliente",
    "CPF/CNPJ do cliente":       "cpf_cnpj",
    "Calculo":                   "calculo",
    "E-mail do cliente":         "email_cliente",
    "Item":                      "item",
    "Situação":                  "situacao",
    "Grupo de produção":         "grupo_producao",
    "Ramo":                      "ramo",
    "Tipo de orçamento":         "tipo_orcamento",
    "Seguradora":                "seguradora",
    "Prêmio fechado":            "premio_fechado",
    "Comissão fechado":          "comissao_fechado",
    "% comissão":                "pct_comissao",
    "Premio líquido do cliente": "premio_liquido",
    "Data de transmissão":       "data_transmissao",
    "Data de efetivação":        "data_efetivacao",
    "TipoCotacao":               "tipo_cotacao",
    "Tipo de pessoa":            "tipo_pessoa",
    "Usuário":                   "usuario",
    "CORRETORA":                 "corretora",
    "PRODUTOR INTERNO":          "produtor_interno",
    "Usuário de Efetivação":     "usuario_efetivacao",
    "Proposta Cia":              "proposta_cia",
    "Status Painel de Negócios": "status_painel",
    "Tipo de Uso":               "tipo_uso",
    "Data/hora de inclusão":     "data_hora_inclusao",
}

_NUMERIC = {"premio_fechado", "comissao_fechado", "pct_comissao", "premio_liquido"}
_DATE    = {"inicio_vigencia", "data_transmissao", "data_efetivacao"}
_DTIME   = {"data_hora_inclusao"}


# ── Helpers de parsing ────────────────────────────────────────────────────────

def _parse_date(s: str):
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except (ValueError, AttributeError):
            pass
    return None


def _parse_datetime(s: str):
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except (ValueError, AttributeError):
            pass
    return None


def _parse_float(s: str):
    try:
        return float(s.strip().replace(".", "").replace(",", "."))
    except (ValueError, AttributeError):
        return None


def _parse_csv(content: bytes, tenant_id: int) -> list:
    for enc in ("utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = content.decode("latin-1", errors="replace")

    reader = csv.reader(io.StringIO(text), delimiter=";")
    rows   = list(reader)
    if len(rows) < 2:
        return []

    # Header normalizado (strip)
    header  = [h.strip() for h in rows[0]]
    col_idx = {h: i for i, h in enumerate(header)}

    # Índices dos campos core (para saber quais vão para dados_seguradoras)
    core_idx = {col_idx[h] for h in HEADER_MAP if h in col_idx}

    records = []
    for row in rows[1:]:
        if not row or not any(v.strip() for v in row):
            continue

        rec = {"tenant_id": tenant_id}

        for csv_h, field in HEADER_MAP.items():
            idx = col_idx.get(csv_h)
            if idx is None:
                continue
            raw = row[idx].strip() if idx < len(row) else ""
            if field in _NUMERIC:
                rec[field] = _parse_float(raw) if raw else None
            elif field in _DATE:
                rec[field] = _parse_date(raw)
            elif field in _DTIME:
                rec[field] = _parse_datetime(raw)
            else:
                rec[field] = raw or None

        # Colunas de seguradoras → JSON (todas além das core)
        extras = {
            header[i]: row[i].strip()
            for i in range(len(row))
            if i not in core_idx and i < len(header) and header[i]
        }
        rec["dados_seguradoras"] = extras or None

        calculo = (rec.get("calculo") or "").strip()
        if not calculo:
            continue
        if rec.get("seguradora") is None:
            rec["seguradora"] = ""

        records.append(rec)

    logger.info(f"CSV parseado: {len(records)} registros")
    return records


# ── Upsert no banco ───────────────────────────────────────────────────────────

def _upsert_records(records: list, db_url: str) -> int:
    if not records:
        return 0

    from sqlalchemy import create_engine, MetaData
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    engine = create_engine(db_url)
    meta   = MetaData()
    meta.reflect(bind=engine, only=["relatorio_vendas"])
    table  = meta.tables.get("relatorio_vendas")
    if table is None:
        engine.dispose()
        raise RuntimeError(
            "Tabela relatorio_vendas não encontrada. "
            "Suba o servidor uma vez para criar as tabelas automaticamente."
        )

    skip        = {"id", "importado_em", "tenant_id", "calculo", "seguradora"}
    update_cols = [c.name for c in table.c if c.name not in skip]

    count = 0
    with engine.begin() as conn:
        for rec in records:
            vals = {k: v for k, v in rec.items() if k in table.c}
            stmt = pg_insert(table).values(**vals)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_rv_calculo_seg",
                set_={c: stmt.excluded[c] for c in update_cols if c in table.c},
            )
            conn.execute(stmt)
            count += 1

    engine.dispose()
    return count


# ── Captcha ───────────────────────────────────────────────────────────────────

def _solve_captcha_sync(captcha_key: str, url: str, sitekey: str) -> str:
    return TwoCaptcha(captcha_key).recaptcha(sitekey=sitekey, url=url)["code"]


async def _solve_recaptcha(page, captcha_key: str, url: str) -> str:
    logger.info("Enviando reCAPTCHA para 2captcha (aguarde ~30s)...")
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        token = await loop.run_in_executor(
            pool, _solve_captcha_sync, captcha_key, url, RECAPTCHA_KEY
        )
    if token.startswith("ERROR_"):
        raise ValueError(f"Erro 2captcha: {token}")
    return token


# ── Login (mesmo padrão do Robô 1) ───────────────────────────────────────────

async def _login(page, login_url: str, corretor_slug: str, user: str, passwd: str, captcha_key: str):
    await page.goto(login_url, wait_until="networkidle")
    token = await _solve_recaptcha(page, captcha_key, login_url)

    login_frame = page.main_frame
    for frame in page.frames:
        try:
            if await frame.evaluate("!!document.getElementById('btnEntrar')"):
                login_frame = frame
                break
        except Exception:
            pass

    await login_frame.evaluate(f"""
        var cr = document.getElementById('g-recaptcha-response');
        if (cr) cr.value = '{token}';
        var c1 = document.getElementById('Corretor');
        if (c1) c1.value = '{corretor_slug}';
        var c2 = document.getElementById('Corretor2');
        if (c2) c2.value = '{corretor_slug}';
        var us = document.getElementById('Usuario');
        if (us) us.value = '{user}';
        var pw = document.getElementById('Senha');
        if (pw) pw.value = '{passwd}';
        document.getElementById('btnEntrar').click();
    """)

    try:
        await page.wait_for_url(lambda u: u != login_url, timeout=30000)
    except Exception:
        pass
    await page.wait_for_load_state("networkidle", timeout=60000)
    await page.wait_for_timeout(5000)

    for _ in range(20):
        await page.wait_for_timeout(1000)
        if any(
            "quiver" in f.url and "iframe-login" not in f.url and "recaptcha" not in f.url
            for f in page.frames
        ):
            break

    logger.info(f"Login OK. Frames: {[f.url for f in page.frames]}")


# ── Navegação até Relatórios > Orçamento por situação ─────────────────────────

async def _navegar_para_relatorio(page) -> bool:
    """
    3 estratégias em cascata:
      1) Busca direta por "Orçamento por situação" em todos os frames
      2) Clica em "Relatórios"/"Vendas" no navSide e depois busca o sub-item
      3) SelecionaModuloJQuery com nomes prováveis baseados no CSV (RptMultCalculo)
    """
    # Estratégia 1 — busca direta
    for frame in page.frames:
        try:
            found = await frame.evaluate(r"""
                (() => {
                    var links = document.querySelectorAll('a, li, [onclick]');
                    for (var i = 0; i < links.length; i++) {
                        var t = (links[i].innerText || links[i].textContent || '').trim().toLowerCase();
                        if (t.includes('orçamento por situação') ||
                            t.includes('orcamento por situacao') ||
                            t.includes('rptmultcalculo')) {
                            links[i].click();
                            return 'direto:' + t;
                        }
                    }
                    return null;
                })()
            """)
            if found:
                logger.info(f"Estratégia 1: {found} (frame: {frame.url})")
                return True
        except Exception:
            pass

    # Estratégia 2 — expande menu Relatórios e busca sub-item
    for frame in page.frames:
        try:
            clicked_menu = await frame.evaluate(r"""
                (() => {
                    var links = document.querySelectorAll('#navSide a, nav a, .menu a');
                    for (var i = 0; i < links.length; i++) {
                        var t = (links[i].innerText || links[i].textContent || '').trim().toLowerCase();
                        if (t.includes('relat') || t.includes('vendas') ||
                            t.includes('orçamento') || t.includes('orcamento')) {
                            links[i].click();
                            return 'menu:' + t;
                        }
                    }
                    return null;
                })()
            """)
            if clicked_menu:
                logger.info(f"Estratégia 2a: {clicked_menu}")
                await page.wait_for_timeout(2000)
                found2 = await frame.evaluate(r"""
                    (() => {
                        var links = document.querySelectorAll('a, li');
                        for (var i = 0; i < links.length; i++) {
                            var t = (links[i].innerText || links[i].textContent || '').trim().toLowerCase();
                            if (t.includes('orçamento por') || t.includes('orcamento por') ||
                                t.includes('mult calculo') || t.includes('situação')) {
                                links[i].click();
                                return 'sub:' + t;
                            }
                        }
                        return null;
                    })()
                """)
                if found2:
                    logger.info(f"Estratégia 2b: {found2}")
                    return True
        except Exception:
            pass

    # Estratégia 3 — SelecionaModuloJQuery com nomes prováveis
    for frame in page.frames:
        for page_name in ["RptMultCalculo", "RelatorioMultCalculo", "RptOrcamentoPorSituacao"]:
            try:
                ok = await frame.evaluate(f"""
                    (() => {{
                        if (typeof SelecionaModuloJQuery === 'function') {{
                            SelecionaModuloJQuery(
                                'Fast/FrmAjaxBootstrap.aspx?pagina={page_name}',
                                '{page_name}', 'Professional',
                                '{page_name}', 'Orçamento por Situação'
                            );
                            return true;
                        }}
                        return false;
                    }})()
                """)
                if ok:
                    logger.info(f"Estratégia 3: SelecionaModuloJQuery({page_name})")
                    await page.wait_for_timeout(3000)
                    return True
            except Exception:
                pass

    # Diagnóstico — loga o que está disponível no navSide para facilitar investigação
    for frame in page.frames:
        try:
            items = await frame.evaluate("""
                Array.from(document.querySelectorAll('#navSide a, nav a')).map(a =>
                    (a.innerText || a.textContent || '').trim()
                ).filter(Boolean)
            """)
            if items:
                logger.warning(f"navSide (frame {frame.url}): {items}")
        except Exception:
            pass

    return False


# ── Preenchimento dos filtros ─────────────────────────────────────────────────

async def _preencher_filtros(page, divisao: str, data_str: str):
    """Seleciona Nível=CORRETORA, Divisão e define datas De/Até = data_str."""
    await page.wait_for_timeout(3000)
    divisao_upper = divisao.upper()[:25]  # parcial para match robusto

    for frame in page.frames:
        try:
            tem_form = await frame.evaluate(
                "!!(document.querySelector('select') || document.querySelector('input[type=\"text\"]'))"
            )
            if not tem_form:
                continue

            logger.info(f"Preenchendo filtros no frame: {frame.url}")

            # Seleciona Nível = CORRETORA
            await frame.evaluate(r"""
                (() => {
                    document.querySelectorAll('select').forEach(function(sel) {
                        var ctx = (sel.id + sel.name + (sel.previousElementSibling
                            ? (sel.previousElementSibling.innerText || '') : '')).toLowerCase();
                        if (ctx.includes('nivel') || ctx.includes('nível')) {
                            for (var i = 0; i < sel.options.length; i++) {
                                if (sel.options[i].text.toUpperCase().includes('CORRETORA')) {
                                    sel.selectedIndex = i;
                                    sel.dispatchEvent(new Event('change', {bubbles: true}));
                                    if (typeof angular !== 'undefined') {
                                        try { angular.element(sel).scope().$apply(); } catch(e) {}
                                    }
                                    break;
                                }
                            }
                        }
                    });
                })()
            """)

            await page.wait_for_timeout(2000)

            # Seleciona Divisão
            await frame.evaluate(f"""
                (() => {{
                    document.querySelectorAll('select').forEach(function(sel) {{
                        var ctx = (sel.id + sel.name + (sel.previousElementSibling
                            ? (sel.previousElementSibling.innerText || '') : '')).toLowerCase();
                        if (ctx.includes('divis') || ctx.includes('corretora')) {{
                            for (var i = 0; i < sel.options.length; i++) {{
                                if (sel.options[i].text.toUpperCase().includes('{divisao_upper}')) {{
                                    sel.selectedIndex = i;
                                    sel.dispatchEvent(new Event('change', {{bubbles: true}}));
                                    if (typeof angular !== 'undefined') {{
                                        try {{ angular.element(sel).scope().$apply(); }} catch(e) {{}}
                                    }}
                                    break;
                                }}
                            }}
                        }}
                    }});
                }})()
            """)

            await page.wait_for_timeout(1000)

            # Preenche datas De e Até
            await frame.evaluate(f"""
                (() => {{
                    var inputs = document.querySelectorAll('input[type="text"], input[type="date"]');
                    var deSet = false, ateSet = false;
                    inputs.forEach(function(inp) {{
                        var ctx = (inp.id + inp.name + (inp.placeholder || '') +
                            (inp.previousElementSibling ? (inp.previousElementSibling.innerText || '') : '')
                        ).toLowerCase();
                        var lbl = '';
                        var parent = inp.closest('div, td, tr, li');
                        if (parent) {{
                            parent.querySelectorAll('label, span').forEach(function(l) {{
                                lbl += (l.innerText || '').toLowerCase() + ' ';
                            }});
                        }}
                        ctx += lbl;

                        var isDe = !deSet && (
                            ctx.includes('de:') || ctx.includes('datade') || ctx.includes('dt_de') ||
                            ctx.includes('inicio') || ctx.includes('período de') ||
                            (ctx.includes(' de ') && !ctx.includes('até'))
                        );
                        var isAte = !ateSet && !isDe && (
                            ctx.includes('até') || ctx.includes('ate') ||
                            ctx.includes('dataate') || ctx.includes('dt_ate') || ctx.includes('fim')
                        );

                        if (isDe) {{
                            inp.value = '{data_str}';
                            inp.dispatchEvent(new Event('input', {{bubbles: true}}));
                            inp.dispatchEvent(new Event('change', {{bubbles: true}}));
                            if (typeof angular !== 'undefined') {{
                                try {{ angular.element(inp).triggerHandler('change'); }} catch(e) {{}}
                            }}
                            deSet = true;
                        }} else if (isAte) {{
                            inp.value = '{data_str}';
                            inp.dispatchEvent(new Event('input', {{bubbles: true}}));
                            inp.dispatchEvent(new Event('change', {{bubbles: true}}));
                            if (typeof angular !== 'undefined') {{
                                try {{ angular.element(inp).triggerHandler('change'); }} catch(e) {{}}
                            }}
                            ateSet = true;
                        }}
                    }});
                    return {{deSet: deSet, ateSet: ateSet}};
                }})()
            """)

            logger.info(f"Filtros: data={data_str} divisao={divisao}")
            return

        except Exception as fe:
            logger.debug(f"Filtros frame {frame.url}: {fe}")


# ── Executa e baixa o CSV ─────────────────────────────────────────────────────

async def _executar_e_baixar(page) -> bytes:
    # Clica no botão Executar/Gerar
    for frame in page.frames:
        try:
            clicou = await frame.evaluate(r"""
                (() => {
                    var btns = document.querySelectorAll(
                        'button, input[type="button"], input[type="submit"], a.btn, [onclick]'
                    );
                    for (var i = 0; i < btns.length; i++) {
                        var t = (btns[i].innerText || btns[i].value || btns[i].textContent || '')
                            .trim().toLowerCase();
                        if (t.includes('executar') || t.includes('gerar') ||
                            t.includes('pesquisar') || t.includes('filtrar') ||
                            t.includes('buscar') || t === 'ok') {
                            btns[i].click();
                            return 'exec:' + t;
                        }
                    }
                    return null;
                })()
            """)
            if clicou:
                logger.info(f"Executar: {clicou} (frame: {frame.url})")
                break
        except Exception:
            pass

    await page.wait_for_load_state("networkidle", timeout=60000)
    await page.wait_for_timeout(5000)

    # Baixa o CSV via expect_download
    for frame in page.frames:
        try:
            async with page.expect_download(timeout=30000) as dl_info:
                clicked = await frame.evaluate(r"""
                    (() => {
                        var btns = document.querySelectorAll('button, a, input, [onclick]');
                        for (var i = 0; i < btns.length; i++) {
                            var t = (btns[i].innerText || btns[i].value || btns[i].textContent || '')
                                .trim().toLowerCase();
                            var id   = (btns[i].id || '').toLowerCase();
                            var href = (btns[i].href || '').toLowerCase();
                            if (t.includes('csv') || t.includes('excel') ||
                                t.includes('exportar') || t.includes('baixar') ||
                                t.includes('download') ||
                                id.includes('csv') || id.includes('export') ||
                                href.includes('.csv') || href.includes('export')) {
                                btns[i].click();
                                return 'dl:' + t;
                            }
                        }
                        return null;
                    })()
                """)
                if not clicked:
                    raise Exception("botão de download não encontrado")

            download = await dl_info.value
            path = await download.path()
            with open(path, "rb") as fh:
                content = fh.read()
            logger.info(f"Download OK: {len(content)} bytes (frame: {frame.url})")
            return content

        except Exception as fe:
            logger.debug(f"Download frame {frame.url}: {fe}")

    raise RuntimeError(
        "Não foi possível baixar o relatório. "
        "Verifique os logs para identificar o botão de download correto."
    )


# ── Ponto de entrada ──────────────────────────────────────────────────────────

async def executar() -> dict:
    harper_url  = os.getenv("HARPER_URL", "https://harper.corretor-online.com.br/")
    harper_user = os.getenv("HARPER_USER")
    harper_pass = os.getenv("HARPER_PASS")
    captcha_key = os.getenv("TWOCAPTCHA_KEY")
    divisao     = os.getenv("QUIVER_DIVISAO", "HARPER CORRETORA DE SEGUROS LTDA")
    tenant_id   = int(os.getenv("TENANT_ID", "2"))
    db_url      = os.getenv("DATABASE_URL")

    if not all([harper_user, harper_pass, captcha_key, db_url]):
        return {
            "status": "erro",
            "credenciais_com_erro": [],
            "mensagem": "Credenciais incompletas. Configure HARPER_USER, HARPER_PASS, TWOCAPTCHA_KEY.",
        }

    import urllib.parse
    parsed        = urllib.parse.urlparse(harper_url)
    login_url     = f"{parsed.scheme}://{parsed.netloc}/"
    corretor_slug = (parsed.hostname or "").split(".")[0].upper()

    ontem    = date.today() - timedelta(days=1)
    data_str = ontem.strftime("%d/%m/%Y")
    logger.info(f"Robô 4 — Relatório Vendas | período: {data_str} | divisão: {divisao} | tenant: {tenant_id}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True)
        page    = await context.new_page()

        try:
            await _login(page, login_url, corretor_slug, harper_user, harper_pass, captcha_key)

            ok = await _navegar_para_relatorio(page)
            if not ok:
                return {
                    "status": "erro",
                    "credenciais_com_erro": [],
                    "mensagem": (
                        "Não foi possível navegar até 'Orçamento por situação'. "
                        "Verifique os logs — o navSide disponível foi registrado para diagnóstico."
                    ),
                }

            await page.wait_for_load_state("networkidle", timeout=30000)
            await page.wait_for_timeout(3000)

            await _preencher_filtros(page, divisao, data_str)
            csv_bytes = await _executar_e_baixar(page)
            records   = _parse_csv(csv_bytes, tenant_id)

            if not records:
                return {
                    "status": "sucesso",
                    "credenciais_com_erro": [],
                    "mensagem": f"Nenhum registro encontrado para {data_str}.",
                }

            imported = _upsert_records(records, db_url)
            logger.info(f"Importados {imported} registros de {data_str}.")
            return {
                "status": "sucesso",
                "credenciais_com_erro": [],
                "mensagem": f"{imported} registros importados para {data_str}.",
            }

        except Exception as exc:
            logger.error(f"Erro inesperado: {exc}", exc_info=True)
            return {"status": "erro", "credenciais_com_erro": [], "mensagem": str(exc)}

        finally:
            await browser.close()

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

    text   = text.replace("\r\n", "\n").replace("\r", "\n")
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


# ── Navegação até Vendas > Orçamento por situação ────────────────────────────

async def _navegar_para_relatorio(page) -> bool:
    """
    Caminho confirmado via investigação:
      1) menuFast.Aspx → SelecionaModuloJQuery('FrmPortal.aspx?pagina=Orcamentos', ...)
      2) Frame pagina=Orcamentos → clica link "Orçamento por situação"
         onclick: SelecionaModuloJQuery('RptMultCalculo;Relatorio',
                  'RELATORIOS_ORCAMENTO_POR_SITUACAO', ...)
    """
    # Passo 1 — abre o módulo Vendas/Orcamentos no frame menuFast
    for frame in page.frames:
        if "menufas" in frame.url.lower():
            try:
                await frame.evaluate("""
                    SelecionaModuloJQuery(
                        'FrmPortal.aspx?pagina=Orcamentos',
                        'ORCAMENTOS', 'AcompanhamentoVendas|Professional',
                        'ORCAMENTOS', 'Vendas'
                    );
                """)
                logger.info("Passo 1: SelecionaModuloJQuery(Orcamentos) chamado")
                break
            except Exception as e:
                logger.warning(f"Passo 1 falhou ({frame.url}): {e}")

    await page.wait_for_timeout(4000)
    logger.info(f"Frames após Vendas: {[f.url[:70] for f in page.frames]}")

    # Passo 2 — dentro do frame pagina=Orcamentos, clica "Orçamento por situação"
    for tentativa in range(8):
        for frame in page.frames:
            if "orcamentos" in frame.url.lower():
                try:
                    links = await frame.query_selector_all("a")
                    for link in links:
                        txt = (await link.inner_text()).strip().lower()
                        if "orçamento por situação" in txt or "orcamento por situacao" in txt:
                            await link.click()
                            logger.info(f"Passo 2: clicou 'Orçamento por situação' (frame: {frame.url[:60]})")
                            await page.wait_for_timeout(5000)
                            logger.info(f"Frames após clique: {[f.url[:70] for f in page.frames]}")
                            return True
                except Exception as e:
                    logger.debug(f"Passo 2 tentativa {tentativa} frame {frame.url[:40]}: {e}")
        await page.wait_for_timeout(1000)

    # Fallback — tenta a chamada JS direta no frame de conteúdo
    for frame in page.frames:
        if "orcamentos" in frame.url.lower():
            try:
                ok = await frame.evaluate("""
                    (() => {
                        if (typeof SelecionaModuloJQuery === 'function') {
                            SelecionaModuloJQuery(
                                'RptMultCalculo;Relatorio',
                                'RELATORIOS_ORCAMENTO_POR_SITUACAO',
                                'AcompanhamentoVendas|Professional',
                                'RELATORIOS_ORCAMENTO_POR_SITUACAO',
                                'Orçamento por situação'
                            );
                            return true;
                        }
                        return false;
                    })()
                """)
                if ok:
                    logger.info("Fallback: SelecionaModuloJQuery(RptMultCalculo;Relatorio) chamado")
                    await page.wait_for_timeout(5000)
                    return True
            except Exception as e:
                logger.warning(f"Fallback JS falhou: {e}")

    # Diagnóstico — loga os links disponíveis nos frames de conteúdo
    for frame in page.frames:
        try:
            links = await frame.evaluate("""
                Array.from(document.querySelectorAll('a')).map(a => ({
                    text: (a.innerText||'').trim().substring(0,50),
                    onclick: (a.getAttribute('onclick')||'').substring(0,80)
                })).filter(x => x.text).slice(0, 30)
            """)
            if links:
                logger.warning(f"Links frame {frame.url[:60]}: {links}")
        except Exception:
            pass

    return False


# ── Preenchimento dos filtros ─────────────────────────────────────────────────

async def _preencher_filtros(page, divisao: str, data_str: str):
    """
    Preenche Nível, Divisão e datas De/Até em qualquer frame.
    Detecta inputs de data pelo valor já preenchido (formato DD/MM/YYYY) —
    estratégia robusta que independe de id/name/label/URL do frame.
    """
    await page.wait_for_timeout(3000)
    divisao_upper = divisao.upper()[:25]

    for frame in page.frames:
        try:
            resultado = await frame.evaluate(f"""
                (() => {{
                    var r = {{nivel: null, divisao: null, deSet: false, ateSet: false, dateCount: 0}};

                    // Nível
                    document.querySelectorAll('select').forEach(function(sel) {{
                        if (r.nivel) return;
                        var ctx = (sel.id + (sel.name||'') +
                            (sel.parentElement ? sel.parentElement.innerText : '')).toLowerCase();
                        if (ctx.includes('nivel') || ctx.includes('n\\u00edvel')) {{
                            for (var i=0; i<sel.options.length; i++) {{
                                if (sel.options[i].text.toUpperCase().includes('CORRETORA')) {{
                                    sel.selectedIndex = i;
                                    sel.dispatchEvent(new Event('change', {{bubbles:true}}));
                                    r.nivel = sel.options[i].text; break;
                                }}
                            }}
                        }}
                    }});

                    // Divisão
                    document.querySelectorAll('select').forEach(function(sel) {{
                        if (r.divisao) return;
                        var ctx = (sel.id + (sel.name||'') +
                            (sel.parentElement ? sel.parentElement.innerText : '')).toLowerCase();
                        if (ctx.includes('divis') || ctx.includes('corretora')) {{
                            for (var i=0; i<sel.options.length; i++) {{
                                if (sel.options[i].text.toUpperCase().includes('{divisao_upper}')) {{
                                    sel.selectedIndex = i;
                                    sel.dispatchEvent(new Event('change', {{bubbles:true}}));
                                    r.divisao = sel.options[i].text; break;
                                }}
                            }}
                        }}
                    }});

                    // Datas — detecta pelo valor atual no formato DD/MM/YYYY
                    var dateRe = /^\\d{{2}}\\/\\d{{2}}\\/\\d{{4}}$/;
                    var dateInputs = Array.from(
                        document.querySelectorAll('input[type=text], input[type=date], input:not([type])')
                    ).filter(function(inp) {{ return dateRe.test((inp.value||'').trim()); }});

                    r.dateCount = dateInputs.length;

                    function setDate(inp, val) {{
                        inp.value = val;
                        inp.dispatchEvent(new Event('input',  {{bubbles:true}}));
                        inp.dispatchEvent(new Event('change', {{bubbles:true}}));
                        try {{ if (typeof angular!=='undefined') angular.element(inp).triggerHandler('change'); }} catch(e){{}}
                    }}

                    if (dateInputs.length >= 2) {{
                        setDate(dateInputs[0], '{data_str}');
                        setDate(dateInputs[dateInputs.length-1], '{data_str}');
                        r.deSet = r.ateSet = true;
                    }} else if (dateInputs.length === 1) {{
                        setDate(dateInputs[0], '{data_str}');
                        r.deSet = true;
                    }}

                    return r;
                }})()
            """)

            if resultado and resultado.get("dateCount", 0) > 0:
                logger.info(f"Filtros OK [{frame.url[:55]}]: {resultado}")
                return

        except Exception as fe:
            logger.debug(f"Filtros frame {frame.url[:40]}: {fe}")

    logger.warning("Nenhum frame com inputs de data encontrado — datas padrão do formulário serão usadas")


# ── Parsing de arquivo (CSV ou XLSX) ─────────────────────────────────────────

def _parse_file(content: bytes, tenant_id: int) -> list:
    """Detecta formato (CSV / XLSX / XLS) e delega ao parser correto."""
    if content[:2] == b'PK':
        return _parse_xlsx(content, tenant_id)
    if content[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
        return _parse_xlsx(content, tenant_id)
    return _parse_csv(content, tenant_id)


def _parse_xlsx(content: bytes, tenant_id: int) -> list:
    import openpyxl, io as _io
    wb = openpyxl.load_workbook(_io.BytesIO(content), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        return []

    header = [str(h).strip() if h is not None else "" for h in rows[0]]
    col_idx = {h: i for i, h in enumerate(header)}
    core_idx = {col_idx[h] for h in HEADER_MAP if h in col_idx}

    records = []
    for row in rows[1:]:
        if not row or not any(c for c in row if c is not None):
            continue
        rec = {"tenant_id": tenant_id}
        for csv_h, field in HEADER_MAP.items():
            idx = col_idx.get(csv_h)
            if idx is None:
                continue
            raw = row[idx]
            if raw is None:
                rec[field] = None
                continue
            raw_s = str(raw).strip()
            if field in _NUMERIC:
                rec[field] = _parse_float(raw_s) if raw_s else None
            elif field in _DATE:
                from datetime import date as _date
                if isinstance(raw, _date):
                    rec[field] = raw
                else:
                    rec[field] = _parse_date(raw_s)
            elif field in _DTIME:
                from datetime import datetime as _dt
                if isinstance(raw, _dt):
                    rec[field] = raw
                else:
                    rec[field] = _parse_datetime(raw_s)
            else:
                rec[field] = raw_s or None
        extras = {
            header[i]: str(row[i]).strip()
            for i in range(len(row))
            if i not in core_idx and i < len(header) and header[i] and row[i] is not None
        }
        rec["dados_seguradoras"] = extras or None
        if not (rec.get("calculo") or "").strip():
            continue
        if rec.get("seguradora") is None:
            rec["seguradora"] = ""
        records.append(rec)

    logger.info(f"XLSX parseado: {len(records)} registros")
    return records


# ── HTTP direto (fallback quando o browser não captura o download) ────────────

async def _direct_http_post(page, form_frame, nome_evento: str = "XLS2") -> bytes:
    """Reproduz o POST do eventoAjax via Python urllib usando os cookies do Playwright."""
    import urllib.request, urllib.parse, ssl

    frame_url = form_frame.url

    cookies_list = await page.context.cookies()
    cookie_header = "; ".join(f"{c['name']}={c['value']}" for c in cookies_list)
    logger.info(f"Direct POST: {len(cookies_list)} cookies, frame={frame_url[:80]}")

    form_data = await form_frame.evaluate("""
        (() => {
            var data = {};
            document.querySelectorAll('input[name], select[name], textarea[name]').forEach(function(el) {
                if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
                data[el.name] = el.value !== undefined ? el.value : '';
            });
            return data;
        })()
    """)
    form_data['NomeEvento'] = nome_evento
    logger.info(f"Direct POST: {len(form_data)} campos, NomeEvento={nome_evento}")

    encoded = urllib.parse.urlencode(form_data).encode('utf-8')

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        frame_url, data=encoded,
        headers={
            'Cookie': cookie_header,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://harper.corretor-online.com.br',
            'Referer': frame_url,
        }
    )

    loop = asyncio.get_event_loop()

    def _do():
        with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
            data = resp.read()
            ct = resp.headers.get('Content-Type', '')
            cd = resp.headers.get('Content-Disposition', '')
            logger.info(f"Direct POST resp: {resp.status} ct={ct!r} cd={cd!r} size={len(data)}")
            preview = data[:3000].decode('latin-1', errors='replace')
            logger.info(f"Direct POST body: {preview!r}")
            return data

    with concurrent.futures.ThreadPoolExecutor() as pool:
        content = await loop.run_in_executor(pool, _do)

    return content


async def _direct_http_get(page, url: str) -> bytes:
    """Faz GET direto para uma URL usando os cookies do Playwright."""
    import urllib.request, ssl

    cookies_list = await page.context.cookies()
    cookie_header = "; ".join(f"{c['name']}={c['value']}" for c in cookies_list)
    logger.info(f"Direct GET: {url}")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # Garante URL absoluta
    if url.startswith('/'):
        url = 'https://harper.corretor-online.com.br' + url

    req = urllib.request.Request(
        url,
        headers={
            'Cookie': cookie_header,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://harper.corretor-online.com.br/',
        }
    )

    loop = asyncio.get_event_loop()

    def _do():
        with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
            data = resp.read()
            ct = resp.headers.get('Content-Type', '')
            logger.info(f"Direct GET resp: {resp.status} ct={ct!r} size={len(data)}")
            preview = data[:1000].decode('latin-1', errors='replace')
            logger.info(f"Direct GET body: {preview!r}")
            return data

    with concurrent.futures.ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, _do)


# ── Executa e baixa o relatório ───────────────────────────────────────────────

async def _executar_e_baixar(page) -> bytes:
    """
    Três abordagens em sequência:
      A) page.expect_download() com 'Gera XLSX' (eventoAjaxProcessReport)
      B) page.expect_download() com 'btxls' + captura de resposta text/plain
      C) HTTP POST direto via Python urllib (usando cookies do Playwright)
    """
    # ── encontra o frame do formulário de resultados (FrmConsultaFast) ──────────
    # Critério principal: presença do botão btxls OU do link eventoAjaxProcessReport
    # Isso garante que não confundimos com menuFast.Aspx (que tem outros eventoAjax)
    form_frame = None
    for frame in page.frames:
        if "FrmConsultaFast" not in frame.url and "frmconsultafast" not in frame.url.lower():
            continue
        try:
            info = await frame.evaluate("""
                (() => {
                    var hasFlat       = !!document.getElementById('flat');
                    var hasBtxls      = !!document.getElementById('btxls');
                    var hasProcessRpt = !!document.querySelector('[onclick*="eventoAjaxProcessReport"]');
                    var allOnclicks   = Array.from(document.querySelectorAll('[onclick]')).map(el => ({
                        tag: el.tagName, id: el.id,
                        t: (el.innerText||el.value||'').trim().substring(0,30),
                        oc: (el.getAttribute('onclick')||'').substring(0,80)
                    }));
                    return {hasFlat, hasBtxls, hasProcessRpt, allOnclicks};
                })()
            """)
            if info and (info.get('hasFlat') or info.get('hasBtxls') or info.get('hasProcessRpt')):
                form_frame = frame
                logger.info(f"Frame consulta: {frame.url[:80]}")
                logger.info(f"hasFlat={info['hasFlat']} hasBtxls={info['hasBtxls']} hasProcessRpt={info['hasProcessRpt']}")
                logger.info(f"allOnclicks ({len(info['allOnclicks'])}): {info['allOnclicks']}")
                break
        except Exception as fe:
            logger.debug(f"Frame {frame.url[:40]}: {fe}")

    if not form_frame:
        for frame in page.frames:
            try:
                ocs = await frame.evaluate("""
                    Array.from(document.querySelectorAll('[onclick]')).map(el => ({
                        tag: el.tagName, id: el.id,
                        t: (el.innerText||el.value||'').trim().substring(0,30),
                        oc: (el.getAttribute('onclick')||'').substring(0,80)
                    })).filter(x => x.oc)
                """)
                if ocs:
                    logger.warning(f"Frame sem EXECUTA [{frame.url[:60]}]: {ocs[:15]}")
            except Exception:
                pass
        raise RuntimeError("Frame com formulário (#flat / btxls / eventoAjax) não encontrado.")

    # ── Clica EXECUTAR para gerar o relatório com os filtros atuais ──────────
    exec_res = await form_frame.evaluate("""
        (() => {
            // Procura botão EXECUTAR (tipo submit ou texto "EXECUTAR")
            var btns = document.querySelectorAll('button, input[type=button], input[type=submit], a');
            for (var i=0; i<btns.length; i++) {
                var t = (btns[i].innerText||btns[i].value||'').trim().toUpperCase();
                if (t === 'EXECUTAR' || t === 'PESQUISAR' || t === 'GERAR') {
                    btns[i].click();
                    return 'clicou:' + btns[i].id + ':' + t;
                }
            }
            // Verifica se já existe #flat (submit padrão Quiver)
            var flat = document.getElementById('flat');
            if (flat) { flat.click(); return 'flat:' + (flat.innerText||'').trim(); }
            return 'sem-executar';
        })()
    """)
    logger.info(f"EXECUTAR: {exec_res}")
    if exec_res != 'sem-executar':
        await page.wait_for_load_state("networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

    # ── Abordagem A: page.expect_download() com "Gera XLSX" ──────────────────
    # eventoAjaxProcessReport faz um submit de formulário normal → Playwright captura
    logger.info("Abordagem A: expect_download() com 'Gera XLSX' (eventoAjaxProcessReport)...")
    try:
        async with page.expect_download(timeout=60000) as dl_info:
            clicked_a = await form_frame.evaluate("""
                (() => {
                    var els = document.querySelectorAll('a, button');
                    for (var el of els) {
                        var oc = el.getAttribute('onclick') || '';
                        var txt = (el.innerText || el.value || '').trim();
                        // eventoAjaxProcessReport('XLSX', ...) → file download real
                        if (oc.indexOf('eventoAjaxProcessReport') !== -1 &&
                            (oc.indexOf("'XLSX'") !== -1 || oc.indexOf('"XLSX"') !== -1)) {
                            el.click();
                            return 'ProcessReport:XLSX ' + txt;
                        }
                    }
                    return null;
                })()
            """)
            logger.info(f"Abordagem A clicou: {clicked_a}")
            if not clicked_a:
                raise RuntimeError("Botão Gera XLSX não encontrado")
        download = await dl_info.value
        logger.info(f"Abordagem A OK: {download.suggested_filename}")
        path = await download.path()
        with open(path, 'rb') as f:
            return f.read()
    except Exception as ea:
        logger.warning(f"Abordagem A falhou: {ea}")

    # ── Abordagem B: response interception com log completo do body ───────────
    # Captura TODAS as respostas com body completo para diagnóstico
    logger.info("Abordagem B: response interception (log completo) + btxls...")
    captured_b: list = []
    all_resp_b: list = []

    async def _on_resp_b(resp):
        url = resp.url
        if "corretor-online" not in url and "quiver" not in url:
            return
        ct = resp.headers.get("content-type", "").lower()
        cd = resp.headers.get("content-disposition", "").lower()
        st = resp.status
        try:
            data = await resp.body()
            size = len(data)
            preview = data[:5000].decode("latin-1", errors="replace")
            logger.info(f"[B] Response {st}: {url[:100]}")
            logger.info(f"  ct={ct!r} cd={cd!r} size={size}")
            # Log completo para diagnóstico (até 8000 chars)
            for i in range(0, min(len(preview), 8000), 1000):
                logger.info(f"  body[{i}:{i+1000}]: {preview[i:i+1000]!r}")
            all_resp_b.append({"url": url[:100], "ct": ct, "cd": cd, "st": st, "size": size})

            # CSV: contém ';' como delimitador logo no início
            if b';' in data[:300]:
                logger.info(f"  → CSV detectado!")
                captured_b.append(data)
                return

            # XLSX/XLS binário
            if data[:2] == b'PK' or data[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
                logger.info(f"  → XLSX/XLS binário detectado!")
                captured_b.append(data)
                return

            # Procura URL de download embutida no body (Quiver às vezes retorna URL)
            import re as _re
            urls = _re.findall(r'["\']([^"\']{5,200}\.(?:csv|xls|xlsx)(?:\?[^"\']*)?)["\']', preview, _re.I)
            urls += _re.findall(r'href=["\']([^"\']+)["\']', preview)
            file_urls = [u for u in urls if any(x in u.lower() for x in ['download', '.csv', '.xls', '.xlsx', 'getfile', 'export'])]
            if file_urls:
                logger.info(f"  → URL de download encontrada: {file_urls}")
                captured_b.append(("url", file_urls[0]))
        except Exception as ex:
            logger.warning(f"Erro ao ler resp {url[:60]}: {ex}")

    page.on("response", _on_resp_b)
    try:
        clicked_b = await form_frame.evaluate("""
            (() => {
                var btn = document.getElementById('btxls');
                if (btn) { btn.click(); return 'btxls:' + (btn.innerText||'').trim(); }
                var ocs = document.querySelectorAll('[onclick]');
                for (var i=0; i<ocs.length; i++) {
                    var oc = ocs[i].getAttribute('onclick') || '';
                    if (oc.indexOf('XLS2') !== -1 || oc.indexOf('XLSX2') !== -1) {
                        ocs[i].click();
                        return 'xls2:' + oc.substring(0,40);
                    }
                }
                return null;
            })()
        """)
        logger.info(f"Abordagem B clicou: {clicked_b}")
        await asyncio.sleep(20)
    finally:
        page.remove_listener("response", _on_resp_b)

    logger.info(f"Abordagem B respostas: {all_resp_b}")
    if captured_b:
        item = captured_b[0]
        if isinstance(item, tuple) and item[0] == "url":
            logger.info(f"Abordagem B: seguindo URL de download {item[1]}")
            return await _direct_http_get(page, item[1])
        return item

    # ── Abordagem C: HTTP POST direto com Python urllib ───────────────────────
    logger.info("Abordagem C: HTTP POST direto via Python urllib...")
    content_c = await _direct_http_post(page, form_frame, "XLS2")

    # Se o body do POST direto também não é CSV/XLSX, loga e levanta erro
    if b';' not in content_c[:300] and content_c[:2] != b'PK':
        logger.error(f"Abordagem C: body não é CSV/XLSX. Primeiros 500 bytes: {content_c[:500]!r}")
        raise RuntimeError(
            "Todas as abordagens de download falharam. "
            "Verifique os logs para o conteúdo real das respostas do Quiver."
        )

    return content_c


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
            file_bytes = await _executar_e_baixar(page)
            records    = _parse_file(file_bytes, tenant_id)

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

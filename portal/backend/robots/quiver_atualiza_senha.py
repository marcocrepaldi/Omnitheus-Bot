"""
Robô 3 — Quiver: Atualiza Senha de Seguradora na Central de Senhas

Fluxo:
  1. Login no Quiver (com reCAPTCHA via 2captcha)
  2. Navega para Área Seguradora → Central de Senhas
  3. Clica na seguradora alvo no painel esquerdo
  4. Clica no lápis (editar) na linha de credencial
  5. Preenche a nova senha e salva

Credenciais necessárias (injetadas pelo scheduler / /credenciais):
    HARPER_URL      — URL raiz do Quiver da corretora
    HARPER_USER     — Usuário Quiver
    HARPER_PASS     — Senha Quiver
    TWOCAPTCHA_KEY  — Chave 2captcha da plataforma
    SEGURADORA_NOME — Nome exato da seguradora (ex: SUHAI)
    SEGURADORA_USER — Login da seguradora (se exigido pelo formulário)
    SEGURADORA_PASS — Nova senha da seguradora a salvar no Quiver
"""

import asyncio
import os
import logging
import concurrent.futures
import urllib.parse

from playwright.async_api import async_playwright
from twocaptcha import TwoCaptcha

logger = logging.getLogger("robot.quiver_atualiza")
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s [robot.quiver_atualiza] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)

RECAPTCHA_KEY = "6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI"


def _solve_captcha_sync(captcha_key: str, url: str) -> str:
    solver = TwoCaptcha(captcha_key)
    result = solver.recaptcha(sitekey=RECAPTCHA_KEY, url=url)
    return result["code"]


async def _login_quiver(page, harper_url: str, harper_user: str, harper_pass: str, captcha_key: str):
    parsed       = urllib.parse.urlparse(harper_url)
    login_url    = f"{parsed.scheme}://{parsed.netloc}/"
    corretor_slug = (parsed.hostname or "").split(".")[0].upper()

    logger.info(f"Acessando Quiver: {login_url} | usuário: {harper_user}")
    await page.goto(login_url, wait_until="networkidle")

    logger.info("Resolvendo reCAPTCHA...")
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        token = await loop.run_in_executor(pool, _solve_captcha_sync, captcha_key, login_url)

    if token.startswith("ERROR_"):
        raise ValueError(f"Erro 2captcha: {token}")

    await page.evaluate(f"""
        var cr = document.getElementById('g-recaptcha-response');
        if (cr) cr.value = '{token}';
        var c1 = document.getElementById('Corretor');
        if (c1) c1.value = '{corretor_slug}';
        var c2 = document.getElementById('Corretor2');
        if (c2) c2.value = '{corretor_slug}';
        var us = document.getElementById('Usuario');
        if (us) us.value = '{harper_user}';
        var pw = document.getElementById('Senha');
        if (pw) pw.value = '{harper_pass}';
        document.getElementById('btnEntrar').click();
    """)

    try:
        await page.wait_for_url(lambda u: u != login_url, timeout=30000)
    except Exception:
        pass
    await page.wait_for_load_state("networkidle", timeout=60000)
    await page.wait_for_timeout(5000)
    logger.info(f"Pós-login: {page.url}")


async def _abrir_central_senhas(page):
    """Navega até a Central de Senhas e retorna o frame dela."""

    # Área Seguradora via JS
    for frame in page.frames:
        try:
            ok = await frame.evaluate("""() => {
                if (typeof SelecionaModuloJQuery === 'function') {
                    SelecionaModuloJQuery(
                        'Fast/FrmAjaxBootstrap.aspx?pagina=AreaSeguradorasArquivos',
                        'AREA_SEGURADORAS','Professional',
                        'AREA_SEGURADORAS','Área de seguradoras'
                    );
                    return true;
                }
                return false;
            }""")
            if ok:
                logger.info("Navegou para Área Seguradora")
                break
        except Exception:
            pass

    await page.wait_for_load_state("networkidle", timeout=30000)
    await page.wait_for_timeout(3000)

    # Ações
    for frame in page.frames:
        el = await frame.query_selector('[id="acoes-pagina"]')
        if el:
            try:
                await el.click()
            except Exception:
                await el.click(force=True)
            logger.info("Clicou em Ações")
            break
    await page.wait_for_timeout(2000)

    # Central de Senhas
    for frame in page.frames:
        el = await frame.query_selector('[id="btConfiguracoes"] a button') \
             or await frame.query_selector('[id="btConfiguracoes"]')
        if el:
            try:
                await el.click()
            except Exception:
                await el.click(force=True)
            logger.info("Clicou em Central de Senhas")
            break
    await page.wait_for_timeout(10000)

    # Retorna o frame da Central de Senhas
    for frame in page.frames:
        if "centralsenhas.quiver" in frame.url:
            logger.info(f"Frame Central de Senhas: {frame.url}")
            return frame

    raise RuntimeError(
        f"Frame da Central de Senhas não encontrado. "
        f"Frames: {[f.url for f in page.frames]}"
    )


async def executar() -> dict:
    harper_url      = os.getenv("HARPER_URL", "https://harper.corretor-online.com.br/")
    harper_user     = os.getenv("HARPER_USER")
    harper_pass     = os.getenv("HARPER_PASS")
    captcha_key     = os.getenv("TWOCAPTCHA_KEY")
    seguradora_nome = os.getenv("SEGURADORA_NOME", "SUHAI")
    seguradora_user = os.getenv("SEGURADORA_USER", "")
    seguradora_pass = os.getenv("SEGURADORA_PASS")

    if not all([harper_user, harper_pass, captcha_key, seguradora_pass]):
        return {
            "status": "erro",
            "credenciais_com_erro": [],
            "mensagem": "Credenciais incompletas. Configure HARPER_USER, HARPER_PASS, TWOCAPTCHA_KEY e SEGURADORA_PASS.",
        }

    logger.info(f"Iniciando Robô 3 | Quiver: {harper_user} | Seguradora: {seguradora_nome}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        try:
            # 1. Login no Quiver
            await _login_quiver(page, harper_url, harper_user, harper_pass, captcha_key)

            # 2. Abre Central de Senhas
            cs_frame = await _abrir_central_senhas(page)

            # 3. Clica na seguradora alvo no painel esquerdo
            logger.info(f"Buscando {seguradora_nome} na lista...")
            clicou_seg = await cs_frame.evaluate(f"""() => {{
                const els = Array.from(document.querySelectorAll('.col-lg-2, .ng-scope'));
                const alvo = els.find(el => el.innerText?.trim() === '{seguradora_nome}');
                if (alvo) {{ alvo.click(); return true; }}
                // fallback: qualquer elemento com o texto exato
                const b = Array.from(document.querySelectorAll('b, span, div'))
                    .find(el => el.innerText?.trim() === '{seguradora_nome}');
                if (b) {{ b.closest('.col-lg-2, .ng-scope, li') ?.click() || b.click(); return true; }}
                return false;
            }}""")

            if not clicou_seg:
                raise RuntimeError(f"Seguradora '{seguradora_nome}' não encontrada na Central de Senhas.")
            logger.info(f"Clicou em {seguradora_nome}")
            await page.wait_for_timeout(3000)

            # 4. Clica no lápis (editar credencial)
            logger.info("Clicando no lápis para editar...")
            clicou_lapis = await cs_frame.evaluate("""() => {
                // Tenta glyphicon-pencil
                const lapis = document.querySelector('.glyphicon-pencil, [class*="pencil"], .fa-pencil, [ng-click*="edit"], [ng-click*="Edit"]');
                if (lapis) { lapis.click(); return 'glyphicon'; }
                // Tenta ícone em âncora/botão próximo ao texto da credencial
                const btns = Array.from(document.querySelectorAll('a, button, span[ng-click]'));
                for (const b of btns) {
                    if (b.innerHTML.includes('pencil') || b.title?.toLowerCase().includes('edit') || b.getAttribute('ng-click')?.toLowerCase().includes('edit')) {
                        b.click();
                        return b.outerHTML.substring(0, 80);
                    }
                }
                return null;
            }""")
            logger.info(f"Lápis clicado: {clicou_lapis}")
            await page.wait_for_timeout(3000)
            await page.screenshot(path="/tmp/quiver_r3_edit_form.png", full_page=True)

            # 5. Preenche o formulário de edição
            inputs = await cs_frame.evaluate("""() => {
                return Array.from(document.querySelectorAll('input:not([type=hidden]), select'))
                    .map(el => ({ id: el.id, name: el.name, type: el.type,
                                  ngModel: el.getAttribute('ng-model'),
                                  placeholder: el.placeholder }));
            }""")
            logger.info(f"Inputs encontrados: {inputs}")

            # Preenche campos por placeholder/ng-model/type
            preencheu_senha = await cs_frame.evaluate(f"""() => {{
                const setVal = (el, val) => {{
                    el.value = val;
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }};
                let ok = false;
                document.querySelectorAll('input').forEach(inp => {{
                    const ng  = inp.getAttribute('ng-model') || '';
                    const ph  = inp.placeholder?.toLowerCase() || '';
                    const nm  = inp.name?.toLowerCase() || '';
                    if (ng.includes('senha') || ng.includes('password') || ng.includes('pass') ||
                        ph.includes('senha') || ph.includes('password') ||
                        nm.includes('senha') || nm.includes('password') || inp.type === 'password') {{
                        setVal(inp, '{seguradora_pass}');
                        ok = true;
                    }}
                    if ((ng.includes('login') || ng.includes('usuario') || ng.includes('user') ||
                         ph.includes('login') || ph.includes('usuário')) && '{seguradora_user}') {{
                        setVal(inp, '{seguradora_user}');
                    }}
                }});
                return ok;
            }}""")
            logger.info(f"Campos de senha preenchidos: {preencheu_senha}")

            if not preencheu_senha:
                raise RuntimeError("Nenhum campo de senha encontrado no formulário de edição. Verifique o screenshot /tmp/quiver_r3_edit_form.png")

            # 6. Salva
            logger.info("Salvando...")
            salvou = await cs_frame.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('button, a, input[type=submit]'));
                const salvar = btns.find(b => {
                    const t = (b.innerText || b.value || '').toLowerCase();
                    return t.includes('salv') || t.includes('confirm') || t.includes('ok') || t.includes('gravar');
                });
                if (salvar) { salvar.click(); return salvar.innerText || salvar.value; }
                return null;
            }""")
            logger.info(f"Botão salvar clicado: {salvou}")
            await page.wait_for_timeout(5000)
            await page.screenshot(path="/tmp/quiver_r3_pos_salvar.png", full_page=True)

            # 7. Verifica resultado
            texto_final = ""
            for frame in page.frames:
                try:
                    t = await frame.evaluate("document.body.innerText")
                    if any(k in t.lower() for k in ["sucesso", "salvo", "alterado", "atualizado", "erro", "inválid"]):
                        texto_final = t[:300]
                        break
                except Exception:
                    pass

            logger.info(f"Resultado: {texto_final[:150]}")

            if any(k in texto_final.lower() for k in ["erro", "inválid", "falha"]):
                raise RuntimeError(f"Erro ao salvar: {texto_final[:200]}")

            return {
                "status": "sucesso",
                "credenciais_com_erro": [],
                "mensagem": f"Credencial '{seguradora_nome}' atualizada no Quiver com sucesso.",
            }

        except Exception as exc:
            logger.error(f"Erro: {exc}", exc_info=True)
            return {
                "status": "erro",
                "credenciais_com_erro": [],
                "mensagem": str(exc),
            }
        finally:
            await browser.close()

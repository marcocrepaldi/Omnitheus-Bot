"""
Robô 3 — Quiver: Atualiza Senha de Seguradora via API da Central de Senhas

Fluxo:
  1. Login no Quiver (reCAPTCHA via 2captcha)
  2. Abre Central de Senhas para estabelecer sessão
  3. Chama APIs diretamente (sem clicar em elementos):
     - GET credenciaisSeguradora → obtém objeto completo da credencial
     - PUT credenciaisSeguradoraFila → salva nova senha

Credenciais (injetadas pelo scheduler):
    HARPER_URL      — URL raiz do Quiver
    HARPER_USER     — Usuário Quiver
    HARPER_PASS     — Senha Quiver
    TWOCAPTCHA_KEY  — Chave 2captcha
    SEGURADORA_NOME — Nome da seguradora (ex: SUHAI)
    SEGURADORA_PASS — Nova senha a salvar no Quiver

Mapeamento de seguradoras conhecidas (ciaCodigo):
    SUHAI → 4952
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

# Mapeamento nome → ciaCodigo (adicionar novas seguradoras aqui)
CIA_CODIGOS: dict[str, int] = {
    "SUHAI": 4952,
    "BRADESCO": 5177,
    "ALLIANZ": 5177,
    # Adicionar mais conforme necessário
}


def _solve_captcha_sync(captcha_key: str, url: str) -> str:
    solver = TwoCaptcha(captcha_key)
    return solver.recaptcha(sitekey=RECAPTCHA_KEY, url=url)["code"]


async def executar() -> dict:
    harper_url      = os.getenv("HARPER_URL", "https://harper.corretor-online.com.br/")
    harper_user     = os.getenv("HARPER_USER")
    harper_pass     = os.getenv("HARPER_PASS")
    captcha_key     = os.getenv("TWOCAPTCHA_KEY")
    seguradora_nome = os.getenv("SEGURADORA_NOME", "SUHAI").upper()
    seguradora_pass = os.getenv("SEGURADORA_PASS")

    if not all([harper_user, harper_pass, captcha_key, seguradora_pass]):
        return {"status": "erro", "credenciais_com_erro": [],
                "mensagem": "Credenciais incompletas. Configure HARPER_USER, HARPER_PASS, TWOCAPTCHA_KEY e SEGURADORA_PASS."}

    logger.info(f"Iniciando Robô 3 | Quiver: {harper_user} | Seguradora: {seguradora_nome}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        try:
            # ── 1. Login no Quiver ─────────────────────────────────────────
            parsed    = urllib.parse.urlparse(harper_url)
            login_url = f"{parsed.scheme}://{parsed.netloc}/"
            slug      = (parsed.hostname or "").split(".")[0].upper()

            logger.info(f"Login Quiver: {login_url}")
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
                document.getElementById('Corretor').value  = '{slug}';
                document.getElementById('Corretor2').value = '{slug}';
                document.getElementById('Usuario').value   = '{harper_user}';
                document.getElementById('Senha').value     = '{harper_pass}';
                document.getElementById('btnEntrar').click();
            """)
            try:
                await page.wait_for_url(lambda u: u != login_url, timeout=30000)
            except Exception:
                pass
            await page.wait_for_load_state("networkidle", timeout=60000)
            await page.wait_for_timeout(5000)
            logger.info(f"Pós-login: {page.url}")

            # ── 2. Abre Central de Senhas ──────────────────────────────────
            for frame in page.frames:
                try:
                    ok = await frame.evaluate("""() => {
                        if (typeof SelecionaModuloJQuery === 'function') {
                            SelecionaModuloJQuery(
                                'Fast/FrmAjaxBootstrap.aspx?pagina=AreaSeguradorasArquivos',
                                'AREA_SEGURADORAS','Professional',
                                'AREA_SEGURADORAS','Área de seguradoras');
                            return true;
                        }
                        return false;
                    }""")
                    if ok:
                        break
                except Exception:
                    pass
            await page.wait_for_load_state("networkidle", timeout=30000)
            await page.wait_for_timeout(3000)

            for frame in page.frames:
                el = await frame.query_selector('[id="acoes-pagina"]')
                if el:
                    try: await el.click()
                    except Exception: await el.click(force=True)
                    break
            await page.wait_for_timeout(2000)

            for frame in page.frames:
                el = await frame.query_selector('[id="btConfiguracoes"] a button') \
                     or await frame.query_selector('[id="btConfiguracoes"]')
                if el:
                    try: await el.click()
                    except Exception: await el.click(force=True)
                    break
            await page.wait_for_timeout(10000)

            cs_frame = next((f for f in page.frames if "centralsenhas.quiver" in f.url), None)
            if not cs_frame:
                raise RuntimeError(f"Frame Central de Senhas não encontrado. Frames: {[f.url for f in page.frames]}")

            logger.info(f"Central de Senhas carregada: {cs_frame.url}")

            # ── 3. Resolve ciaCodigo ───────────────────────────────────────
            cia_codigo = CIA_CODIGOS.get(seguradora_nome)
            if not cia_codigo:
                # Busca via API
                logger.info("Buscando ciaCodigo via API...")
                cia_codigo = await cs_frame.evaluate(f"""async () => {{
                    const r = await fetch('/centralSenhas/4FEA614E6E3045D59FE2E2A6D3393AC4/relacao/seguradorasConfiguradas?fila=ColCentralSenhas');
                    const d = await r.json();
                    const s = (d.mensagem||[]).find(x => (x.ciaNome||'').toUpperCase().includes('{seguradora_nome}'));
                    return s ? s.ciaCodigo : null;
                }}""")
                if not cia_codigo:
                    raise RuntimeError(f"Seguradora '{seguradora_nome}' não encontrada na Central de Senhas.")
                logger.info(f"ciaCodigo encontrado via API: {cia_codigo}")
            else:
                logger.info(f"ciaCodigo do mapeamento: {cia_codigo}")

            # ── 4. Seleciona seguradora e obtém credencial via Angular scope ──
            logger.info(f"Selecionando {seguradora_nome} (ciaCodigo={cia_codigo}) via Angular...")
            sel_ok = await cs_frame.evaluate(f"""
            (function() {{
                var els = document.querySelectorAll('[ng-click="selecionarSeguradora(seguradora.ciaCodigo)"]');
                for (var i = 0; i < els.length; i++) {{
                    var s = angular.element(els[i]).scope();
                    if (s && s.seguradora && s.seguradora.ciaCodigo == {cia_codigo}) {{
                        s.selecionarSeguradora({cia_codigo});
                        s.$apply();
                        return 'OK';
                    }}
                }}
                return 'nao_encontrou';
            }})()
            """)
            logger.info(f"Seleção: {sel_ok}")
            await page.wait_for_timeout(3000)

            # Abre form de edição via scope
            cred_json = await cs_frame.evaluate("""
            (function() {
                var btns = document.querySelectorAll('[ng-click="editarCredencial(credencial)"]');
                if (btns.length === 0) return null;
                var s = angular.element(btns[0]).scope();
                s.editarCredencial(s.credencial);
                s.$apply();
                return JSON.stringify(s.credencial);
            })()
            """)
            if not cred_json:
                raise RuntimeError(f"Credencial da {seguradora_nome} não encontrada no painel. Verifique se ela está configurada.")

            import json as _json
            cred = _json.loads(cred_json)
            id_cred = cred.get("idCredencial")
            logger.info(f"Credencial obtida: idCredencial={id_cred} usuario={cred.get('usuarioCredencial')}")

            # ── 4.1 NORMALIZA CHECKBOXES INDETERMINADOS ─────────────────────
            # Quando a senha expira no portal, o Quiver marca os checkboxes
            # como 'X' (estado amarelo/indeterminado). O PUT precisa receber
            # 'S' (sim) ou 'N' (não) para que o backend aceite a atualização.
            # ng-true-value="S" / ng-false-value="N" / ng-indeterminate-value="X"
            CAMPOS_CHECKBOX = [
                "comissaoCredencial", "emissaoCredencial", "propostaCredencial",
                "parcelasCredencial", "calculoCredencial", "loginAutomaticoCredencial",
                "credencialPadrao", "integracoesCredencial", "sinistroCredencial",
            ]
            normalizados = []
            for campo in CAMPOS_CHECKBOX:
                if cred.get(campo) in ("X", None):
                    valor_anterior = cred.get(campo)
                    # Para os 7 checkboxes principais, 'S' (sim) preserva a funcionalidade
                    # ativa que o usuário esperava. integracoes/sinistro default = 'N'.
                    novo = "N" if campo in ("integracoesCredencial", "sinistroCredencial") else "S"
                    cred[campo] = novo
                    normalizados.append(f"{campo}: {valor_anterior} → {novo}")

            if normalizados:
                logger.warning(
                    f"⚠️  {len(normalizados)} checkbox(es) indeterminado(s) detectados (estado amarelo) — normalizando:\n   "
                    + "\n   ".join(normalizados)
                )
            else:
                logger.info("Todos os checkboxes em estado válido (S/N).")

            await page.wait_for_timeout(3000)

            # ── 5. Atualiza senha via PUT direto na API ─────────────────────
            logger.info(f"Atualizando senha via API PUT (idCredencial={id_cred})...")
            nova_senha_escaped = seguradora_pass.replace("'", "\\'").replace('"', '\\"')

            resultado_put = await cs_frame.evaluate(f"""
            async function() {{
                // Monta payload limpo (remove propriedades internas do AngularJS como $$hashKey)
                var cred = {_json.dumps(cred)};
                cred.senhaCredencial = "{nova_senha_escaped}";

                // Remove todas as chaves que começam com $$ (Angular internals)
                var payload = {{}};
                for (var k in cred) {{
                    if (!k.startsWith('$$') && cred.hasOwnProperty(k)) {{
                        var val = cred[k];
                        // Limpa arrays de sub-objetos também
                        if (Array.isArray(val)) {{
                            val = val.map(function(item) {{
                                if (item && typeof item === 'object') {{
                                    var clean = {{}};
                                    for (var kk in item) {{
                                        if (!kk.startsWith('$$') && item.hasOwnProperty(kk)) clean[kk] = item[kk];
                                    }}
                                    return clean;
                                }}
                                return item;
                            }});
                        }}
                        payload[k] = val;
                    }}
                }}

                var resp = await fetch(
                    '/credenciais/4FEA614E6E3045D59FE2E2A6D3393AC4/credenciaisSeguradoraFila',
                    {{
                        method: 'PUT',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ data: payload }})
                    }}
                );
                var txt = await resp.text();
                return {{ status: resp.status, body: txt.substring(0, 300) }};
            }}()
            """)

            logger.info(f"Resposta PUT: {resultado_put}")
            status_put = resultado_put.get("status") if isinstance(resultado_put, dict) else 0
            body_put   = resultado_put.get("body", "") if isinstance(resultado_put, dict) else str(resultado_put)

            if status_put not in (200, 201, 204):
                raise RuntimeError(f"PUT falhou (status={status_put}): {body_put}")

            logger.info(f"✅ Senha de {seguradora_nome} atualizada no Quiver com sucesso!")
            msg_norm = f" · {len(normalizados)} checkbox(es) indeterminados foram normalizados (S/N)" if normalizados else ""
            return {
                "status": "sucesso",
                "credenciais_com_erro": [],
                "mensagem": f"Credencial '{seguradora_nome}' atualizada no Quiver (idCredencial={id_cred}){msg_norm}.",
            }

        except Exception as exc:
            logger.error(f"Erro: {exc}", exc_info=True)
            return {"status": "erro", "credenciais_com_erro": [], "mensagem": str(exc)}
        finally:
            await browser.close()

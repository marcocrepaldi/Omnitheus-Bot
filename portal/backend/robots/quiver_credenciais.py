import asyncio
import os
import smtplib
import logging
import concurrent.futures
import urllib.request
import json
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from playwright.async_api import async_playwright
from twocaptcha import TwoCaptcha

RECAPTCHA_KEY = "6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI"

# Credenciais lidas sempre em runtime (dentro das funções) para capturar
# os valores injetados pelo scheduler por tenant. Não use variáveis de módulo.

logger = logging.getLogger("robot.quiver")
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s [robot.quiver] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)


def send_email(subject: str, body: str):
    """
    Envia e-mail para EMAIL_TO. Suporta múltiplos destinatários separados por
    vírgula ou ponto-e-vírgula. Ex: "ti@empresa.com, danubia@empresa.com"
    """
    email_host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    email_port = int(os.getenv("EMAIL_PORT", 587))
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASS")
    email_to   = os.getenv("EMAIL_TO")

    if not all([email_host, email_user, email_pass, email_to]):
        logger.info(f"[E-MAIL DESATIVADO] {subject} | EMAIL_TO={email_to} EMAIL_USER={email_user}")
        return

    # Suporta múltiplos destinatários — separados por vírgula ou ponto-e-vírgula
    destinatarios = [e.strip() for e in email_to.replace(";", ",").split(",") if e.strip()]
    logger.info(f"Enviando e-mail para {destinatarios} | de {email_user} | assunto: {subject}")

    msg = MIMEMultipart()
    msg["From"]    = email_user
    msg["To"]      = ", ".join(destinatarios)
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(email_host, email_port) as server:
            server.ehlo()
            server.starttls()
            server.login(email_user, email_pass)
            falhas = server.send_message(msg, to_addrs=destinatarios)
        if falhas:
            logger.error(f"E-mail FALHOU para {falhas} — outros enviados OK")
        else:
            logger.info(f"E-mail aceito pelo SMTP para todos os destinatários (250 OK)")
    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"E-mail REJEITADO: destinatários recusados — {e.recipients}")
    except smtplib.SMTPResponseException as e:
        logger.error(f"E-mail erro SMTP {e.smtp_code}: {e.smtp_error}")
    except Exception as e:
        logger.error(f"E-mail erro inesperado: {type(e).__name__}: {e}")


def _solve_captcha_sync(captcha_key: str, url: str, sitekey: str) -> str:
    solver = TwoCaptcha(captcha_key)
    result = solver.recaptcha(sitekey=sitekey, url=url)
    return result["code"]


async def solve_recaptcha(page, captcha_key: str, url: str, sitekey: str) -> str:
    if not captcha_key:
        raise ValueError("TWOCAPTCHA_KEY não configurado. Salve as credenciais em /credenciais.")
    logger.info("Enviando reCAPTCHA para 2captcha (aguarde ~30s)...")
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        token = await loop.run_in_executor(pool, _solve_captcha_sync, captcha_key, url, sitekey)
    if token.startswith("ERROR_"):
        raise ValueError(f"Erro 2captcha: {token}. Verifique a chave em /credenciais.")
    await page.evaluate(
        f"document.getElementById('g-recaptcha-response').value = '{token}'"
    )
    logger.info("Token reCAPTCHA injetado.")
    return token


async def executar() -> dict:
    """
    Executa o robô e retorna:
    {
        "status": "sucesso" | "falha" | "erro",
        "credenciais_com_erro": [...],
        "mensagem": "..."
    }
    """
    # Relê as credenciais do ambiente a cada execução (injetadas pelo scheduler)
    harper_url  = os.getenv("HARPER_URL", "https://harper.corretor-online.com.br/")
    harper_user = os.getenv("HARPER_USER")
    harper_pass = os.getenv("HARPER_PASS")
    captcha_key = os.getenv("TWOCAPTCHA_KEY")
    recaptcha_key = "6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI"

    logger.info(f"Iniciando robô Quiver | URL: {harper_url} | usuário: {harper_user}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        try:
            import urllib.parse
            parsed        = urllib.parse.urlparse(harper_url)
            host          = parsed.hostname or ""
            corretor_slug = host.split(".")[0].upper()
            # Sempre faz login na URL raiz do sistema (ex: https://harper.corretor-online.com.br/)
            login_url = f"{parsed.scheme}://{parsed.netloc}/"
            logger.info(f"URL de login: {login_url} | slug: {corretor_slug}")

            await page.goto(login_url, wait_until="networkidle")

            token = await solve_recaptcha(page, captcha_key, login_url, recaptcha_key)

            logger.info("Efetuando login...")

            # Verifica quais frames têm o botão de login
            login_frame = None
            for frame in page.frames:
                try:
                    has_btn = await frame.evaluate(
                        "!!document.getElementById('btnEntrar')"
                    )
                    logger.info(f"Frame {frame.url} tem btnEntrar: {has_btn}")
                    if has_btn:
                        login_frame = frame
                        break
                except Exception as fe:
                    logger.debug(f"Frame {frame.url} inacessível: {fe}")

            if login_frame is None:
                login_frame = page.main_frame

            logger.info(f"Usando frame para login: {login_frame.url}")

            await login_frame.evaluate(
                f"""
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
                """
            )

            # Aguarda navegação ou mudança de conteúdo (SPAs não mudam URL)
            try:
                await page.wait_for_url(lambda url: url != login_url, timeout=30000)
            except Exception:
                pass
            await page.wait_for_load_state("networkidle", timeout=60000)
            await page.wait_for_timeout(5000)
            logger.info(f"Pós-login: {page.url}")

            # Aguarda qualquer frame carregar conteúdo do quiver (até 20s)
            for _ in range(20):
                await page.wait_for_timeout(1000)
                urls = [f.url for f in page.frames]
                if any("quiver" in u and "iframe-login" not in u and "recaptcha" not in u for u in urls):
                    break
            logger.info(f"Frames disponíveis: {[f.url for f in page.frames]}")

            # ── Área Seguradora — chama o onclick diretamente (elemento pode estar oculto) ──
            async def clicar_seguradora() -> bool:
                for frame in page.frames:
                    # 1) Tenta via JavaScript direto no onclick (mais confiável em headless)
                    try:
                        invocou = await frame.evaluate("""
                            (() => {
                                var links = document.querySelectorAll('#navSide a');
                                for (var i = 0; i < links.length; i++) {
                                    var txt = links[i].innerText || links[i].textContent || '';
                                    var onclick = links[i].getAttribute('onclick') || '';
                                    if (txt.toLowerCase().includes('seguradora') ||
                                        onclick.toLowerCase().includes('seguradora')) {
                                        links[i].click();
                                        return true;
                                    }
                                }
                                // Fallback: chama SelecionaModuloJQuery diretamente
                                if (typeof SelecionaModuloJQuery === 'function') {
                                    SelecionaModuloJQuery(
                                        'Fast/FrmAjaxBootstrap.aspx?pagina=AreaSeguradorasArquivos',
                                        'AREA_SEGURADORAS','Professional',
                                        'AREA_SEGURADORAS','Área de seguradoras'
                                    );
                                    return true;
                                }
                                return false;
                            })()
                        """)
                        if invocou:
                            logger.info(f"Clicou Área Seguradora via JS (frame {frame.url})")
                            return True
                    except Exception as fe:
                        logger.debug(f"JS click falhou em {frame.url}: {fe}")

                    # 2) Fallback: force click ignorando visibilidade
                    for n in range(4, 12):
                        el = await frame.query_selector(f"#navSide > div:nth-child({n}) > a")
                        if el:
                            try:
                                text = (await el.inner_text()).strip().lower()
                                if "seguradora" in text:
                                    await el.click(force=True)
                                    logger.info(f"Force-clicou Área Seguradora child {n}")
                                    return True
                            except Exception:
                                pass
                return False

            clicou = await clicar_seguradora()
            if not clicou:
                raise RuntimeError("Não foi possível navegar para Área Seguradora.")

            await page.wait_for_load_state("networkidle", timeout=30000)
            await page.wait_for_timeout(3000)

            # ── Menu Ações — force click ou JS ──────────────────────────────
            for frame in page.frames:
                el = await frame.query_selector('[id="acoes-pagina"]')
                if el:
                    try:
                        await el.click()
                    except Exception:
                        await el.click(force=True)
                    logger.info(f"Clicou em #acoes-pagina: {frame.url}")
                    break
            await page.wait_for_timeout(2000)

            # ── Central de Senhas — force click ou JS ────────────────────────
            for frame in page.frames:
                el = await frame.query_selector('[id="btConfiguracoes"] a button') \
                     or await frame.query_selector('[id="btConfiguracoes"]')
                if el:
                    try:
                        await el.click()
                    except Exception:
                        await el.click(force=True)
                    logger.info("Clicou em Central de Senhas.")
                    break
            await page.wait_for_timeout(8000)

            # Coletar credenciais com erro
            credenciais_com_erro = []
            for frame in page.frames:
                if "centralsenhas.quiver" in frame.url:
                    nomes = await frame.evaluate(
                        """
                        Array.from(document.querySelectorAll('.cia-com-erro')).map(el => {
                            var p = el.closest('.col-lg-2, .col-md-2, .col-sm-4');
                            return p ? p.innerText.trim() : null;
                        }).filter(Boolean);
                        """
                    )
                    credenciais_com_erro = nomes
                    break

            if credenciais_com_erro:
                lista = "\n".join(f"  - {n}" for n in credenciais_com_erro)
                logger.warning(f"FALHA em {len(credenciais_com_erro)} credencial(is):\n{lista}")
                send_email(
                    subject=f"[ALERTA] {len(credenciais_com_erro)} credencial(is) Quiver inválida(s)",
                    body=(
                        f"Credenciais com falha:\n\n{lista}\n\n"
                        f"Data/hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n"
                        f"Acesse: https://centralsenhas.quiver.net.br/#/credenciais"
                    )
                )
                return {"status": "falha", "credenciais_com_erro": credenciais_com_erro, "mensagem": None}
            else:
                logger.info("Todas as credenciais OK.")
                return {"status": "sucesso", "credenciais_com_erro": [], "mensagem": None}

        except Exception as exc:
            logger.error(f"Erro inesperado: {exc}", exc_info=True)
            return {"status": "erro", "credenciais_com_erro": [], "mensagem": str(exc)}
        finally:
            await browser.close()

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

HARPER_URL    = "https://harper.corretor-online.com.br/"
HARPER_USER   = os.getenv("HARPER_USER")
HARPER_PASS   = os.getenv("HARPER_PASS")
CAPTCHA_KEY   = os.getenv("TWOCAPTCHA_KEY")
EMAIL_HOST    = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT    = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER    = os.getenv("EMAIL_USER")
EMAIL_PASS    = os.getenv("EMAIL_PASS")
EMAIL_TO      = os.getenv("EMAIL_TO")
RECAPTCHA_KEY = "6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI"

logger = logging.getLogger("robot.quiver")
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s [robot.quiver] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)


def send_email(subject: str, body: str):
    if not all([EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_TO]):
        logger.info(f"[E-MAIL DESATIVADO] {subject}")
        return
    msg = MIMEMultipart()
    msg["From"]    = EMAIL_USER
    msg["To"]      = EMAIL_TO
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))
    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)


def _solve_captcha_sync() -> str:
    solver = TwoCaptcha(CAPTCHA_KEY)
    result = solver.recaptcha(sitekey=RECAPTCHA_KEY, url=HARPER_URL)
    return result["code"]


async def solve_recaptcha(page) -> str:
    logger.info("Enviando reCAPTCHA para 2captcha (aguarde ~30s)...")
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        token = await loop.run_in_executor(pool, _solve_captcha_sync)
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
    logger.info("Iniciando robô Quiver...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        try:
            await page.goto(HARPER_URL, wait_until="networkidle")

            token = await solve_recaptcha(page)

            logger.info("Efetuando login...")
            await page.evaluate(
                f"""
                document.getElementById('g-recaptcha-response').value = '{token}';
                document.getElementById('Corretor').value  = 'HARPER';
                document.getElementById('Corretor2').value = 'HARPER';
                document.getElementById('Usuario').value   = '{HARPER_USER}';
                document.getElementById('Senha').value     = '{HARPER_PASS}';
                document.getElementById('btnEntrar').click();
                """
            )
            try:
                await page.wait_for_url(
                    lambda url: "harper.corretor-online.com.br" in url and url != HARPER_URL,
                    timeout=60000
                )
            except Exception:
                pass
            await page.wait_for_load_state("networkidle", timeout=60000)
            await page.wait_for_timeout(5000)
            logger.info(f"Pós-login: {page.url}")

            # Área Seguradora
            await page.locator("#navSide > div:nth-child(7) > a").click()
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

            # Menu Ações — busca em todos os frames
            for frame in page.frames:
                el = await frame.query_selector('[id="acoes-pagina"]')
                if el:
                    await el.click()
                    logger.info(f"Clicou em #acoes-pagina: {frame.url}")
                    break
            await page.wait_for_timeout(2000)

            # Central de Senhas — busca em todos os frames
            for frame in page.frames:
                el = await frame.query_selector('[id="btConfiguracoes"] a button') \
                     or await frame.query_selector('[id="btConfiguracoes"]')
                if el:
                    await el.click()
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

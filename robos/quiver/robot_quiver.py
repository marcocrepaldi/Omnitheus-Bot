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
from dotenv import load_dotenv

load_dotenv()

HARPER_URL    = "https://harper.corretor-online.com.br/"
HARPER_USER   = os.getenv("HARPER_USER")
HARPER_PASS   = os.getenv("HARPER_PASS")
CAPTCHA_KEY   = os.getenv("TWOCAPTCHA_KEY")
EMAIL_HOST    = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT    = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER    = os.getenv("EMAIL_USER")
EMAIL_PASS    = os.getenv("EMAIL_PASS")
EMAIL_TO      = os.getenv("EMAIL_TO")
PORTAL_API    = os.getenv("PORTAL_API", "http://localhost:8000")
ROBO_ID       = int(os.getenv("ROBO_ID", "1"))
RECAPTCHA_KEY = "6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI"

logging.basicConfig(
    filename="robot_quiver.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    encoding="utf-8"
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger().addHandler(console)


def send_email(subject: str, body: str):
    if not all([EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_TO]):
        logging.info(f"[E-MAIL DESATIVADO] {subject}")
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


def reportar_portal(status: str, credenciais_com_erro: list, mensagem: str = None):
    try:
        payload = json.dumps({
            "robo_id": ROBO_ID,
            "status": status,
            "credenciais_com_erro": credenciais_com_erro,
            "total_erros": len(credenciais_com_erro),
            "mensagem": mensagem,
            "finalizado_em": datetime.now(timezone.utc).isoformat()
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{PORTAL_API}/execucoes/",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req, timeout=10)
        logging.info(f"Execução reportada ao portal: {status}")
    except Exception as e:
        logging.warning(f"Não foi possível reportar ao portal: {e}")


def _solve_captcha_sync() -> str:
    solver = TwoCaptcha(CAPTCHA_KEY)
    result = solver.recaptcha(sitekey=RECAPTCHA_KEY, url=HARPER_URL)
    return result["code"]


async def solve_recaptcha(page) -> str:
    logging.info("Enviando reCAPTCHA para 2captcha (aguarde ~30s)...")
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        token = await loop.run_in_executor(pool, _solve_captcha_sync)
    await page.evaluate(
        f"document.getElementById('g-recaptcha-response').value = '{token}'"
    )
    logging.info("Token reCAPTCHA injetado com sucesso.")
    return token


async def run_robot():
    logging.info("=" * 60)
    logging.info(f"Iniciando robô Quiver - {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        try:
            await page.goto(HARPER_URL, wait_until="networkidle")

            token = await solve_recaptcha(page)

            logging.info("Efetuando login...")
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
            logging.info(f"Pós-login: {page.url}")

            # Área Seguradora
            await page.locator("#navSide > div:nth-child(7) > a").click()
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

            # Menu Ações
            for frame in page.frames:
                el = await frame.query_selector('[id="acoes-pagina"]')
                if el:
                    await el.click()
                    break
            await page.wait_for_timeout(2000)

            # Central de Senhas
            for frame in page.frames:
                el = await frame.query_selector('[id="btConfiguracoes"] a button') \
                     or await frame.query_selector('[id="btConfiguracoes"]')
                if el:
                    await el.click()
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
                logging.warning(f"FALHA em {len(credenciais_com_erro)} credencial(is):\n{lista}")
                reportar_portal("falha", credenciais_com_erro)
                send_email(
                    subject=f"[ALERTA] {len(credenciais_com_erro)} credencial(is) Quiver inválida(s) - Harper Seguros",
                    body=(
                        f"O robô identificou falha nas seguintes credenciais do Quiver:\n\n"
                        f"{lista}\n\n"
                        f"Total: {len(credenciais_com_erro)} seguradora(s) com erro\n\n"
                        f"Data/hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n"
                        f"Acesse: https://centralsenhas.quiver.net.br/#/credenciais"
                    )
                )
                logging.info("E-mail de alerta enviado para " + EMAIL_TO)
            else:
                reportar_portal("sucesso", [])
                logging.info("Credencial Quiver OK - nenhuma falha detectada.")

        except Exception as exc:
            logging.error(f"Erro inesperado: {exc}", exc_info=True)
            reportar_portal("erro", [], str(exc))
            try:
                send_email(
                    subject="[ERRO] Robô Quiver falhou na execução",
                    body=(
                        f"O robô encontrou um erro durante a execução.\n\n"
                        f"Erro: {exc}\n\n"
                        f"Data/hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
                    )
                )
            except Exception:
                logging.error("Falha também ao enviar e-mail de erro.")
        finally:
            await browser.close()
            logging.info("Browser fechado. Execução finalizada.")


if __name__ == "__main__":
    asyncio.run(run_robot())

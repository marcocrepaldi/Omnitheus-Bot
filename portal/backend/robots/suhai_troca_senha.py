import asyncio
import os
import logging

from playwright.async_api import async_playwright

logger = logging.getLogger("robot.suhai")
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s [robot.suhai] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)

SUHAI_URL = "https://i4pro.suhaiseguradora.com.br/Default.aspx"
CHANGE_PATH = "Default.aspx?eng_idtela=-344&eng_idmenu=-18&eng_idmodulo=0&eng_detalhe=s"


async def executar() -> dict:
    """
    Troca a senha do portal SUHAI Seguradora.

    Credenciais necessárias (injetadas pelo scheduler):
        SUHAI_USER     — login do usuário no portal SUHAI
        SUHAI_PASS     — senha ATUAL
        SUHAI_NEW_PASS — nova senha a definir

    Retorna:
        {"status": "sucesso"|"erro", "credenciais_com_erro": [], "mensagem": "..."}
    """
    suhai_user    = os.getenv("SUHAI_USER")
    suhai_pass    = os.getenv("SUHAI_PASS")
    suhai_new_pass = os.getenv("SUHAI_NEW_PASS")

    if not all([suhai_user, suhai_pass, suhai_new_pass]):
        return {
            "status": "erro",
            "credenciais_com_erro": [],
            "mensagem": "Credenciais incompletas. Configure SUHAI_USER, SUHAI_PASS e SUHAI_NEW_PASS em /credenciais.",
        }

    logger.info(f"Iniciando robô SUHAI | usuário: {suhai_user}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # ── 1. Login ──────────────────────────────────────────────────────
            logger.info("Acessando portal SUHAI...")
            await page.goto(SUHAI_URL, wait_until="networkidle")
            await page.wait_for_timeout(2000)

            await page.fill("#cd_usuario", suhai_user)
            await page.fill("#nm_senha", suhai_pass)
            await page.click("#botaoEntrar")
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

            # Verifica se login foi bem-sucedido (tela de senha aparece na URL logada)
            if "Default.aspx?" not in page.url and "Default.aspx" not in page.url:
                raise RuntimeError(f"Login falhou. URL: {page.url}")

            logger.info(f"Login OK | URL: {page.url}")

            # ── 2. Navega para Alterar Senha via JS ───────────────────────────
            logger.info("Navegando para tela de Alterar Senha...")
            await page.evaluate(
                f"ConfirmaPaginaMenu(null, '{CHANGE_PATH}', '_self', 'Segurança')"
            )
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

            # ── 3. Localiza o frame da tela de troca de senha ─────────────────
            senha_frame = None
            for frame in page.frames:
                if "eng_idtela=-344" in frame.url:
                    senha_frame = frame
                    break

            if not senha_frame:
                raise RuntimeError(
                    "Frame de troca de senha não encontrado. "
                    f"Frames disponíveis: {[f.url for f in page.frames]}"
                )

            logger.info(f"Frame encontrado: {senha_frame.url}")

            # ── 4. Preenche o formulário ──────────────────────────────────────
            await senha_frame.fill("#nm_senha_atual", suhai_pass)
            await senha_frame.fill("#nm_senha", suhai_new_pass)
            await senha_frame.fill("#nm_senha_confirma", suhai_new_pass)
            logger.info("Formulário preenchido. Clicando em Alterar Senha...")

            await senha_frame.click("#TRBTNC_-2321")
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

            # ── 5. Verifica resultado ─────────────────────────────────────────
            # Captura mensagens de sucesso ou erro na página
            resultado_texto = ""
            for frame in page.frames:
                try:
                    texto = await frame.evaluate("document.body.innerText")
                    if any(k in texto.lower() for k in ["sucesso", "alterada", "alterado", "erro", "inválid", "incorret"]):
                        resultado_texto = texto[:300]
                        break
                except Exception:
                    pass

            logger.info(f"Texto pós-alteração: {resultado_texto[:150]}")

            if any(k in resultado_texto.lower() for k in ["erro", "inválid", "incorret", "falha"]):
                raise RuntimeError(f"Erro ao alterar senha: {resultado_texto[:200]}")

            logger.info("Senha SUHAI alterada com sucesso!")
            return {
                "status": "sucesso",
                "credenciais_com_erro": [],
                "mensagem": f"Senha do usuário {suhai_user} alterada com sucesso no portal SUHAI.",
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

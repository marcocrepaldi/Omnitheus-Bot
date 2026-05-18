"""Dump completo do HTML da tela de edição."""
import asyncio, os, concurrent.futures
from datetime import datetime
from twocaptcha import TwoCaptcha
from playwright.async_api import async_playwright

OUT = f"/tmp/quiver_dump_{datetime.now():%Y%m%d_%H%M%S}"
os.makedirs(OUT, exist_ok=True)
print(f"📂 {OUT}")


def _solve(key, url):
    return TwoCaptcha(key).recaptcha(sitekey="6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI", url=url)["code"]


async def main():
    URL  = "https://harper.corretor-online.com.br/"
    USR  = os.getenv("HARPER_USER")
    PWD  = os.getenv("HARPER_PASS")
    CKEY = os.getenv("TWOCAPTCHA_KEY")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(viewport={"width": 1600, "height": 900})

        # Login
        await page.goto(URL, wait_until="networkidle")
        with concurrent.futures.ThreadPoolExecutor() as pool:
            token = await asyncio.get_event_loop().run_in_executor(pool, _solve, CKEY, URL)
        await page.evaluate(f"""
            var cr = document.getElementById('g-recaptcha-response');
            if (cr) cr.value = '{token}';
            document.getElementById('Corretor').value  = 'HARPER';
            document.getElementById('Corretor2').value = 'HARPER';
            document.getElementById('Usuario').value   = '{USR}';
            document.getElementById('Senha').value     = '{PWD}';
            document.getElementById('btnEntrar').click();
        """)
        try: await page.wait_for_url(lambda u: u != URL, timeout=30000)
        except: pass
        await page.wait_for_load_state("networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        # Central de senhas
        for frame in page.frames:
            try:
                if await frame.evaluate("typeof SelecionaModuloJQuery === 'function'"):
                    await frame.evaluate("""SelecionaModuloJQuery('Fast/FrmAjaxBootstrap.aspx?pagina=AreaSeguradorasArquivos','AREA_SEGURADORAS','Professional','AREA_SEGURADORAS','Área de seguradoras')""")
                    break
            except: pass
        await page.wait_for_timeout(3000)
        for f in page.frames:
            el = await f.query_selector('[id="acoes-pagina"]')
            if el:
                try: await el.click()
                except: await el.click(force=True)
                break
        await page.wait_for_timeout(2000)
        for f in page.frames:
            el = await f.query_selector('[id="btConfiguracoes"] a button') or await f.query_selector('[id="btConfiguracoes"]')
            if el:
                try: await el.click()
                except: await el.click(force=True)
                break
        await page.wait_for_timeout(10000)
        cs_frame = next((f for f in page.frames if "centralsenhas.quiver" in f.url), None)

        # Seleciona SUHAI
        await cs_frame.evaluate("""
            var els = document.querySelectorAll('[ng-click="selecionarSeguradora(seguradora.ciaCodigo)"]');
            for (var i=0; i<els.length; i++) {
                var s = angular.element(els[i]).scope();
                if (s && s.seguradora && s.seguradora.ciaCodigo == 4952) { s.selecionarSeguradora(4952); s.$apply(); break; }
            }
        """)
        await page.wait_for_timeout(4000)

        # Abre edição
        await cs_frame.evaluate("""
            var btns = document.querySelectorAll('[ng-click="editarCredencial(credencial)"]');
            if (btns.length > 0) {
                var s = angular.element(btns[0]).scope();
                s.editarCredencial(s.credencial);
                s.$apply();
            }
        """)
        await page.wait_for_timeout(6000)

        # Dump completo
        html = await cs_frame.content()
        with open(f"{OUT}/frame_completo.html", "w") as f:
            f.write(html)
        print(f"✅ HTML completo: {len(html)} chars")

        await page.screenshot(path=f"{OUT}/screen.png", full_page=True)

        # Lista TODOS ng-* attributes únicos
        ng_attrs = await cs_frame.evaluate("""
            var counts = {};
            document.querySelectorAll('*').forEach(function(el) {
                Array.from(el.attributes).forEach(function(a) {
                    if (a.name.startsWith('ng-')) {
                        var key = a.name + '=' + a.value.substring(0, 60);
                        counts[key] = (counts[key] || 0) + 1;
                    }
                });
            });
            JSON.stringify(Object.entries(counts).sort(function(a,b){return b[1]-a[1];}).slice(0, 80));
        """)
        with open(f"{OUT}/ng_attrs_top80.json", "w") as f:
            f.write(ng_attrs)

        print("\n🏷️  Top ng-attrs:")
        import json
        for entry, cnt in json.loads(ng_attrs)[:30]:
            print(f"   {cnt:3} × {entry}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())

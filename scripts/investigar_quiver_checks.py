"""Investigação focada nos checkboxes e ícones de warning."""
import asyncio, json, os, concurrent.futures, urllib.parse
from datetime import datetime
from twocaptcha import TwoCaptcha
from playwright.async_api import async_playwright

OUT = f"/tmp/quiver_checks_{datetime.now():%Y%m%d_%H%M%S}"
os.makedirs(OUT, exist_ok=True)
print(f"📂 {OUT}")


def _solve(key, url):
    return TwoCaptcha(key).recaptcha(sitekey="6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI", url=url)["code"]


async def main():
    HARPER_URL = "https://harper.corretor-online.com.br/"
    HARPER_USER = os.getenv("HARPER_USER")
    HARPER_PASS = os.getenv("HARPER_PASS")
    CAPTCHA_KEY = os.getenv("TWOCAPTCHA_KEY")
    slug = "HARPER"

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(viewport={"width": 1600, "height": 900})

        try:
            await page.goto(HARPER_URL, wait_until="networkidle")
            with concurrent.futures.ThreadPoolExecutor() as pool:
                token = await asyncio.get_event_loop().run_in_executor(pool, _solve, CAPTCHA_KEY, HARPER_URL)
            await page.evaluate(f"""
                var cr = document.getElementById('g-recaptcha-response');
                if (cr) cr.value = '{token}';
                document.getElementById('Corretor').value  = '{slug}';
                document.getElementById('Corretor2').value = '{slug}';
                document.getElementById('Usuario').value   = '{HARPER_USER}';
                document.getElementById('Senha').value     = '{HARPER_PASS}';
                document.getElementById('btnEntrar').click();
            """)
            try: await page.wait_for_url(lambda u: u != HARPER_URL, timeout=30000)
            except: pass
            await page.wait_for_load_state("networkidle", timeout=60000)
            await page.wait_for_timeout(5000)

            for frame in page.frames:
                try:
                    if await frame.evaluate("typeof SelecionaModuloJQuery === 'function'"):
                        await frame.evaluate("""SelecionaModuloJQuery('Fast/FrmAjaxBootstrap.aspx?pagina=AreaSeguradorasArquivos','AREA_SEGURADORAS','Professional','AREA_SEGURADORAS','Área de seguradoras')""")
                        break
                except: pass
            await page.wait_for_load_state("networkidle"); await page.wait_for_timeout(3000)

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
            print(f"✅ Central: {cs_frame.url}")

            # Seleciona SUHAI + abre edição
            await cs_frame.evaluate("""
                var els = document.querySelectorAll('[ng-click="selecionarSeguradora(seguradora.ciaCodigo)"]');
                for (var i=0; i<els.length; i++) {
                    var s = angular.element(els[i]).scope();
                    if (s && s.seguradora && s.seguradora.ciaCodigo == 4952) { s.selecionarSeguradora(4952); s.$apply(); break; }
                }
            """)
            await page.wait_for_timeout(4000)

            await cs_frame.evaluate("""
                var btns = document.querySelectorAll('[ng-click="editarCredencial(credencial)"]');
                if (btns.length > 0) {
                    var s = angular.element(btns[0]).scope();
                    s.editarCredencial(s.credencial);
                    s.$apply();
                }
            """)
            await page.wait_for_timeout(5000)

            await page.screenshot(path=f"{OUT}/edicao_aberta.png", full_page=True)

            # ── ANÁLISE: localizar contexto dos icons warning ──
            print("\n🔍 Analisando ícones warning/error e seus pais...")
            yellows = await cs_frame.evaluate("""
                var results = [];
                document.querySelectorAll('.icon.warning, .icon.error, .icon.amarelo, [class*="warning"], [class*="aviso"]').forEach(function(el) {
                    var cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') return;
                    var p1 = el.parentElement;
                    var p2 = p1 ? p1.parentElement : null;
                    var p3 = p2 ? p2.parentElement : null;
                    results.push({
                        tag: el.tagName,
                        class: el.className,
                        bg: cs.backgroundColor,
                        color: cs.color,
                        text: (el.innerText||'').trim(),
                        html_pai: p1 ? p1.outerHTML.substring(0, 400) : '',
                        ng_show: el.getAttribute('ng-show') || (p1 ? p1.getAttribute('ng-show') : '') || '',
                        ng_if:   el.getAttribute('ng-if')   || (p1 ? p1.getAttribute('ng-if') : '')   || '',
                        ng_class: el.getAttribute('ng-class') || (p1 ? p1.getAttribute('ng-class') : '') || ''
                    });
                });
                JSON.stringify(results);
            """)
            print(f"   Encontrados: {yellows[:2000]}")

            # ── ANÁLISE: estrutura completa de cada check ──
            print("\n🔍 Estrutura dos checkboxes da edição...")
            checks = await cs_frame.evaluate("""
                var results = [];
                // Cada check da tela costuma ser um div com ng-class no parent
                document.querySelectorAll('[ng-model^="credencial."], [ng-model*="Credencial"]').forEach(function(el) {
                    var cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') return;
                    // Pega 3 níveis de pai
                    var p1 = el.parentElement;
                    var p2 = p1 ? p1.parentElement : null;
                    var p3 = p2 ? p2.parentElement : null;
                    var topo = p3 || p2 || p1 || el;
                    results.push({
                        ngModel: el.getAttribute('ng-model'),
                        ngClick: el.getAttribute('ng-click') || (p1 ? p1.getAttribute('ng-click') : ''),
                        value: el.value, checked: el.checked,
                        topo_html: topo.outerHTML.substring(0, 800)
                    });
                });
                JSON.stringify(results);
            """)
            print(f"\n📋 Checkboxes ng-model credencial:")
            print(checks[:5000] if checks else "vazio")

            with open(f"{OUT}/yellows.json", "w") as f: f.write(yellows or "[]")
            with open(f"{OUT}/checks.json", "w") as f: f.write(checks or "[]")

            # ── Captura todo o HTML do form de edição ──
            print("\n📄 Salvando HTML completo do form...")
            full_html = await cs_frame.evaluate("""
                // Pega o elemento que envolve TODOS os ng-models credencial
                var inputs = document.querySelectorAll('[ng-model^="credencial."]');
                if (inputs.length === 0) return 'sem inputs';
                // Sobe até achar um pai comum
                var topo = inputs[0];
                while (topo && topo.querySelectorAll('[ng-model^="credencial."]').length < inputs.length) {
                    topo = topo.parentElement;
                }
                topo ? topo.outerHTML : 'sem pai comum';
            """)
            with open(f"{OUT}/form_edicao.html", "w") as f: f.write(full_html or "")
            print(f"   {len(full_html or '')} chars salvos")

            # ── CSS de classes warning/error ──
            css_rules = await cs_frame.evaluate("""
                var rules = [];
                Array.from(document.styleSheets).forEach(function(ss) {
                    try {
                        Array.from(ss.cssRules || []).forEach(function(r) {
                            var txt = r.cssText || '';
                            if (/warning|amarelo|pendente|expir/i.test(txt)) rules.push(txt.substring(0, 250));
                        });
                    } catch(e) {}
                });
                JSON.stringify(rules.slice(0, 30));
            """)
            print(f"\n🎨 Regras CSS relacionadas:")
            print(css_rules)
            with open(f"{OUT}/css_rules.json", "w") as f: f.write(css_rules or "[]")

            print(f"\n✅ Tudo salvo em {OUT}")
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())

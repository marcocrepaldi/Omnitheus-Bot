"""
Investigação da tela de edição de credencial da SUHAI no Quiver.
"""
import asyncio, json, os
import concurrent.futures
import urllib.parse
from datetime import datetime
from twocaptcha import TwoCaptcha
from playwright.async_api import async_playwright

OUT = f"/tmp/quiver_invest_{datetime.now():%Y%m%d_%H%M%S}"
os.makedirs(OUT, exist_ok=True)
print(f"📂 {OUT}")


def _solve(key, url):
    return TwoCaptcha(key).recaptcha(sitekey="6LfkNhQdAAAAANq5pot8umKZPzZAoNT5Cpf4KWAI", url=url)["code"]


async def main():
    HARPER_URL = os.getenv("HARPER_URL", "https://harper.corretor-online.com.br/")
    HARPER_USER = os.getenv("HARPER_USER")
    HARPER_PASS = os.getenv("HARPER_PASS")
    CAPTCHA_KEY = os.getenv("TWOCAPTCHA_KEY")

    parsed    = urllib.parse.urlparse(HARPER_URL)
    login_url = f"{parsed.scheme}://{parsed.netloc}/"
    slug      = (parsed.hostname or "").split(".")[0].upper()
    print(f"login: {login_url}  slug: {slug}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(viewport={"width": 1600, "height": 900})

        dialogs = []
        async def _on_dialog(d):
            dialogs.append({"type": d.type, "message": d.message})
            print(f"🔔 ALERT: {d.type} | {d.message}")
            await d.accept()
        page.on("dialog", lambda d: asyncio.create_task(_on_dialog(d)))

        try:
            # ── Login ──
            print("➡  Login...")
            await page.goto(login_url, wait_until="networkidle")

            print("➡  Resolvendo captcha...")
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as pool:
                token = await loop.run_in_executor(pool, _solve, CAPTCHA_KEY, login_url)

            await page.evaluate(f"""
                var cr = document.getElementById('g-recaptcha-response');
                if (cr) cr.value = '{token}';
                document.getElementById('Corretor').value  = '{slug}';
                document.getElementById('Corretor2').value = '{slug}';
                document.getElementById('Usuario').value   = '{HARPER_USER}';
                document.getElementById('Senha').value     = '{HARPER_PASS}';
                document.getElementById('btnEntrar').click();
            """)
            try: await page.wait_for_url(lambda u: u != login_url, timeout=30000)
            except: pass
            await page.wait_for_load_state("networkidle", timeout=60000)
            await page.wait_for_timeout(5000)
            print(f"✅ Pós-login: {page.url}")

            # ── Navega Central de Senhas ──
            for frame in page.frames:
                try:
                    ok = await frame.evaluate("""() => {
                        if (typeof SelecionaModuloJQuery === 'function') {
                            SelecionaModuloJQuery('Fast/FrmAjaxBootstrap.aspx?pagina=AreaSeguradorasArquivos','AREA_SEGURADORAS','Professional','AREA_SEGURADORAS','Área de seguradoras');
                            return true;
                        }
                        return false;
                    }""")
                    if ok: break
                except: pass
            await page.wait_for_load_state("networkidle", timeout=30000)
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
            if not cs_frame:
                raise Exception("Central não encontrada")
            print(f"✅ Central: {cs_frame.url}")

            # ── Seleciona SUHAI ──
            sel = await cs_frame.evaluate("""
                var els = document.querySelectorAll('[ng-click="selecionarSeguradora(seguradora.ciaCodigo)"]');
                var ok = false;
                for (var i=0; i<els.length; i++) {
                    var s = angular.element(els[i]).scope();
                    if (s && s.seguradora && s.seguradora.ciaCodigo == 4952) {
                        s.selecionarSeguradora(4952); s.$apply(); ok = true; break;
                    }
                }
                ok;
            """)
            print(f"Seleção SUHAI: {sel}")
            await page.wait_for_timeout(4000)

            # ── Abre form de edição ──
            print("➡  Abrindo edição...")
            cred_json = await cs_frame.evaluate("""
                var btns = document.querySelectorAll('[ng-click="editarCredencial(credencial)"]');
                if (btns.length === 0) null;
                else {
                    var s = angular.element(btns[0]).scope();
                    s.editarCredencial(s.credencial);
                    s.$apply();
                    JSON.stringify(s.credencial);
                }
            """)
            cred = json.loads(cred_json) if cred_json else {}
            with open(f"{OUT}/credencial.json", "w") as f:
                json.dump(cred, f, indent=2, ensure_ascii=False)

            print("\n📋 CAMPOS DA CREDENCIAL:")
            for k, v in cred.items():
                tipo = type(v).__name__
                print(f"   {k:35} ({tipo}): {str(v)[:60]}")

            await page.wait_for_timeout(5000)

            # ── Screenshot ──
            await page.screenshot(path=f"{OUT}/tela.png", full_page=True)

            # ── Analisa o form aberto ──
            print("\n🔍 Procurando form de edição visível no DOM...")
            form_info = await cs_frame.evaluate("""
                // Procura modal/form aberto
                var modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"], [class*="modal-dialog"]');
                if (!modal) {
                    var forms = document.querySelectorAll('form');
                    modal = forms[forms.length-1];
                }
                if (!modal) {
                    JSON.stringify({erro: "Nenhum form/modal encontrado"});
                } else {
                    var inputs = [];
                    modal.querySelectorAll('input, .checkbox, [ng-model], [ng-class]').forEach(function(el) {
                        var cs = getComputedStyle(el);
                        var parent = el.closest('[ng-class]') || el.closest('.checkbox-icon') || el.closest('label') || el.parentElement;
                        var parentCs = parent ? getComputedStyle(parent) : null;
                        inputs.push({
                            tag: el.tagName,
                            type: el.type,
                            id: el.id,
                            name: el.name,
                            ngModel: el.getAttribute('ng-model'),
                            ngClass: el.getAttribute('ng-class') || (parent ? parent.getAttribute('ng-class') : ''),
                            class: el.className.substring(0, 120),
                            parentClass: parent ? parent.className.substring(0, 120) : '',
                            parentNgClass: parent ? parent.getAttribute('ng-class') : '',
                            checked: el.type === 'checkbox' ? el.checked : null,
                            value: el.value ? el.value.substring(0, 30) : '',
                            label: (parent ? parent.innerText : '').trim().substring(0, 40),
                            bgColor: cs.backgroundColor,
                            bgParent: parentCs ? parentCs.backgroundColor : '',
                            color: cs.color,
                            visible: cs.display !== 'none' && cs.visibility !== 'hidden'
                        });
                    });
                    JSON.stringify({
                        modal_id: modal.id, modal_class: modal.className.substring(0, 80),
                        n_inputs: inputs.length,
                        inputs: inputs
                    });
                }
            """)

            with open(f"{OUT}/form_analysis.json", "w") as f:
                f.write(form_info or "{}")

            fa = json.loads(form_info) if form_info else {}
            print(f"📦 Modal: {fa.get('modal_id')} / {fa.get('modal_class')}")
            print(f"📦 Inputs encontrados: {fa.get('n_inputs')}")
            print("\n🔘 ELEMENTOS DO FORM:")
            for inp in fa.get("inputs", []):
                if inp.get("visible") and (inp.get("ngModel") or inp.get("ngClass")):
                    label = inp.get("label", "")[:35]
                    ngm   = (inp.get("ngModel") or "")[:35]
                    ngc   = (inp.get("ngClass") or inp.get("parentNgClass") or "")[:80]
                    bg    = inp.get("bgParent") or inp.get("bgColor", "")
                    chk   = inp.get("checked")
                    print(f"  📌 {label:35} | ngModel={ngm:30} | checked={chk}")
                    if ngc: print(f"     ng-class: {ngc}")
                    if bg and bg != "rgba(0, 0, 0, 0)": print(f"     bg: {bg}")

            # ── Salva HTML completo do form ──
            html = await cs_frame.evaluate("""
                var modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"], [class*="modal-dialog"]');
                modal ? modal.outerHTML : 'NO_MODAL';
            """)
            with open(f"{OUT}/form.html", "w") as f:
                f.write(html or "")

            # ── Procura botão Salvar ──
            print("\n💾 Procurando botão Salvar...")
            btn_save = await cs_frame.evaluate("""
                var btns = [];
                document.querySelectorAll('button, [ng-click]').forEach(function(b) {
                    var txt = b.innerText.trim();
                    var ng  = b.getAttribute('ng-click') || '';
                    if (/salvar|gravar/i.test(txt) || /salvar|gravar/i.test(ng)) {
                        btns.push({texto: txt, ngClick: ng, classe: b.className.substring(0,80)});
                    }
                });
                JSON.stringify(btns);
            """)
            print(f"   Botões salvar: {btn_save}")

            # ── Clica em Salvar SEM mexer em nada — captura alerts ──
            print("\n⚠️  Clicando em SALVAR sem reconfirmar nada — captura alerts...")
            await cs_frame.evaluate("""
                var btns = document.querySelectorAll('button, [ng-click]');
                for (var i=0; i<btns.length; i++) {
                    var b = btns[i];
                    if (/salvar/i.test(b.innerText) || /salvar/i.test(b.getAttribute('ng-click')||'')) {
                        b.click();
                        break;
                    }
                }
            """)
            await page.wait_for_timeout(5000)
            await page.screenshot(path=f"{OUT}/apos_save.png", full_page=True)

            # Captura mensagens de erro/alerta visíveis na tela após save
            mensagens = await cs_frame.evaluate("""
                var msgs = [];
                document.querySelectorAll('.alert, [class*="error"], [class*="warning"], [class*="aviso"], .toast, .notify, .ng-toast').forEach(function(el) {
                    var cs = getComputedStyle(el);
                    if (cs.display !== 'none' && cs.visibility !== 'hidden') {
                        msgs.push({class: el.className.substring(0,80), text: el.innerText.trim().substring(0,200)});
                    }
                });
                JSON.stringify(msgs);
            """)
            print(f"💬 Mensagens visíveis após save: {mensagens}")

            print(f"\n🔔 Total de dialogs capturados: {len(dialogs)}")
            for d in dialogs:
                print(f"   - {d}")

            print(f"\n✅ Tudo em {OUT}")
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())

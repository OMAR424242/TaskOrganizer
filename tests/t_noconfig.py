"""The zip deliberately leaves config.js out, so a fresh upload has none.
The app has to come up anyway — local-only, with the account screen honest
about it — rather than showing a broken page or a dead sign-in form."""
import http.server, socketserver, threading, shutil, os, functools
from playwright.sync_api import sync_playwright

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = '/tmp/noconfigsite'
PORT = 5312
ok = True


def check(label, cond, extra=''):
    global ok
    print(('  ok  ' if cond else 'FAIL  ') + label + (('  ' + str(extra)) if extra else ''))
    if not cond:
        ok = False


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


if os.path.isdir(SITE):
    shutil.rmtree(SITE)
shutil.copytree(SRC, SITE, ignore=shutil.ignore_patterns(
    'node_modules', '.git', 'dist', 'www', 'ios', 'android', 'assets',
        'tests'))
# exactly what the delivered zip contains: no config.js at all
if os.path.exists(os.path.join(SITE, 'config.js')):
    os.remove(os.path.join(SITE, 'config.js'))

handler = functools.partial(Quiet, directory=SITE)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:%d/' % PORT

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(base, wait_until='networkidle'); pg.wait_for_timeout(1400)

        check('the app still boots with no config.js at all',
              pg.query_selector('#main') is not None)
        check('and does not throw', not errs, errs[:2])
        check('sync reports itself off rather than broken',
              pg.evaluate("() => window.OTSync.status") == 'off',
              pg.evaluate("() => window.OTSync.status"))

        # get past the welcome and check the profile is honest
        if pg.query_selector('.sheet'):
            (pg.query_selector('#skip') or pg.query_selector('.sheet [data-close]')).click()
            pg.wait_for_timeout(500)
        pg.evaluate("""() => {
            const s = JSON.parse(localStorage['onething.v3']);
            s.onboarded = true; localStorage['onething.v3'] = JSON.stringify(s);
        }""")
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(1200)
        if pg.query_selector('.sheet'):
            (pg.query_selector('#skip') or pg.query_selector('.sheet [data-close]')).click()
            pg.wait_for_timeout(400)

        pg.click('#profileBtn'); pg.wait_for_timeout(900)
        body = pg.inner_text('.sheet-body')
        check('no sign-in form is offered when there is no backend',
              pg.query_selector('#auEmail') is None)
        check('and no delete-account button either, since there is no account',
              pg.query_selector('#delAcct') is None)
        check('the profile says so in words',
              'this device' in body.lower(), body[:120].replace('\n', ' '))

        # the character art all resolves from a plain static host
        arts = pg.evaluate("""async () => {
            const poses = ['idle','cook','move','eat','study','work','cheer',
                           'wash','sleep','clean','laundry','plants','game','music'];
            const bad = [];
            for (const b of ['m','f']) for (const p of poses) {
                const i = new Image(); i.src = './art/char-' + b + '-' + p + '.webp';
                try { await i.decode(); } catch (e) { bad.push(b + '-' + p); }
            }
            return bad;
        }""")
        check('all 28 drawings load off a static host', not arts, arts)

        # the two public pages the stores need
        for page in ('privacy.html', 'delete-account.html'):
            p2 = ctx.new_page()
            p2.goto(base + page, wait_until='networkidle'); p2.wait_for_timeout(500)
            check('%s serves' % page, 'One Thing' in p2.inner_text('body'))
            p2.close()
        ctx.close(); b.close()
finally:
    httpd.shutdown()
    shutil.rmtree(SITE)

print('\nALL CHECKS PASSED' if ok else '\nSOMETHING FAILED')

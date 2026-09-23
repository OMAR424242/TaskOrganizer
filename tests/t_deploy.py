"""Does a deploy actually reach a phone that already has the app?

This reproduces the thing that made "I uploaded the zip and still can't see
the new features" happen: GitHub Pages serves every file with
Cache-Control: max-age=600, so for ten minutes after a deploy the browser's
own HTTP cache still holds the previous copy. A service worker that warms
its cache with a plain fetch copies that stale copy into the new versioned
cache and then serves it forever.

Run against the real sw.js, twice: once with the old install (a plain
cache.add) to show the failure, once with the current one.
"""
import http.server, socketserver, threading, shutil, os, re, functools, time
from playwright.sync_api import sync_playwright

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = '/tmp/deploysite'
PORT = 5311
ok = True


def check(label, cond, extra=''):
    global ok
    print(('  ok  ' if cond else 'FAIL  ') + label + (('  ' + str(extra)) if extra else ''))
    if not cond:
        ok = False


class Pages(http.server.SimpleHTTPRequestHandler):
    """As close to GitHub Pages as matters: everything cacheable for 600s."""
    def end_headers(self):
        self.send_header('Cache-Control', 'max-age=600')
        super().end_headers()

    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(Pages, directory=SITE)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def deploy(marker, cache_version, old_install=False):
    """Copy the repo to the served folder, stamping app.js and sw.js."""
    if os.path.isdir(SITE):
        shutil.rmtree(SITE)
    shutil.copytree(SRC, SITE, ignore=shutil.ignore_patterns(
        'node_modules', '.git', 'dist', 'www', 'ios', 'android', 'assets',
        'tests'))
    # a marker the page can be asked for
    p = os.path.join(SITE, 'app.js')
    s = open(p, encoding='utf-8').read()
    s = s.replace("(function () {", "(function () {\n  window.__BUILD = '%s';" % marker, 1)
    open(p, 'w', encoding='utf-8').write(s)

    p = os.path.join(SITE, 'sw.js')
    s = open(p, encoding='utf-8').read()
    s = re.sub(r"const CACHE = '[^']+';", "const CACHE = '%s';" % cache_version, s)
    if old_install:
        # the version that had the bug
        s = s.replace("SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))",
                      "SHELL.map((u) => c.add(u))")
    open(p, 'w', encoding='utf-8').write(s)
    # config.js is not in the repo zip; a fresh clone has none either
    cfg = os.path.join(SITE, 'config.js')
    if not os.path.exists(cfg):
        open(cfg, 'w').write("window.OT_CONFIG = {SUPABASE_URL:'',SUPABASE_ANON_KEY:''};\n")


def run_case(label, old_install):
    deploy('BUILD-ONE', 'test-v1', old_install=old_install)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        pg = ctx.new_page()
        base = 'http://127.0.0.1:%d/' % PORT
        pg.goto(base, wait_until='networkidle')
        pg.wait_for_function("() => navigator.serviceWorker.controller !== null",
                             timeout=15000)
        pg.wait_for_timeout(900)
        first = pg.evaluate("() => window.__BUILD")

        # a deploy, immediately — well inside the 600s the first files are
        # still cacheable for
        deploy('BUILD-TWO', 'test-v2', old_install=old_install)
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(2500)
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(1500)
        got = pg.evaluate("() => window.__BUILD")
        ctx.close(); b.close()
    print('   %s: first=%s  after deploy=%s' % (label, first, got))
    return first, got


httpd = serve()
try:
    # the version that shipped, to show the failure is real and not theoretical
    _f, bad = run_case('old install (plain cache.add)', old_install=True)
    check('the old worker really did serve a stale build after a deploy',
          bad == 'BUILD-ONE',
          'got %s — if this says BUILD-TWO the bug does not reproduce here' % bad)

    # and the current one
    _f, good = run_case('current install (cache: reload)', old_install=False)
    check('the current worker picks the new build up', good == 'BUILD-TWO', good)
finally:
    httpd.shutdown()
    if os.path.isdir(SITE):
        shutil.rmtree(SITE)

print('\nALL CHECKS PASSED' if ok else '\nSOMETHING FAILED')

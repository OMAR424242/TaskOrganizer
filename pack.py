#!/usr/bin/env python3
"""
Assemble www/ — the web assets exactly as the native app will serve them.

    python3 pack.py

Capacitor copies whatever is in www/ into the app bundle, so this is the
line between "the website" and "the app". Three things change on the way
across, and each one is a bug if it doesn't:

  · The service worker goes. Inside the shell every file is already on the
    device, served off the bundle — a cache in front of that caches nothing
    and adds the one failure mode nobody can clear from a phone, which is a
    stale copy of an app with no address bar to hard-refresh.

  · The manifest and the iOS home-screen meta tags go. They are the
    instructions for installing a website. This *is* the installed thing.

  · config.js is rewritten from the environment rather than copied, so the
    Supabase keys that belong to the store build are set deliberately at
    build time and the repo's own config is never shipped by accident.

Everything else is copied byte for byte from the same files the website
runs, which is the point: one codebase, and the store build cannot quietly
drift from the one people already use.
"""
import io, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WWW = os.path.join(HERE, 'www')

FILES = ['index.html', 'styles.css', 'native.js', 'sync.js', 'app.js', 'favicon.png']
DIRS = ['art', 'fonts', 'vendor', 'icons']


def main():
    if os.path.isdir(WWW):
        shutil.rmtree(WWW)
    os.makedirs(WWW)

    for d in DIRS:
        src = os.path.join(HERE, d)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(WWW, d))
    for f in FILES:
        shutil.copy2(os.path.join(HERE, f), os.path.join(WWW, f))

    html = io.open(os.path.join(WWW, 'index.html'), encoding='utf-8').read()

    # The service worker registration, and the worker itself.
    html = re.sub(r"\s*<script>\s*/\* Registered with a relative path.*?</script>",
                  '', html, flags=re.S)
    if "serviceWorker" in html:
        print('FAILED: the service worker registration is still in index.html')
        return 1

    # Instructions for installing a website, inside the installed thing.
    html = html.replace('<link rel="manifest" href="./manifest.webmanifest">', '')
    html = re.sub(r'\s*<meta name="(mobile-web-app-capable|apple-mobile-web-app-[a-z-]+)"[^>]*>',
                  '', html)

    # Capacitor injects its own runtime before anything else on the page.
    tag = '<script src="./config.js"></script>'
    assert html.count(tag) == 1, 'config.js script tag not found exactly once'
    html = html.replace(tag, '<script src="capacitor.js"></script>\n' + tag)

    io.open(os.path.join(WWW, 'index.html'), 'w', encoding='utf-8').write(html)

    # The keys for this build, from the environment. Absent is a valid
    # answer — it produces a local-only app with the account screen hidden,
    # which is exactly what the repo's own blank config does.
    url = os.environ.get('SUPABASE_URL', '').strip()
    key = os.environ.get('SUPABASE_ANON_KEY', '').strip()
    cfg = ("/* Written by pack.py from the environment at build time.\n"
           "   Never edited by hand, never copied from the repo. */\n"
           "window.OT_CONFIG = {\n"
           "  SUPABASE_URL: '%s',\n"
           "  SUPABASE_ANON_KEY: '%s'\n"
           "};\n" % (url.replace("'", ''), key.replace("'", '')))
    io.open(os.path.join(WWW, 'config.js'), 'w', encoding='utf-8').write(cfg)
    print('accounts: %s' % ('on, %s' % url if url and key else
                            'OFF (set SUPABASE_URL and SUPABASE_ANON_KEY)'))

    # Nothing in here may reach for the network. The one exception is the
    # Supabase project itself, which is named in config.js and nowhere else.
    for root, _dirs, names in os.walk(WWW):
        for n in names:
            if not n.endswith(('.html', '.js', '.css')):
                continue
            p = os.path.join(root, n)
            body = io.open(p, encoding='utf-8', errors='ignore').read()
            for host in ('cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
                         'fonts.googleapis.com', 'fonts.gstatic.com'):
                if host in body:
                    print('FAILED: %s still reaches for %s' % (n, host))
                    return 1

    total = sum(os.path.getsize(os.path.join(r, f))
                for r, _d, fs in os.walk(WWW) for f in fs)
    count = sum(len(fs) for _r, _d, fs in os.walk(WWW))
    print('www/  %d files, %.1f MB' % (count, total / 1024.0 / 1024.0))
    print('next: npx cap sync')
    return 0


if __name__ == '__main__':
    sys.exit(main())

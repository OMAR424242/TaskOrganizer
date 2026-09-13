#!/usr/bin/env python3
"""
Fold index.html + styles.css + config.js + sync.js + app.js into one
self-contained file: dist/one-thing.html

Why: the repo is split so it's editable, but a Claude artifact has to be a
single page with nothing external. This is the only thing that turns one
into the other, so the two can't drift — the artifact is always built from
the same source the repo runs.

    python3 build.py

Nothing is minified. Reading the built file and reading the repo should be
the same experience.
"""
import base64, io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'dist')
OUT = os.path.join(OUT_DIR, 'one-thing.html')


def read(name):
    with io.open(os.path.join(HERE, name), encoding='utf-8') as f:
        return f.read()


def main():
    html = read('index.html')

    # The stylesheet link becomes the stylesheet, with the font folded into it.
    css = read('styles.css')
    with open(os.path.join(HERE, 'fonts', 'nunito-variable.woff2'), 'rb') as f:
        woff = base64.b64encode(f.read()).decode('ascii')
    src = "url('./fonts/nunito-variable.woff2') format('woff2')"
    assert css.count(src) == 1, 'font src not found exactly once'
    css = css.replace(src, "url(data:font/woff2;base64,%s) format('woff2')" % woff)
    html = html.replace(
        '<link rel="preload" href="./fonts/nunito-variable.woff2" as="font" '
        'type="font/woff2" crossorigin>', '')

    link = '<link rel="stylesheet" href="./styles.css">'
    assert html.count(link) == 1, 'stylesheet link not found exactly once'
    html = html.replace(link, '<style>\n' + css + '\n</style>')

    # Each script tag becomes its contents. </script> inside a string would
    # close the tag early, so it is split — this is the one transformation
    # that is not a plain copy.
    for name in ('config.js', 'sync.js', 'app.js'):
        tag = '<script src="./%s"></script>' % name
        assert html.count(tag) == 1, '%s script tag not found exactly once' % name
        js = read(name).replace('</script>', "<\\/script>")
        html = html.replace(tag, '<script>\n' + js + '\n</script>')

    # An artifact has no service worker, no manifest and no icon files next to
    # it, so those requests would 404 on every load. Strip them; the repo copy
    # keeps them.
    html = html.replace('<link rel="manifest" href="./manifest.webmanifest">', '')
    html = re.sub(r'\s*<link rel="(icon|apple-touch-icon)"[^>]*>', '', html)
    html = re.sub(
        r"\s*<script>\s*/\* Registered with a relative path.*?</script>",
        '', html, flags=re.S)

    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    with io.open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)

    # A second copy for publishing as a Claude artifact, which supplies its own
    # <!doctype>/<head>/<body> wrapper — so this one is the contents only.
    frag = html
    frag = re.sub(r'^.*?<title>', '<title>', frag, flags=re.S)
    frag = frag.replace('</head>\n<body>\n', '\n')
    frag = re.sub(r'\s*</body>\s*</html>\s*$', '\n', frag)
    with io.open(os.path.join(OUT_DIR, 'artifact.html'), 'w', encoding='utf-8') as f:
        f.write(frag)
    # An actual tag, not the word "head" inside a script.
    stray = re.search(r'<\s*/?\s*(!doctype|html|head|body)\b', frag, re.I)
    if stray:
        print('ARTIFACT COPY STILL HAS %s' % stray.group(0))
        return 1

    # A leftover src= means something in here stopped matching and the built
    # page would silently lose a file.
    leftover = re.findall(r'<(?:script|link)[^>]*(?:src|href)="\./[^"]*"', html)
    if leftover:
        print('STILL EXTERNAL: %r' % leftover)
        return 1

    print('wrote %s  (%d KB)' % (OUT, len(html.encode('utf-8')) // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())

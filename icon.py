#!/usr/bin/env python3
"""
Draw the app icon and the launch screens.

    python3 icon.py

The mark is the existing one, unchanged and measured off it rather than
redrawn from memory: six segments of fifty-four degrees with six-degree
gaps, four in the topic colours and two left grey — a day mostly done.
Radius, stroke and every colour below came out of the old 512px file.

What is new is only how it sits. A flat white square with a flat ring on it
is a web favicon; on a home screen next to everything else it reads as
unfinished. So there are exactly three additions, and they are all small:

  · the ground is a very slight warm fall-off rather than pure white
  · the ring casts a soft short shadow
  · its upper edge catches a little light

No translucency, no refraction, no specular sweep. The brief was to look
like it belongs on the phone, not to look like a bubble.

There is a second output for iOS 26, which draws icons as layers of glass
and lights them itself: assets/icon-composer/*.svg are those layers, flat,
with none of the three additions baked in — the system would only fight
them. Open them in Icon Composer on a Mac and it produces the real thing,
including the dark, clear and tinted variants, which no fixed PNG can be.
"""
import io, math, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
LAYERS = os.path.join(OUT, 'icon-composer')
SS = 4                                  # supersample, for clean arc ends

WHITE    = (255, 255, 255)
WARM     = (243, 239, 232)              # where the ground falls off to
INK_DARK = (17, 29, 34)

# Straight off the original file.
GREEN  = (78, 173, 43)
BLUE   = (28, 176, 246)
ORANGE = (255, 150, 0)
PURPLE = (206, 130, 255)
GREY   = (229, 229, 229)
GREY_D = (58, 74, 82)                   # the same slot, on a dark ground

RING_FRAC  = 0.5098                     # centreline diameter / square
WIDTH_FRAC = 0.1152
SEG_DEG    = 54.0
GAP_DEG    = 6.0
START_DEG  = -84.0


def arcs(dark=False):
    grey = GREY_D if dark else GREY
    cols = [GREEN, BLUE, ORANGE, PURPLE, grey, grey]
    out = []
    for i, col in enumerate(cols):
        a0 = START_DEG + i * (SEG_DEG + GAP_DEG)
        out.append((a0, a0 + SEG_DEG, col))
    return out


def hexof(c):
    return '#%02x%02x%02x' % c


# ── flat layers, for Icon Composer to light itself ──────────────────
def write_layers(n=1024):
    if not os.path.isdir(LAYERS):
        os.makedirs(LAYERS)
    cx = cy = n / 2.0
    r = n * RING_FRAC / 2.0
    w = n * WIDTH_FRAC

    def path(a0, a1, col):
        x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
        x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
        return ('<path d="M %.2f %.2f A %.2f %.2f 0 0 1 %.2f %.2f" fill="none" '
                'stroke="%s" stroke-width="%.2f"/>' % (x0, y0, r, r, x1, y1, hexof(col), w))

    io.open(os.path.join(LAYERS, '1-background.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
        '<rect width="%d" height="%d" fill="%s"/></svg>'
        % (n, n, n, n, n, n, hexof(WHITE)))

    a = arcs()
    io.open(os.path.join(LAYERS, '2-done.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
        '%s</svg>' % (n, n, n, n, ''.join(path(*s) for s in a[:4])))
    io.open(os.path.join(LAYERS, '3-remaining.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
        '%s</svg>' % (n, n, n, n, ''.join(path(*s) for s in a[4:])))
    print('  Icon Composer layers: %s' % ', '.join(sorted(os.listdir(LAYERS))))


# ── the fixed render ────────────────────────────────────────────────
def ring_mask(n, r, w, scale=1.0, dark=False):
    m = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(m)
    box = [n / 2.0 - r, n / 2.0 - r, n / 2.0 + r, n / 2.0 + r]
    for a0, a1, _c in arcs(dark):
        d.arc(box, a0, a1, fill=255, width=int(w * scale))
    return m


def icon(size=1024, bg=WHITE, fall=WARM, dark=False):
    n = size * SS
    r = n * RING_FRAC / 2.0 + n * WIDTH_FRAC / 2.0     # PIL strokes inward
    w = n * WIDTH_FRAC
    box = [n / 2.0 - r, n / 2.0 - r, n / 2.0 + r, n / 2.0 + r]

    # 1. The ground: a slight fall-off towards the bottom right. Pure flat
    #    white is the one thing that marks an icon out as a favicon that
    #    got promoted.
    base = Image.new('RGB', (n, n), bg)
    grad = Image.new('L', (n, n))
    gp = grad.load()
    for y in range(n):
        v = int(255 * (y / float(n)) ** 1.25)
        for x in range(n):
            gp[x, y] = v
    base = Image.composite(Image.new('RGB', (n, n), fall), base, grad)
    canvas = base.convert('RGBA')

    # 2. A short soft shadow under it. Short on purpose — a long one reads
    #    as a sticker floating above the square.
    sh_mask = ring_mask(n, r, w, dark=dark).filter(ImageFilter.GaussianBlur(n * 0.013))
    sh_mask = ImageChops.offset(sh_mask, 0, int(n * 0.009))
    sh = Image.new('RGBA', (n, n), (44, 38, 30, 0))
    sh.putalpha(sh_mask.point(lambda v: int(v * 0.26)))
    canvas = Image.alpha_composite(canvas, sh)

    # 3. The mark, in its own colours, solid.
    body = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    for a0, a1, col in arcs(dark):
        bd.arc(box, a0, a1, fill=col + (255,), width=int(w))
    canvas = Image.alpha_composite(canvas, body)

    # 4. A little light along the top edge, clipped to the ring so it never
    #    spills onto the ground.
    mask = ring_mask(n, r, w, dark=dark)
    lit = ring_mask(n, r, w, scale=0.42, dark=dark)
    lit = ImageChops.offset(lit, 0, int(-n * 0.004))
    lit = ImageChops.multiply(lit, mask).filter(ImageFilter.GaussianBlur(n * 0.004))
    hi = Image.new('RGBA', (n, n), (255, 255, 255, 0))
    hi.putalpha(lit.point(lambda v: int(v * 0.30)))
    canvas = Image.alpha_composite(canvas, hi)

    return canvas.convert('RGB').resize((size, size), Image.LANCZOS)


def splash(w, h, bg, dark):
    im = Image.new('RGB', (w, h), bg)
    side = int(min(w, h) * 0.20)
    mark = icon(side, bg=bg, fall=bg, dark=dark)
    m = Image.new('L', (side * SS, side * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, side * SS - 1, side * SS - 1],
                                        radius=int(side * SS * 0.235), fill=255)
    im.paste(mark, ((w - side) // 2, (h - side) // 2), m.resize((side, side), Image.LANCZOS))
    return im


def main():
    for d in (OUT, LAYERS):
        if not os.path.isdir(d):
            os.makedirs(d)
    write_layers()

    light = icon(1024)
    light.save(os.path.join(OUT, 'icon.png'))
    light.save(os.path.join(OUT, 'icon-only.png'))
    icon(1024, bg=(26, 40, 46), fall=INK_DARK, dark=True).save(
        os.path.join(OUT, 'icon-dark.png'))

    # Android's adaptive foreground: the mark alone, inside the safe circle.
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    inner = icon(640).convert('RGBA')
    m = ring_mask(640 * SS,
                  640 * SS * RING_FRAC / 2.0 + 640 * SS * WIDTH_FRAC / 2.0,
                  640 * SS * WIDTH_FRAC)
    inner.putalpha(m.filter(ImageFilter.GaussianBlur(640 * SS * 0.002))
                    .resize((640, 640), Image.LANCZOS))
    fg.paste(inner, (192, 192), inner)
    fg.save(os.path.join(OUT, 'icon-foreground.png'))
    Image.new('RGB', (1024, 1024), WHITE).save(os.path.join(OUT, 'icon-background.png'))

    splash(2732, 2732, WHITE, False).save(os.path.join(OUT, 'splash.png'))
    splash(2732, 2732, INK_DARK, True).save(os.path.join(OUT, 'splash-dark.png'))

    print()
    for f in sorted(os.listdir(OUT)):
        p = os.path.join(OUT, f)
        if os.path.isfile(p):
            print('  %-26s %-12s %6.1f KB' % (f, '%dx%d' % Image.open(p).size,
                                              os.path.getsize(p) / 1024.0))
    return 0


if __name__ == '__main__':
    sys.exit(main())

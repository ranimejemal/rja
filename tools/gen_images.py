"""Generate RJA-branded image tiles used in place of the template's photos."""
import json, os, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
F = '/usr/share/fonts/truetype/'
SANS_B = F + 'dejavu/DejaVuSans-Bold.ttf'
SANS = F + 'dejavu/DejaVuSans.ttf'
MONO = F + 'jetbrains-mono/JetBrainsMono-Regular.ttf'
SERIF_I = F + 'liberation/LiberationSerif-Italic.ttf'
LOGO = Image.open(os.path.join(OUT, 'rja-logo-white.png'))
data = json.load(open(sys.argv[2]))


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=fnt) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def background(w, h, seed):
    rnd = random.Random(seed)
    img = Image.new('RGB', (w, h), (14, 14, 13))
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    for _ in range(3):
        cx, cy = rnd.randint(0, w), rnd.randint(0, h)
        r = rnd.randint(w // 4, w // 2)
        shade = rnd.randint(70, 110)
        g.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(shade, shade, shade - 4))
    glow = glow.filter(ImageFilter.GaussianBlur(w // 6))
    img = Image.blend(img, glow, 0.55)
    d = ImageDraw.Draw(img)
    step = w // 12
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=(40, 40, 38), width=1)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=(40, 40, 38), width=1)
    return img


def logo(img, height, pos):
    lg = LOGO.copy()
    lg.thumbnail((height * 4, height), Image.LANCZOS)
    x = pos[0] if pos[0] >= 0 else img.width + pos[0] - lg.width
    y = pos[1] if pos[1] >= 0 else img.height + pos[1] - lg.height
    img.paste(lg, (x, y), lg)


def flow(d, nodes, x, y, w):
    fnt = font(MONO, 22)
    gap = 46
    widths = [d.textlength(n.upper(), font=fnt) + 44 for n in nodes]
    total = sum(widths) + gap * (len(nodes) - 1)
    scale = min(1, w / total)
    cx = x
    for i, n in enumerate(nodes):
        bw = widths[i] * scale
        d.rounded_rectangle([cx, y, cx + bw, y + 58], radius=12, outline=(255, 255, 255), width=2, fill=(20, 20, 19))
        d.text((cx + bw / 2, y + 29), n.upper(), font=fnt, fill=(255, 255, 255), anchor='mm')
        if i < len(nodes) - 1:
            ax = cx + bw + 8
            d.line([(ax, y + 29), (ax + gap * scale - 16, y + 29)], fill=(255, 255, 255), width=2)
            d.polygon([(ax + gap * scale - 16, y + 22), (ax + gap * scale - 6, y + 29), (ax + gap * scale - 16, y + 36)], fill=(255, 255, 255))
        cx += bw + gap * scale


def tile(name, label, title, nodes, seed, size=(1200, 800)):
    w, h = size
    img = background(w, h, seed)
    d = ImageDraw.Draw(img)
    pad = 64
    d.text((pad, pad), '(' + label + ')', font=font(MONO, 24), fill=(170, 170, 165))
    logo(img, 46, (-pad, pad - 6))
    if nodes:
        flow(d, nodes, pad, h // 2 - 70, w - 2 * pad)
    fnt = font(SANS_B, 60)
    lines = wrap(d, title, fnt, w - 2 * pad)
    y = h - pad - len(lines) * 72
    for line in lines:
        d.text((pad, y), line, font=fnt, fill=(255, 255, 255))
        y += 72
    img.save(os.path.join(OUT, name), quality=86)


for i, p in enumerate(data['products']):
    tile('product-' + p['slug'] + '.jpg', p['category'], p['name'], p['flow'], i)

for i, c in enumerate(data['categories']):
    tile('category-' + c['slug'] + '.jpg', 'Category', c['name'], None, 100 + i)

for i, (slug, label, title, nodes) in enumerate([
    ('sellers', 'For sellers', 'Build once, sell repeatedly', ['Build', 'Upload', 'Customize', 'Sell']),
    ('buyers', 'For buyers', 'Find it, personalize it, run it', ['Find', 'Personalize', 'Connect', 'Activate']),
    ('platform', 'Platform', 'Validated, licensed, secure', ['Validate', 'License', 'Secure', 'Support']),
]):
    tile('about-' + slug + '.jpg', label, title, nodes, 200 + i, size=(1000, 1000))

# Large hero/reel visual
img = background(1920, 1080, 999)
d = ImageDraw.Draw(img)
logo(img, 300, ((1920 - 562) // 2, 300))
d.text((960, 760), 'AUTOMATE YOUR BUSINESS', font=font(MONO, 40), fill=(200, 200, 195), anchor='mm')
img.save(os.path.join(OUT, 'rja-reel.jpg'), quality=86)

# Integration wordmarks for the logo wall
for app in data['apps']:
    fnt = font(SANS_B, 44)
    tw = int(ImageDraw.Draw(Image.new('L', (1, 1))).textlength(app, font=fnt))
    im = Image.new('RGBA', (tw + 20, 70), (255, 255, 255, 0))
    ImageDraw.Draw(im).text((10, 35), app, font=fnt, fill=(255, 255, 255, 255), anchor='lm')
    im.save(os.path.join(OUT, 'app-' + app.lower().replace(' ', '-') + '.png'))
print('done')

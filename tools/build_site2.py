"""Build every RJA page from the matching page of the exported template, keeping each page's
own scripts and Webflow interaction bundle so animations and UX stay identical.

Usage: python3 -I build_site2.py <template dir> <catalog.json> <out dir>
"""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import HOW, SELL, PLATFORM

TPL, CATALOG, OUT = sys.argv[1:4]
cat = json.load(open(CATALOG))
PRODUCTS = cat['products']
e = html.escape

EMAIL = 'ranimejmal@gmail.com'
INSTA = 'https://www.instagram.com/ranimejemalagency/'
LOGO_SVG = open(os.path.join(OUT, 'assets/images/rja-logo.svg')).read()
CAT_SLUG = {c['name']: c['slug'] for c in cat['categories']}


def read(name):
    return open(os.path.join(TPL, name)).read()


def sub(s, pattern, new, count=1, flags=re.S):
    out, n = re.subn(pattern, new, s, flags=flags)
    assert n == count if count is not None else True, (n, pattern[:100])
    return out


def rep(s, old, new, count=1):
    old = old.replace('\n<', '<')
    assert s.count(old) == count, (s.count(old), old[:100])
    return s.replace(old, new)


def money(n):
    return '${:,}'.format(n)


def price_band(n):
    return '$100 – $150' if n <= 150 else '$151 – $250' if n <= 250 else 'Over $250'


# ------------------------------------------------------------------ shared chrome
MENU = [('index.html', 'Home'), ('explore.html', 'Explore'), ('how-it-works.html', 'How it works'),
        ('sell.html', 'Sell'), ('index.html#contact', 'Contact')]


def footer(px):
    return (
        '<footer class="footer"><div class="container"><div class="footer-inner"><div class="footer-left">'
        f'<p class="p-small">Ranime Jemal Agency • <a href="mailto:{EMAIL}?subject=Website%20Contact" data-underline-link="">{EMAIL}</a></p>'
        '<p class="p-small"><a href="tel:+21697017061" data-underline-link="">+216 97 017 061</a> • '
        '<a href="tel:+33624979941" data-underline-link="">+33 6 24 97 99 41</a></p>'
        '<p data-current-date="" class="p-small">Automate your business. © 20<span data-current-date-year="">26</span> Ranime Jemal Agency</p></div>'
        '<div class="footer-right"><div class="button-group"><div class="button-group">'
        f'<a aria-label="instagram" data-hover-scale="" href="{INSTA}" target="_blank" rel="noopener" class="icon-1x1-small w-inline-block">{INSTA_SVG}</a>'
        '</div></div><div class="button-group">'
        f'<a data-underline-link="" href="{px}platform.html#rules" class="p-tiny">License &amp; Product Rules</a>'
        f'<a data-underline-link="" href="{px}platform.html" class="p-tiny">Platform &amp; Trust</a>'
        '</div></div></div></div></footer>')


INSTA_SVG = re.search(r'aria-label="instagram"[^>]*>(<svg.*?</svg>)</a>', read('index.html'), re.S).group(1)


def chrome(s, title, desc, page, px=''):
    """Rebrand head, header, menu and footer of a template page; keep its scripts."""
    head_end = s.index('</head>')
    h, b = s[:head_end], s[head_end:]
    h = sub(h, r' data-wf-domain="[^"]*"', '')
    h = sub(h, r'<title>.*?</title>', '<title>' + e(title) + '</title>')
    h = sub(h, r'<link rel="alternate"[^>]*/>', '', count=None)
    for attr in ['name="description"', 'property="og:description"', 'name="twitter:description"']:
        h = sub(h, r'<meta content="[^"]*" ' + attr + '/>', f'<meta content="{e(desc)}" {attr}/>', count=None)
    for attr in ['property="og:title"', 'name="twitter:title"']:
        h = sub(h, r'<meta content="[^"]*" ' + attr + '/>', f'<meta content="{e(title)}" {attr}/>', count=None)
    for attr in ['property="og:image"', 'name="twitter:image"']:
        h = sub(h, r'<meta content="[^"]*" ' + attr + '/>', f'<meta content="{px}assets/images/rja-opengraph.jpg" {attr}/>', count=None)
    h = sub(h, r'<link href="[^"]*" rel="shortcut icon" type="image/x-icon"/>', f'<link href="{px}assets/images/rja-favicon.png" rel="shortcut icon" type="image/png"/>')
    h = sub(h, r'<link href="[^"]*" rel="apple-touch-icon"/>', f'<link href="{px}assets/images/rja-favicon.png" rel="apple-touch-icon"/>')
    h = sub(h, r'<link href="[^"]*" rel="canonical"/>', f'<link href="{page}" rel="canonical"/>', count=None)
    h = sub(h, r'<script type="application/ld\+json">.*?</script>', '', count=None)
    # The template owner's analytics.
    h = sub(h, r'<script async="" src="https://www.googletagmanager.com/gtag/js[^"]*"></script><script type="text/javascript">window.dataLayer.*?</script>', '', count=None)
    ld = {"@context": "https://schema.org", "@type": "Organization", "name": "Ranime Jemal Agency",
          "email": EMAIL, "telephone": ["+216 97 017 061", "+33 6 24 97 99 41"], "sameAs": [INSTA]}
    h += '<script type="application/ld+json">' + json.dumps(ld) + '</script>'
    h += f'<link rel="stylesheet" href="{px}assets/css/rja.css"/>'

    # Header: same markup, RJA logo; only English in the language switcher.
    b = sub(b, r'(<a href="[^"]*"(?: aria-current="page")? class="header-logo__wrapper[^"]*">)<svg.*?</svg>',
            lambda m: re.sub(r'href="[^"]*"', f'href="{px}index.html"', m.group(1)) + LOGO_SVG)
    b = sub(b, r'<div role="listitem" class="w-locales-item"><a[^>]*hreflang="es"[^>]*>Español</a></div>', '')
    b = sub(b, r'(hreflang="en" href=")[^"]*(")', r'\g<1>' + page.split('/')[-1] + r'\g<2>')
    items = ''.join(
        f'<li class="menu-list__item"><a data-menu-toggle="close" data-scramble-hover="link" href="{px}{hr}" '
        f'class="menu-list__link w-inline-block"><span data-scramble-hover="target">{t}</span></a></li>'
        for hr, t in MENU)
    b = sub(b, r'<ul class="menu-list">.*?</ul>', f'<ul class="menu-list">{items}</ul>')
    b = sub(b, r'href="(?:\.\./)?index\.html#contact" class="link-block', f'href="{px}index.html#contact" class="link-block')
    b = sub(b, r'<footer class="footer">.*?</footer>', footer(px))
    return h + b


def write(name, s):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(s)
    leftovers = {m for m in re.findall(r'[^"\s<>]*cinetica[^"\s<>]*', s, re.I)
                 if not re.search(r'cinetica-studio\.webflow|kr3ado/cinetica-studio|\.json\.txt|cinetica_(light|dark)', m)}
    assert not leftovers, (name, leftovers)
    print('wrote', name, len(s))


# ------------------------------------------------------------------ accordion & tabs
faq = read('faq.html')
ACC_ICON = re.search(r'<div class="accordion-css__item-icon">(<svg.*?</svg>)</div>', faq, re.S).group(1)
VSVG = re.findall(r'<div class="vertical-h__w">(<svg.*?</svg>)<h2 class="faq-vertical__h">.*?</h2>(<svg.*?</svg>)</div>', faq, re.S)[0]


def blocks_html(blocks, p_class='accordion-css__item-p'):
    out = ''
    for bl in blocks:
        if isinstance(bl, list):
            out += '<ul class="faq-list">' + ''.join(
                f'<li class="faq-list__item"><p class="{p_class}">{e(x)}</p></li>' for x in bl) + '</ul>'
        else:
            out += f'<p class="{p_class}">{e(bl)}</p>'
    return out


def accordion(items, black=False):
    lis = ''.join(
        '<li data-accordion-status="not-active" class="accordion-css__item">'
        f'<div data-hover="" data-accordion-toggle="" class="accordion-css__item-top"><h3 class="accordion-css__item-h3">{e(q)}</h3>'
        f'<div class="accordion-css__item-icon">{ACC_ICON}</div></div>'
        f'<div class="accordion-css__item-bottom{" is--black" if black else ""}"><div class="accordion-css__item-bottom-wrap">'
        f'<div class="accordion-css__item-bottom-content">{blocks_html(a)}</div></div></div></li>'
        for q, a in items)
    return f'<div data-accordion-close-siblings="true" data-accordion-css-init="" class="accordion-css"><ul class="accordion-css__list">{lis}</ul></div>'


def faq_page(spec):
    tabs = spec['tabs']
    first = e(tabs[0][0])
    links = ''.join(
        f'<a data-w-tab="{e(t)}" class="tab-link w-inline-block w-tab-link{" w--current" if i == 0 else ""}"><div class="tab-link__p">{e(t)}</div></a>'
        for i, (t, _, _) in enumerate(tabs))
    panes = ''.join(
        f'<div data-w-tab="{e(t)}" class="tabs-content__item w-tab-pane{" w--tab-active" if i == 0 else ""}"><div class="tabs-content__inner">'
        f'<div class="tabs-content-header__w"><div class="vertical-h__w">{VSVG[0]}<h2 class="faq-vertical__h">{v}</h2>{VSVG[1]}</div></div>'
        f'<div class="tabs-content-info__w">{accordion(items)}</div></div></div>'
        for i, (t, v, items) in enumerate(tabs))
    body = (f'<div class="faq-header__w"><h1 class="faq__h">{spec["h1"]}</h1><p class="p-large font-secondary">{e(spec["intro"])}</p></div>'
            f'<div data-current="{first}" data-easing="ease" data-duration-in="300" data-duration-out="100" class="tabs w-tabs">'
            f'<div class="tabs-menu w-tab-menu">{links}</div><div class="tabs-content w-tab-content">{panes}</div></div>')
    s = sub(faq, r'(<div class="padding-global padding-section">)<div class="faq-header__w">.*?(</div></div></section></div></main>)',
            lambda m: m.group(1) + body + m.group(2))
    write(spec['file'], chrome(s, spec['title'], spec['desc'], spec['file']))


for spec in (HOW, SELL, PLATFORM):
    faq_page(spec)

# ------------------------------------------------------------------ explore (portfolio template)
port = read('portfolio.html')
port = rep(port, '<h1 class="heading-h1 all-caps">A tour through our <span data-scramble-loop="">work</span></h1>',
           '<h1 class="heading-h1 all-caps">Find your <span data-scramble-loop="">automation</span></h1>')
port = rep(port, '<span class="portfolio-header__span">(buckle up!)</span>', '<span class="portfolio-header__span">(no code needed)</span>')

seg_start = port.index('<div class="list-filter">')
seg_end = port.index('<button fs-list-element="clear"')
blocks = ['<div class="list-filter">' + x for x in port[seg_start:seg_end].split('<div class="list-filter">')[1:]]
assert len(blocks) == 3


def filter_item(field, value):
    v = e(value)
    return ('<div role="listitem" class="filter-item w-dyn-item"><label class="w-checkbox checkbox-field">'
            '<div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox-input"></div>'
            f'<input type="checkbox" name="Checkbox" fs-list-field="{field}" data-name="Checkbox" fs-list-value="{v}" style="opacity:0;position:absolute;z-index:-1"/>'
            f'<span class="checkbox-label w-form-label" for="Checkbox">{v}</span></label></div>')


def filter_block(tpl, n, label, header, field, values):
    s = sub(tpl, r'(<span class="list-filter__span">)[^<]*', r'\g<1>' + label)
    s = sub(s, r'(<div class="filter-block__header"><span>)[^<]*', r'\g<1>' + header)
    s = sub(s, r'(<form id=")[^"]*(")', r'\g<1>wf-form-filter-' + str(n) + r'\g<2>')
    items = ''.join(filter_item(field, v) for v in values)
    return sub(s, r'(<div role="list" class="filter-list w-dyn-items">).*?(</div></div></div></form>)', lambda m: m.group(1) + items + m.group(2))


diffs = ['Beginner', 'Intermediate', 'Advanced']
bands = ['$100 – $150', '$151 – $250', 'Over $250']
filters = (filter_block(blocks[0], 1, 'Category', 'Filter by category', 'category', [c['name'] for c in cat['categories']])
           + filter_block(blocks[0], 2, 'Apps', 'Filter by app', 'apps', cat['apps'])
           + filter_block(blocks[0], 3, 'Price', 'Filter by price', 'price', bands)
           + filter_block(blocks[2], 4, 'Difficulty', 'Filter by difficulty', 'difficulty', diffs))
port = port[:seg_start] + filters + port[seg_end:]

for old, new in [('Name', 'Automation'), ('End client', 'Category'), ('Service', 'Price'), ('Year', 'Difficulty')]:
    port = sub(port, r'(<div class="preview-item__col is--(?:large|medium|small)"><span class="preview-container__label">)' + old + '</span>',
               r'\g<1>' + new + '</span>')


def preview_item(p):
    hidden = (f'<p fs-list-field="category">{e(p["category"])}</p><p fs-list-field="difficulty">{e(p["difficulty"])}</p>'
              f'<p fs-list-field="price">{e(price_band(p["prices"]["download"]))}</p>'
              + ''.join(f'<p fs-list-field="apps">{e(a)}</p>' for a in p['integrations']))
    return (
        '<div data-follower-item="" role="listitem" class="preview-item w-dyn-item">'
        f'<a fs-list-element="item-link" href="products/{p["slug"]}.html" class="preview-item__inner w-inline-block">'
        '<div class="preview-item__row">'
        f'<div class="preview-item__col is--large"><h2 class="preview-item__heading">{e(p["name"])}</h2></div>'
        f'<div class="preview-item__col is--medium"><p class="preview-item__text">{e(p["category"])}</p></div>'
        f'<div class="preview-item__col is--large"><p class="preview-item__text">From {money(p["prices"]["download"])}</p></div>'
        f'<div class="preview-item__col is--small"><p class="preview-item__text">{e(p["difficulty"])}</p></div></div>'
        f'<div data-follower-visual="" class="preview-item__visual"><img src="assets/images/product-{p["slug"]}.jpg" loading="lazy" alt="{e(p["name"])}" class="preview-item__visual-img"/></div>'
        f'<div class="preview-item__hidden">{hidden}</div></a></div>')


port = sub(port, r'(<div fs-list-element="list" role="list" class="preview-list w-dyn-items">).*?(</div></div><div data-follower-cursor)',
           lambda m: m.group(1) + ''.join(preview_item(p) for p in PRODUCTS) + m.group(2))
# Read filters from the URL so homepage links like explore.html?category=E-commerce open pre-filtered.
port = rep(port, '<div fs-list-element="list" role="list"', '<div fs-list-element="list" fs-list-showquery="true" role="list"')
write('explore.html', chrome(port, 'Explore Automations | Ranime Jemal Agency',
                             'Browse ready-made n8n automations by category, app, price and difficulty.', 'explore.html'))

# ------------------------------------------------------------------ product pages (service template)
svc = read('services/xr-ar-vr-mixed-reality.html')
SVC_BTN = re.search(r'<div class="work-page_link-wrapper">(<a .*?</a>)</div>', read('index.html'), re.S).group(1)


def product_page(p):
    px = '../'
    pr = p['prices']
    s = svc
    s = rep(s, '<span data-scramble-loop="" class="heading-tag">(Service)</span>', '<span data-scramble-loop="" class="heading-tag">(Automation)</span>')
    s = rep(s, '<h1 class="service__h">XR: AR, VR &amp; Mixed Reality</h1>', f'<h1 class="service__h">{e(p["name"])}</h1>')
    s = sub(s, r'(<img class="service__img" )src="[^"]*" alt="" (style="opacity:0") sizes="[^"]*" (data-w-id="[^"]*" id="[^"]*" loading="lazy") srcset="[^"]*"/>',
            lambda m: f'{m.group(1)}src="{px}assets/images/product-{p["slug"]}.jpg" alt="{e(p["name"])}" {m.group(2)} {m.group(3)}/>')
    about = (f'{e(p["summary"])} {e(p["problem"])} Workflow: {e(" → ".join(p["flow"]))}. '
             f'Supported integrations: {e(", ".join(p["integrations"]))}. Difficulty: {e(p["difficulty"])}. Sold by Ranime Jemal Agency.')
    s = sub(s, r'(<div class="service-main-content__w"><h2 [^>]*>)About(</h2><p [^>]*>).*?(</p>)', lambda m: m.group(1) + 'About' + m.group(2) + about + m.group(3))
    example = (f'Example input: {e(p["input"])} Example output: {e(p["output"])} '
               f'Required accounts: {e(", ".join(p["accounts"]))}. Technical requirements: n8n 1.x (self-hosted or n8n Cloud), not needed with the hosted option. '
               f'You can customize: {e(", ".join(p["customization"]))}.')
    s = sub(s, r'(<div><p data-w-id="[^"]*" style="opacity:0" class="p-regular txt-align-justify">).*?(</p></div>)', lambda m: m.group(1) + example + m.group(2))
    subject = 'Order: ' + p['name']
    order = rep(SVC_BTN, 'href="portfolio.html"', f'href="mailto:{EMAIL}?subject={e(subject.replace(" ", "%20").replace("&", "%26"))}"')
    order = rep(order, 'A tour through our work', 'Order by email')
    pricing = [f'Download: {money(pr["download"])} one-time. Workflow template and setup guide.',
               f'Guided setup: {money(pr["guided"])} one-time. Template plus configuration assistance.',
               f'Hosted automation: {money(pr["download"])} + {money(pr["hosted"])}/month. We run it for you.',
               f'Custom implementation: from {money(pr["custom"])}. Development tailored to your business.']
    inc = re.search(r'<div data-w-id="[^"]*" style="opacity:0" class="included__w">.*?</ul></div></div>', s, re.S).group(0)

    def included(title, items, extra=''):
        x = sub(inc, r'(<h2 class="p-large font-secondary">)[^<]*(</h2>)', lambda m: m.group(1) + title + m.group(2))
        x = sub(x, r'(<ul role="list">).*?(</ul>)', lambda m: m.group(1) + ''.join(f'<li>{e(i)}</li>' for i in items) + m.group(2))
        return x[:-len('</div>')] + extra + '</div>' if extra else x

    s = s.replace(inc, included('PRICING', pricing, f'<div class="spacer-huge"></div>{order}') + included('WHAT IT DOES', p['does']))
    faqs = [
        ('What does it not do?', [p['doesNot']]),
        ('What do I need before buying?', ['You need these accounts:', p['accounts'], 'For the download and guided setup options you also need n8n 1.x, self-hosted or n8n Cloud.']),
        ('What can I customize?', ['A guided setup asks for these settings, with no workflow code to edit:', p['customization']]),
        ('What does the license cover?', ['A single-business license: use the automation in your own business. Reselling or redistributing the workflow is not allowed.']),
        ('How do updates and support work?', ['Updates are included and never silently break your installation. Email support covers installation questions; guided setup includes configuration assistance.']),
        ('How do I pay?', [f'Order by email at {EMAIL} or call +216 97 017 061 / +33 6 24 97 99 41. One-time and monthly fees are shown separately, and access is granted once payment is confirmed.']),
        ('Are there reviews?', ['Not yet. Only verified buyers of this automation can leave a review.']),
    ]
    s = sub(s, r'(<div class="tabs-content-info__w">)<div data-accordion-close-siblings.*?</ul></div>(</div></div>)',
            lambda m: m.group(1) + accordion(faqs, black=True) + m.group(2))
    s = rep(s, '<h2 class="service__h">FAQ</h2>', '<h2 class="service__h">FAQ</h2>')
    write(f'products/{p["slug"]}.html', chrome(s, f'{p["name"]} | Ranime Jemal Agency', p['summary'], f'{p["slug"]}.html', px=px))


for p in PRODUCTS:
    product_page(p)

# Old product.html?p=<slug> links keep working.
write('product.html', '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Ranime Jemal Agency</title>'
      '<meta name="robots" content="noindex"/><script>var p=new URLSearchParams(location.search).get("p")||"'
      + PRODUCTS[0]['slug'] + '";location.replace("products/"+encodeURIComponent(p)+".html");</script></head>'
      '<body><a href="explore.html">Explore automations</a></body></html>')
print('ok')

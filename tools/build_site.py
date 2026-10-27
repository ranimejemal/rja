"""Build the RJA site on top of the template's exported homepage markup.

Usage: python3 -I build_site.py <template index.html> <catalog.json> <svgs.json> <src dir> <out dir>
"""
import html, json, os, re, sys

TPL, CATALOG, SVGS, SRC, OUT = sys.argv[1:6]
orig = open(TPL).read()
cat = json.load(open(CATALOG))
svg = json.load(open(SVGS))
PRODUCTS = {p['slug']: p for p in cat['products']}
CAT_SLUG = {c['name']: c['slug'] for c in cat['categories']}

EMAIL = 'ranimejmal@gmail.com'
INSTA = 'https://www.instagram.com/ranimejemalagency/'
LOGO = open(os.path.join(OUT, 'assets/images/rja-logo.svg')).read()
e = html.escape


def norm(x):
    # Snippets are written with line breaks before tags for readability; the template has none.
    return x.replace('\n<', '<')


class Doc:
    def __init__(self, s):
        self.s = s

    def rep(self, old, new, count=1):
        old = norm(old)
        n = self.s.count(old)
        assert n == count, (n, old[:120])
        self.s = self.s.replace(old, new)

    def sub(self, pattern, new, count=1, flags=re.S):
        self.s, n = re.subn(pattern, new, self.s, flags=flags)
        assert n == count, (n, pattern[:120])

    def cut(self, start, end, new, keep_end=False):
        i = self.s.index(start)
        j = self.s.index(end, i)
        self.s = self.s[:i] + new + self.s[j if keep_end else j + len(end):]


def money(n):
    return '${:,}'.format(n)


# ---------------------------------------------------------------- head
def head(title, desc, canonical):
    d = Doc(orig[:orig.index('<body')])
    d.sub(r' data-wf-domain="[^"]*"', '')
    d.sub(r'<title>.*?</title>', '<title>' + e(title) + '</title>')
    d.sub(r'<link rel="alternate"[^>]*/>', '', count=3)
    d.sub(r'<meta content="[^"]*" name="description"/>', f'<meta content="{e(desc)}" name="description"/>')
    for prop in ['property="og:title"', 'name="twitter:title"']:
        d.sub(r'<meta content="[^"]*" ' + prop + '/>', f'<meta content="{e(title)}" {prop}/>')
    for prop in ['property="og:description"', 'name="twitter:description"']:
        d.sub(r'<meta content="[^"]*" ' + prop + '/>', f'<meta content="{e(desc)}" {prop}/>')
    d.sub(r'<meta content="[^"]*" property="og:image"/>', '<meta content="assets/images/rja-opengraph.jpg" property="og:image"/>')
    d.sub(r'<link href="[^"]*" rel="shortcut icon" type="image/x-icon"/>', '<link href="assets/images/rja-favicon.png" rel="shortcut icon" type="image/png"/>')
    d.sub(r'<link href="[^"]*" rel="apple-touch-icon"/>', '<link href="assets/images/rja-favicon.png" rel="apple-touch-icon"/>')
    d.sub(r'<link href="index.html" rel="canonical"/>', f'<link href="{canonical}" rel="canonical"/>')
    ld = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Ranime Jemal Agency",
        "description": "AI automation marketplace where creators sell reusable n8n workflows and businesses personalize them.",
        "logo": "assets/images/rja-logo-black.png",
        "email": EMAIL,
        "telephone": ["+216 97 017 061", "+33 6 24 97 99 41"],
        "sameAs": [INSTA],
    }
    d.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">' + json.dumps(ld) + '</script>')
    # Remove the template owner's analytics.
    d.sub(r'<script async="" src="https://www.googletagmanager.com/gtag/js[^"]*"></script><script type="text/javascript">window.dataLayer.*?</script>', '')
    d.rep('</head>', '<link rel="stylesheet" href="assets/css/rja.css"/></head>')
    return d.s


# ---------------------------------------------------------------- shared body parts
body = orig[orig.index('<body'):]
pre_intro = body[:body.index('<div data-w-id="39ae5e82-d18b-add9-0422-43a2da54cd59" class="intro">')]
intro = body[body.index('<div data-w-id="39ae5e82-d18b-add9-0422-43a2da54cd59" class="intro">'):body.index('<div class="page-wrapper">')]
scripts = body[body.index('</footer></div>') + len('</footer></div>'):]


def link_block(href, label):
    return (f'<a data-hover-scale="" data-underline-link="hover" href="{href}" class="link-block relative w-inline-block">'
            f'<span data-underline-link="target" class="chat-wrapper__span">{label}</span>'
            '<div class="link-selector"></div><div class="link-selector is--2"></div>'
            '<div class="link-selector is--3"></div><div class="link-selector is--4"></div></a>')


MENU = [('index.html', 'Home'), ('explore.html', 'Explore'), ('how-it-works.html', 'How it works'),
        ('sell.html', 'Sell'), ('index.html#contact', 'Contact')]


def header(current):
    # The template's own header and menu markup, rebranded.
    h = body[body.index('<div class="page-wrapper">'):body.index('<main class="main-wrapper">')]
    items = ''.join(
        f'<li class="menu-list__item"><a data-menu-toggle="close" data-scramble-hover="link" href="{hr}" '
        f'class="menu-list__link w-inline-block"><span data-scramble-hover="target">{t}</span></a></li>'
        for hr, t in MENU)
    h, n = re.subn(r'(<a href="index.html" aria-current="page" class="header-logo__wrapper[^"]*">)<svg.*?</svg>', lambda m: m.group(1) + LOGO, h, flags=re.S)
    assert n == 1
    h, n = re.subn(r'<div role="listitem" class="w-locales-item"><a[^>]*hreflang="es"[^>]*>Español</a></div>', '', h)
    assert n == 1
    h, n = re.subn(r'<ul class="menu-list">.*?</ul>', f'<ul class="menu-list">{items}</ul>', h, flags=re.S)
    assert n == 1
    return h


FOOTER = (
    '<footer class="footer"><div class="container"><div class="footer-inner"><div class="footer-left">'
    f'<p class="p-small">Ranime Jemal Agency • <a href="mailto:{EMAIL}?subject=Website%20Contact" data-underline-link="">{EMAIL}</a></p>'
    '<p class="p-small"><a href="tel:+21697017061" data-underline-link="">+216 97 017 061</a> • '
    '<a href="tel:+33624979941" data-underline-link="">+33 6 24 97 99 41</a></p>'
    '<p data-current-date="" class="p-small">Automate your business. © 20<span data-current-date-year="">26</span> Ranime Jemal Agency</p></div>'
    '<div class="footer-right"><div class="button-group"><div class="button-group">'
    f'<a aria-label="instagram" data-hover-scale="" href="{INSTA}" target="_blank" rel="noopener" class="icon-1x1-small w-inline-block">{svg["instagram"]}</a>'
    '</div></div><div class="button-group">'
    '<a data-underline-link="" href="how-it-works.html" class="p-tiny">How It Works</a>'
    '<a data-underline-link="" href="platform.html#rules" class="p-tiny">License &amp; Product Rules</a>'
    '</div></div></div></div></footer></div>')

# The chatbot sends its conversation by email instead of to the template's Webflow form handler.
chat_scripts = Doc(scripts)
chat_scripts.rep("Which company or studio do you work for?", "Which business do you work for?")
chat_scripts.rep("inputPlaceholder: 'Ex: Art Director'", "inputPlaceholder: 'Ex: Founder'")
chat_scripts.rep("Understood! Tell us in detail about your project. What is the *brief*?",
                 "Understood! Tell us what you want to automate: the apps you use, your budget and timeline.")
chat_scripts.rep("Describe your project (budget, timeline, goals, etc.)", "Describe what you want to automate...")
chat_scripts.rep('Press "Submit" for our team to review your request.', 'Press "Submit" to send your request by email.')
chat_scripts.rep("        $formElement.submit();\n", r"""        const lines = conversationFlow
            .filter(s => s.key !== 'submit')
            .map(s => s.key.replace('_', ' ') + ': ' + (formData[s.key] || ''));
        window.location.href = 'mailto:""" + EMAIL + r"""?subject=' +
            encodeURIComponent('Website enquiry from ' + (formData.name || '')) +
            '&body=' + encodeURIComponent(lines.join('\n'));
        $formElement.hide();
        $('.succes.w-form-done').show();
""")
chat_scripts = chat_scripts.s
# Pages without the chatbot drop its script (it expects the contact form to exist).
plain_scripts = re.sub(r'<script>\s*\$\(document\)\.ready\(function\(\) \{\s*// =+\s*// 1\. DETECCI.*?</script>', '', scripts, flags=re.S)
assert plain_scripts != scripts


def page(name, title, desc, main, extra_scripts='', with_intro=False, chat=False):
    s = head(title, desc, name) + pre_intro + (rja_intro if with_intro else '') + header(name)
    s += main + FOOTER + (chat_scripts if chat else plain_scripts)
    if extra_scripts:
        s = s.replace('</body>', extra_scripts + '</body>')
    open(os.path.join(OUT, name), 'w').write(s)
    print('wrote', name, len(s))


# ---------------------------------------------------------------- intro loader images
tiles = [f'assets/images/product-{p["slug"]}.jpg' for p in cat['products']]
cat_tiles = [f'assets/images/category-{c["slug"]}.jpg' for c in cat['categories']]
d = Doc(intro)
it = iter(tiles[:8])
d.sub(r'<img src="[^"]*" loading="eager" alt="[^"]*"/>',
      lambda m: f'<img src="{next(it)}" loading="eager" alt="Ranime Jemal Agency automation"/>', count=8)
rja_intro = d.s

# ---------------------------------------------------------------- homepage main
main = body[body.index('<main class="main-wrapper">'):body.index('<footer class="footer">')]
d = Doc(main)

# Hero
d.rep('<span class="hero-span_title">Experience</span>', '<span class="hero-span_title">Automate</span>')
d.rep('<span class="hero-span_title">the</span>', '<span class="hero-span_title">your</span>')
d.sub(r'<h1 class="hero-content__p">.*?</h1>',
      '<h1 class="hero-content__p"><span data-scramble-loop="">AI automation</span> marketplace where creators sell reusable '
      '<span data-scramble-loop="">n8n</span> workflows &amp; businesses <span data-scramble-loop="">personalize</span> '
      'them without writing <span data-scramble-loop="">code</span>.</h1>')
d.rep('<span class="hero-span_title">Impossible</span>', '<span class="hero-span_title">Business</span>')
d.rep('<span class="hero-blink__span">loading new reality', '<span class="hero-blink__span">loading automation')
d.rep('<span class="hero-deco__span">cinetica studio</span>', '<span class="hero-deco__span">ranime jemal agency</span>')
d.sub(r'<div class="hero-logo"><svg.*?</svg></div>', f'<div class="hero-logo">{LOGO}</div>')

# About
d.rep('<h2 data-scramble-loop="" class="heading-tag">(Who we are)</h2>', '<h2 data-scramble-loop="" class="heading-tag">(Product vision)</h2>')
d.rep('<span data-split="rolling" class="about-heading">Imagination driven technology built</span>',
      '<span data-split="rolling" class="about-heading">Build once, sell repeatedly</span>')
d.sub(r'(<p data-split="heading" class="p-large font-secondary">)We think beyond limits.*?</p>',
      r'\1We connect people who build automations with businesses that need them, making buying and configuring an automation as straightforward as buying a digital product.</p>')
carousel = iter((tiles + cat_tiles) * 2)
d.sub(r'<img loading="eager" src="[^"]*" alt="[^"]*" class="img-carousel__img"/>',
      lambda m: f'<img loading="eager" src="{next(carousel)}" alt="" class="img-carousel__img"/>', count=18)
d.sub(r'(<div class="about-grid__w"><p class="p-large font-secondary">)Cinetica Studio is.*?</p>',
      r'\1Ranime Jemal Agency is an AI automation marketplace where creators sell reusable n8n workflows and businesses personalize them for the way they work.</p>')
d.sub(r'<p class="p-medium">Founded in Mexico city.*?</p>',
      '<p class="p-medium">Founded by Ranime Jemal, born from the belief that no business should need to understand n8n, edit JSON, or build workflows from scratch. '
      '<span class="about__span">automation made simple.</span></p>')
d.rep('<h2 class="ds-title">We operate through two main creative divisions that work hand in hand:</h2>',
      '<h2 class="ds-title">The marketplace works for both sides, hand in hand:</h2>')
d.sub(r'(<span class="ds-num">1\.</span><p class="ds-text">).*?</p>',
      r'\1For sellers: automation creators publish an n8n workflow once, define exactly what buyers can customize, and sell it to many businesses, with optional setup and custom services.</p>')
d.sub(r'(<span class="ds-num">2\.</span><p class="ds-text">).*?</p>',
      r'\1For buyers: businesses find an automation for a specific problem, personalize it with clear settings, connect their tools, and activate it with step-by-step guidance.</p>')
d.sub(r'(<div data-step="2" class="ds-bottom"><p class="ds-text">).*?</p>',
      r'\1Behind both sides, the platform handles validation, licensing, secure credential connections and support. Every workflow is reviewed before it is published, credentials stay encrypted and separate from templates, and updates never silently break an installation.</p>')
about_imgs = iter(['about-sellers', 'about-buyers', 'about-platform'])
d.sub(r'<img src="[^"]*" loading="eager" data-step="(\d)" alt="" class="ds-mediaimg"/>',
      lambda m: f'<img src="assets/images/{next(about_imgs)}.jpg" loading="eager" data-step="{m.group(1)}" alt="" class="ds-mediaimg"/>', count=3)
d.sub(r'<p class="p-medium">Cinetica has developed.*?</p>',
      '<p class="p-medium">Ready-made automations across seven business categories (marketing, sales, customer support, e-commerce, productivity, finance and IT operations), each available as a download, guided setup, hosted automation or custom implementation.<br/></p>')
d.rep('<p class="super-txt">Since \n<span class="super__span">2019</span></p>', '<p class="super-txt">From <span class="super__span">$100</span></p>')
d.sub(r'<img sizes="100vw" srcset="[^"]*" alt="[^"]*" src="[^"]*" loading="lazy" class="perspective__img"/>',
      '<img alt="Ranime Jemal Agency" src="assets/images/rja-reel.jpg" loading="lazy" class="perspective__img"/>')
d.rep('At Cinetica Studio, the impossible is only the beginning.', 'At Ranime Jemal Agency, automation is only the beginning.')

# Clients -> supported apps
d.rep('<h2 data-scramble-loop="" class="heading-tag">(Our Clients)</h2>', '<h2 data-scramble-loop="" class="heading-tag">(Works with your tools)</h2>')
d.rep('If they dreamed it, we made it real. Ambitious brands choose us to build their most daring ideas.',
      'Connect the apps you already use. Every listing shows exactly which integrations are supported and tested.')
apps = ''.join(
    '<div data-logo-wall-item="" class="logo-wall__item"><div data-logo-wall-target-parent="" class="logo-wall__logo">'
    '<div class="logo-wall__logo-before"></div><div data-logo-wall-target="" class="logo-wall__logo-target">'
    f'<img width="100" loading="lazy" alt="{e(a)}" src="assets/images/app-{a.lower().replace(" ", "-")}.png" class="logo-wall__logo-img"/>'
    '</div></div></div>' for a in cat['apps'])
d.sub(r'(<div data-logo-wall-list="" class="logo-wall__list">)(?:<div data-logo-wall-item="".*?</div></div></div>)+',
      lambda m: m.group(1) + apps)

d.rep('<p class="horizontal-words_text">Innovation should be experienced, not explained</p>',
      '<p class="horizontal-words_text">Automation should be bought, not built from scratch</p>')

# Services -> categories
CAT_COPY = {
    'Marketing and social media': 'Schedule posts, write captions in your brand voice and monitor reviews, so your brand stays visible without the daily grind.',
    'Sales and lead generation': 'Capture, qualify, enrich and follow up on every lead automatically, then record it in your CRM.',
    'Customer support': 'Triage tickets, suggest answers from your FAQ and route every request to the right person.',
    'E-commerce': 'Sync orders and stock, recover abandoned carts and keep your customers informed.',
    'Productivity and administration': 'Turn meetings into summaries and tasks, and take repetitive admin off your plate.',
    'Finance and document processing': 'Extract data from invoices and receipts and record it where your accountant needs it.',
    'Cybersecurity and IT operations': 'Triage security alerts and monitor uptime, so your team hears about problems first.',
}


def service_items(names):
    out = ''
    for n in names:
        slug = CAT_SLUG[n]
        out += (
            '<div role="listitem" class="services-tab__item w-dyn-item">'
            f'<a href="explore.html?category={n.replace(" ", "+")}" class="service-link w-inline-block">'
            f'<div class="services-item__inner"><h4 class="services-tab__item-heading">{e(n)}</h4>'
            f'<p class="p-medium font-secondary">{e(CAT_COPY[n])}</p></div>'
            f'<div class="services-tab__svg-wrapper">{svg["service_arrow"]}</div>'
            '<div class="services-tab__item-border"></div>'
            f'<div class="services-img__wrapper"><img src="assets/images/category-{slug}.jpg" loading="lazy" alt=""/></div></a></div>')
    return out


d.rep('<h2 data-split="rolling" class="services-header__heading">(What we do)</h2>',
      '<h2 data-split="rolling" class="services-header__heading">(Categories)</h2>')
d.rep('<h3 data-split="rolling" class="services-tab__title txt-align-right">Immersive &amp;<br/>Interactive Experiences</h3>',
      '<h3 data-split="rolling" class="services-tab__title txt-align-right">Grow &amp;<br/>Sell More</h3>')
d.rep('<p class="services-tab__sub is--right">We turn audiences into \n<span data-scramble-loop="">participants</span>.</p>',
      '<p class="services-tab__sub is--right">Automations that turn enquiries into <span data-scramble-loop="">customers</span>.</p>')
d.rep('<h3 data-split="rolling" class="services-tab__title">3D Content<br/>&amp; Real-time production</h3>',
      '<h3 data-split="rolling" class="services-tab__title">Run &amp;<br/>Operate Smarter</h3>')
d.sub(r'<p data-split="heading" class="services-tab__sub txt-align-right">We build .*?innovation\.</p>',
      '<p data-split="heading" class="services-tab__sub txt-align-right">Automations that give you back <span data-scramble-loop="">hours</span> every week.</p>')
lists = list(re.finditer(r'(<div role="list" class="services-tab__list w-dyn-items">)(.*?)(</div></div></div><div class="service-marquee">)', d.s, re.S))
assert len(lists) == 2
groups = [list(CAT_COPY)[:4], list(CAT_COPY)[4:]]
for m, names in reversed(list(zip(lists, groups))):
    d.s = d.s[:m.start(2)] + service_items(names) + d.s[m.end(2):]
d.rep('Interaction changes everything. Once audiences participate, they become true fans.',
      'Find it. Personalize it. Connect your tools. Activate it.', count=2)
d.rep('Creativity evolves when powered by technology, and technology matters when it creates emotional connection.',
      'No n8n expertise needed. No JSON. No building from scratch.', count=2)

# Portfolio -> popular automations
d.rep('<h2 data-scramble-loop="" class="heading-tag">(Portfolio)</h2>', '<h2 data-scramble-loop="" class="heading-tag">(Popular automations)</h2>')
d.rep('<span data-split="rolling" class="portfolio-heading">Big ideas. Real results.</span>',
      '<span data-split="rolling" class="portfolio-heading">Ready-made. Fully yours.</span>')
d.sub(r'(<p data-split="heading" class="p-large font-secondary txt-align-center">)Cinetica Studio has.*?</p>',
      r'\1Every automation states what it does, what it does not do, which apps it supports and exactly what it costs, before you pay.</p>')
d.sub(r'<p class="p-small">Every project we deliver.*?</p>',
      '<p class="p-small">Choose download, guided setup, hosted automation or custom implementation. One-time and monthly prices are always shown separately.</p>')
d.sub(r'<p class="p-small">Our videos and digital content.*?</p>',
      '<p class="p-small">Every workflow is validated and reviewed before it is published, and your credentials are encrypted and never shared with sellers.</p>')


def work_item(p):
    return (
        '<div role="listitem" class="work-cms__item w-dyn-item">'
        f'<a data-scramble-hover="link" href="products/{p["slug"]}.html" class="work-item__link w-inline-block">'
        f'<div data-cursor="" class="work-item__img-wrapper"><img src="assets/images/product-{p["slug"]}.jpg" loading="eager" alt="" class="work-item__img"/></div>'
        f'<div class="work-item_content-wrapper"><h3 data-scramble-hover="target" class="p-medium">{e(p["name"])}</h3>'
        f'<div>{e(p["category"])}</div><div>From {money(p["prices"]["download"])}</div><div>{e(p["difficulty"])}</div>'
        f'<div class="work-item__svg-wrapper">{svg["work_arrow"]}</div></div></a></div>')


featured = [p for p in cat['products'] if p.get('featured')][:4]
d.sub(r'(<div role="list" class="work-cms__list w-dyn-items">).*?(</div></div><div class="work-page_link-wrapper">)',
      lambda m: m.group(1) + ''.join(work_item(p) for p in featured) + m.group(2))
d.rep('<a data-scramble-hover="link" href="portfolio.html" class="button w-inline-block">\n<p data-scramble-hover="target" class="p-regular all-caps">A tour through our work</p></a>',
      '<a data-scramble-hover="link" href="explore.html" class="button w-inline-block"><p data-scramble-hover="target" class="p-regular all-caps">Explore all automations</p></a>')

# Process -> how it works
d.rep('<h2 data-scramble-loop="" class="heading-tag">(Our process)</h2>', '<h2 data-scramble-loop="" class="heading-tag">(How it works)</h2>')
d.sub(r'(<p data-split="heading" class="p-large font-secondary">)Powered by IMMERGE.*?</p>',
      r'\1From search to a working automation in five steps: no workflow code, no JSON, no building from scratch.</p>')
for old, new in [('Imagine', 'Discover'), ('Invent', 'Inspect'), ('Illuminate', 'Purchase'), ('Integrate', 'Customize'), ('Impact', 'Activate')]:
    d.rep(f'<h3 class="process-list__heading">{old}</h3>', f'<h3 class="process-list__heading">{new}</h3>')
steps = [
    'Search by problem, category, use case or app, and filter by price and difficulty to find the automation you need.',
    'See the demo, example input and output, supported integrations, requirements, limitations and the full price before paying.',
    'Pick download, guided setup, hosted or custom implementation. Access is granted once payment is confirmed.',
    'A guided wizard collects your business profile, capabilities, connected apps and business rules, with no code required.',
    'Send a test input, review the output, and activate once every required integration and check has passed.',
]
step_it = iter(steps)
d.sub(r'(<li class="process-list_item is--right"><p class="p-tiny">).*?(</p></li>)', lambda m: m.group(1) + e(next(step_it)) + m.group(2), count=5)
d.sub(r'<img src="[^"]*cinetica__gif.gif" loading="lazy" alt="[^"]*" class="process-gif"/>',
      '<img src="assets/images/rja-opengraph.jpg" loading="lazy" alt="Ranime Jemal Agency logo" class="process-gif"/>')

# Reel: no video, keep the scaling visual
d.rep('<h3 data-split="rolling" class="scaling-element__heading">The future of communication is not flat. It is interactive, immersive and alive.</h3>',
      '<h3 data-split="rolling" class="scaling-element__heading">Buying an automation should be as simple as buying a digital product.</h3>')
d.rep(' data-vimeo-lightbox-id="1143943088"', '', count=2)
d.rep(' data-vimeo-lightbox-control="open"', '', count=2)
d.sub(r'<div class="vimeo-lightbox__btn is--placeholder"><svg.*?</svg></div>', '')
d.sub(r'<img src="[^"]*cinetica_placeholder[^"]*" data-vimeo-lightbox-placeholder="" alt="" sizes="100vw" loading="lazy" srcset="[^"]*"/>',
      '<img src="assets/images/rja-reel.jpg" alt="" loading="lazy"/>')
d.sub(r'<img class="vimeo-lightbox__btn-placeholder" src="[^"]*" data-vimeo-lightbox-placeholder="" alt="" sizes="100vw" loading="lazy" srcset="[^"]*"/>',
      '<img class="vimeo-lightbox__btn-placeholder" src="assets/images/rja-reel.jpg" alt="" loading="lazy"/>')

# Contact
d.rep('<p class="marquee-css__item-p">We are ready when you are</p>', '<p class="marquee-css__item-p">Ready to automate? Let&#x27;s talk</p>', count=2)
d.rep('<p class="chat-wrapper__span">To: \n<span data-scramble-loop="">Cinetica</span></p>',
      '<p class="chat-wrapper__span">To: <span data-scramble-loop="">Ranime Jemal Agency</span></p>')
d.rep('mailto:info@cinetica.studio?subject=Website%20Contact', f'mailto:{EMAIL}?subject=Website%20Contact')
d.rep('<span data-underline-link="target" class="chat-wrapper__span">info@cinetica.studio</span>',
      f'<span data-underline-link="target" class="chat-wrapper__span">{EMAIL}</span>')
d.rep("<div>Hello there! I&#x27;m Cinetica&#x27;s AI Assistant.👋🏾</div>",
      "<div>Hello there! I&#x27;m the Ranime Jemal Agency assistant. 👋🏾</div>")
for value, old_label, new_value, new_label in [
    ('interactive', 'Interactive &amp; Immersive Experiences', 'buy', 'Buy an automation'),
    ('motion_capture', 'Motion Capture', 'guided_setup', 'Guided setup'),
    ('animated_content', 'Animated Content', 'hosted', 'Hosted automation'),
    ('virtual_production', 'Virtual Production', 'custom', 'Custom implementation'),
    ('careers', 'Careers', 'sell', 'Sell an automation'),
]:
    d.rep(f'value="{value}"/>', f'value="{new_value}"/>')
    d.sub(r'(class="rbl w-form-label">)' + re.escape(old_label) + '</span>', r'\g<1>' + new_label + '</span>')
d.rep('<div class="form-block w-form">', '<div class="form-block">')
d.sub(r' data-wf-page-id="[^"]*" data-wf-element-id="[^"]*"', '')
d.rep('<div>Thank you! Your submission has been received!</div>',
      '<div>Thank you! Your email app will open with your message. Just press send.</div>')
d.rep('<section id="hero" class="hero-section">', '<section id="hero" class="hero-section">')
home_main = d.s

page('index.html', 'Ranime Jemal Agency | AI Automation Marketplace',
     'A marketplace where automation creators sell reusable n8n workflows and businesses personalize them. Automate your business without building everything from scratch.',
     home_main, with_intro=True, chat=True)

# ---------------------------------------------------------------- inner pages (now built by build_site2.py)
for name in [] and ['explore.html', 'product.html', 'how-it-works.html', 'sell.html', 'platform.html']:
    src = open(os.path.join(SRC, name)).read()
    meta = dict(re.findall(r'<!--(\w+): (.*?)-->\n', src))
    content = re.sub(r'<!--\w+: .*?-->\n', '', src)
    content = content.replace(' data-reveal', '')
    content = re.sub(r'class="([^"]*)"', lambda m: 'class="' + ' '.join(
        {'container': 'rja-container', 'button': 'rja-btn'}.get(c, c) for c in m.group(1).split()) + '"', content)
    main_html = f'<main class="main-wrapper rja-page">{content}</main>'
    extra = ''.join(f'<script src="assets/js/{s.strip()}"></script>' for s in meta.get('SCRIPTS', '').split(',') if s.strip())
    page(name, meta['TITLE'], meta['DESC'], main_html, extra_scripts=extra)

# ---------------------------------------------------------------- leftovers check
for f in os.listdir(OUT):
    if f.endswith('.html'):
        s = open(os.path.join(OUT, f)).read()
        left = {m for m in re.findall(r'[^"\s]*cinetica[^"\s]*', s, re.I)}
        allowed = {x for x in left if 'cinetica-studio.webflow.shared' in x or 'kr3ado/cinetica-studio' in x or '.json.txt' in x}
        rest = left - allowed
        assert not rest, (f, rest)
print('ok')

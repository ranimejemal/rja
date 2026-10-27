# Ranime Jemal Agency — AI Automation Marketplace

Website for a marketplace where automation creators sell reusable n8n workflows and businesses personalize them.

The pages are built on an exported Webflow template. Its stylesheet, animations (GSAP, Lenis, Unicorn Studio, Spline) and custom scripts are loaded from their original CDNs, so the site needs an internet connection to look right.

## Pages

| File | Content |
|---|---|
| `index.html` | Home: hero, product vision, supported apps, categories, popular automations, how it works, contact chatbot |
| `explore.html` | All automations with category, app, price and difficulty filters (template portfolio page) |
| `products/<slug>.html` | One page per automation with pricing and FAQ (template service page) |
| `how-it-works.html`, `sell.html`, `platform.html` | Tabbed FAQ-style pages (template FAQ page) |
| `product.html` | Redirects old `product.html?p=<slug>` links to `products/<slug>.html` |

Every page is generated from its matching template page and keeps that page's own scripts and
Webflow interaction bundle, so the animations behave exactly like the template.

## Products and prices

All products live in `PRODUCTS` in `assets/js/catalog.js`. Each entry sets its four prices in USD:
`download` and `guided` (one-time), `hosted` (monthly, on top of the download price), and `custom` (starting price).
The homepage "Popular automations" section shows four products marked `featured: true`.

The pages and the product and category images are generated from the catalog. After changing a product, rebuild
(`TEMPLATE` is the folder of the exported template, the one containing `index.html`, `faq.html` and `services/`):

```sh
node tools/catalog_data.js assets/js/catalog.js > /tmp/catalog.json
python3 tools/gen_images.py assets/images /tmp/catalog.json
python3 tools/svgs.py   # run from the folder that contains zip/ — writes svgs.json
python3 tools/build_site.py "$TEMPLATE/index.html" /tmp/catalog.json svgs.json src .
python3 tools/build_site2.py "$TEMPLATE" /tmp/catalog.json .
```

Inner-page text lives in `tools/content.py`.

## Brand

- Logo: `assets/images/rja-logo-white.png` / `rja-logo-black.png`, favicon `rja-favicon.png`
- Styles added on top of the template: `assets/css/rja.css`

## Contact

Email ranimejmal@gmail.com · +216 97 017 061 · +33 6 24 97 99 41 · [Instagram](https://www.instagram.com/ranimejemalagency/)

The homepage chatbot collects the visitor's details and opens their email app with a message addressed to ranimejmal@gmail.com.

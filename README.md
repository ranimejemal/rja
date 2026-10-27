# Ranime Jemal Agency — AI Automation Marketplace

Website for a marketplace where automation creators sell reusable n8n workflows and businesses personalize them.

The pages are built on an exported Webflow template. Its stylesheet, animations (GSAP, Lenis, Unicorn Studio, Spline) and custom scripts are loaded from their original CDNs, so the site needs an internet connection to look right.

## Pages

| File | Content |
|---|---|
| `index.html` | Home: hero, product vision, supported apps, categories, popular automations, how it works, contact chatbot |
| `explore.html` | Search and filters (price, supported apps, difficulty) |
| `product.html` | Product detail page, filled from the catalog via `product.html?p=<slug>` |
| `how-it-works.html` | Buyer journey, checkout flow, My Automations statuses, configuration wizard |
| `sell.html` | Seller journey, Customization Builder, pre-publish testing, seller dashboard |
| `platform.html` | Roles, administration, information architecture, product rules, launch plan |

## Products and prices

All products live in `PRODUCTS` in `assets/js/catalog.js`. Each entry sets its four prices in USD:
`download` and `guided` (one-time), `hosted` (monthly, on top of the download price), and `custom` (starting price).
The homepage "Popular automations" section shows four products marked `featured: true`.

Product and category images in `assets/images/` are generated from the catalog. After adding a product, regenerate them:

```sh
node tools/catalog_data.js assets/js/catalog.js > /tmp/catalog.json
python3 tools/gen_images.py assets/images /tmp/catalog.json
```

## Brand

- Logo: `assets/images/rja-logo-white.png` / `rja-logo-black.png`, favicon `rja-favicon.png`
- Styles added on top of the template: `assets/css/rja.css`

## Contact

Email ranimejmal@gmail.com · +216 97 017 061 · +33 6 24 97 99 41 · [Instagram](https://www.instagram.com/ranimejemalagency/)

The homepage chatbot collects the visitor's details and opens their email app with a message addressed to ranimejmal@gmail.com.

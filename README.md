# Ranime Jemal Agency — AI Automation Marketplace

Static website for a marketplace where automation creators sell reusable n8n workflows and businesses personalize them.

## Pages

| File | Content |
|---|---|
| `index.html` | Home: hero + search, product vision, categories, popular automations, how it works, seller recruitment, trust |
| `explore.html` | Search and filters (price, supported apps, difficulty) |
| `product.html` | Product detail template, filled from the catalog via `product.html?p=<slug>` |
| `how-it-works.html` | Buyer journey, checkout flow, My Automations statuses, configuration wizard |
| `sell.html` | Seller journey, Customization Builder, pre-publish testing, seller dashboard |
| `platform.html` | Roles, administration, information architecture, product rules, launch plan |

## Products and prices

All products live in `PRODUCTS` in `assets/js/catalog.js`. Each entry sets its four prices in USD:
`download` and `guided` (one-time), `hosted` (monthly, on top of the download price), and `custom` (starting price).
Products marked `featured: true` show under Popular automations on the homepage; the last three entries show as Recently published.

## Contact

Email ranimejmal@gmail.com · +216 97 017 061 · +33 6 24 97 99 41 · [Instagram](https://www.instagram.com/ranimejemalagency/)

## Running locally

Open `index.html` in a browser, or serve the folder with any static server (`python3 -m http.server`).

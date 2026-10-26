# Ranime Jemal Agency — AI Automation Marketplace

Static website for a marketplace where automation creators sell reusable n8n workflows and businesses personalize them.

## Pages

| File | Content |
|---|---|
| `index.html` | Home: hero + search, product vision, categories, popular automations, how it works, seller recruitment, trust |
| `explore.html` | Search and filters (price, delivery type, supported apps, difficulty, rating) |
| `product.html` | Example product: AI Lead Management Assistant, with purchase options |
| `how-it-works.html` | Buyer journey, checkout flow, My Automations statuses, configuration wizard |
| `sell.html` | Seller journey, Customization Builder, pre-publish testing, seller dashboard |
| `platform.html` | Roles, administration, information architecture, product rules, launch plan |

## Adding products

Add entries to `PRODUCTS` in `assets/js/catalog.js`. They appear on the Explore page and are searchable by name, category, use case, and integration.

## Running locally

Open `index.html` in a browser, or serve the folder with any static server (`python3 -m http.server`).

// Dump the catalog from assets/js/catalog.js as JSON for the build scripts.
const fs = require('fs');
const vm = require('vm');
const ctx = {
  document: { querySelector: () => null, querySelectorAll: () => [] },
  window: { location: { search: '' } },
  URLSearchParams
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8') + ';this.__out={PRODUCTS,CATEGORIES};', ctx);
const { PRODUCTS, CATEGORIES } = ctx.__out;
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const apps = [...new Set(PRODUCTS.flatMap(p => p.integrations))].sort();
process.stdout.write(JSON.stringify({
  products: PRODUCTS,
  categories: CATEGORIES.map(n => ({ name: n, slug: slug(n) })),
  apps
}, null, 1));

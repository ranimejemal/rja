// Product catalog and Explore page search/filtering.
// Add published listings to PRODUCTS. Leave a field null when the seller has not defined it.
var PRODUCTS = [
  {
    slug: "ai-lead-management-assistant",
    url: "product.html",
    name: "AI Lead Management Assistant",
    summary: "Receives customer enquiries, categorizes leads, drafts follow-up messages, and records information in a CRM.",
    category: "Sales and lead generation",
    useCases: ["lead management", "enquiries", "follow-up", "crm"],
    integrations: ["Email", "Website forms", "Google Sheets", "CRM"],
    deliveryTypes: ["Download", "Guided setup", "Hosted automation", "Custom implementation"],
    price: null,
    difficulty: null,
    rating: null,
    example: true
  }
];

var CATEGORIES = [
  "Marketing and social media",
  "Sales and lead generation",
  "Customer support",
  "E-commerce",
  "Productivity and administration",
  "Finance and document processing",
  "Cybersecurity and IT operations"
];

(function () {
  var root = document.querySelector("[data-explore]");
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var state = {
    q: params.get("q") || "",
    category: params.get("category") || "",
    delivery: [],
    apps: [],
    difficulty: "",
    price: "",
    rating: ""
  };

  var input = root.querySelector("[data-search-input]");
  var chipRow = root.querySelector("[data-category-chips]");
  var list = root.querySelector("[data-results]");
  var count = root.querySelector("[data-results-count]");
  input.value = state.q;

  // Category chips
  ["All"].concat(CATEGORIES).forEach(function (cat) {
    var b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = cat;
    var value = cat === "All" ? "" : cat;
    b.setAttribute("aria-pressed", String(state.category === value));
    b.addEventListener("click", function () {
      state.category = value;
      chipRow.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      render();
    });
    chipRow.appendChild(b);
  });

  input.addEventListener("input", function () { state.q = input.value; render(); });
  root.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); render(); });

  root.querySelectorAll("[data-filter]").forEach(function (el) {
    el.addEventListener("change", function () {
      var key = el.getAttribute("data-filter");
      if (el.type === "checkbox") {
        var arr = state[key];
        if (el.checked) arr.push(el.value);
        else arr.splice(arr.indexOf(el.value), 1);
      } else {
        state[key] = el.value;
      }
      render();
    });
  });

  function matches(p) {
    var q = state.q.trim().toLowerCase();
    if (q) {
      // Search covers product names, categories, use cases and supported integrations.
      var hay = [p.name, p.summary, p.category].concat(p.useCases, p.integrations).join(" ").toLowerCase();
      if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) === -1; })) return false;
    }
    if (state.category && p.category !== state.category) return false;
    if (state.delivery.length && !state.delivery.some(function (d) { return p.deliveryTypes.indexOf(d) !== -1; })) return false;
    if (state.apps.length && !state.apps.some(function (a) { return p.integrations.indexOf(a) !== -1; })) return false;
    if (state.difficulty && p.difficulty !== state.difficulty) return false;
    if (state.price && (p.price === null || !priceMatch(p.price, state.price))) return false;
    if (state.rating && (p.rating === null || p.rating < Number(state.rating))) return false;
    return true;
  }

  function priceMatch(price, band) {
    if (band === "free") return price === 0;
    if (band === "under-50") return price > 0 && price < 50;
    if (band === "50-200") return price >= 50 && price <= 200;
    if (band === "over-200") return price > 200;
    return true;
  }

  function card(p) {
    var a = document.createElement("a");
    a.className = "product-card";
    a.href = p.url;
    a.innerHTML =
      '<div class="product-card__visual"><div class="flow">' +
      '<span class="flow__node">Enquiry</span><span class="flow__arrow">→</span>' +
      '<span class="flow__node">Categorize</span><span class="flow__arrow">→</span>' +
      '<span class="flow__node">CRM</span></div></div>' +
      '<div class="product-card__body">' +
      '<div class="tags">' + (p.example ? '<span class="tag is--accent">Example product</span>' : "") +
      '<span class="tag">' + p.category + "</span></div>" +
      '<h3 class="h-s"></h3><p class="p-small muted"></p>' +
      '<div class="tags">' + p.integrations.map(function (i) { return '<span class="tag">' + i + "</span>"; }).join("") + "</div>" +
      "</div>";
    a.querySelector("h3").textContent = p.name;
    a.querySelector("p").textContent = p.summary;
    return a;
  }

  function render() {
    var results = PRODUCTS.filter(matches);
    list.innerHTML = "";
    count.textContent = results.length + (results.length === 1 ? " automation" : " automations");
    if (!results.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.gridColumn = "1 / -1";
      empty.innerHTML = '<span class="heading-tag">(No results)</span><p>No published automation matches these filters yet.</p>';
      list.appendChild(empty);
      return;
    }
    results.forEach(function (p) { list.appendChild(card(p)); });
  }

  render();
})();

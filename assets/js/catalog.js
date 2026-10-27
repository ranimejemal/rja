// Product catalog: Explore page search/filtering, homepage listings, and product detail pages.
// Prices are in USD. Each delivery option shows its own price; hosting is billed monthly.
var SELLER = {
  name: "Ranime Jemal Agency",
  email: "ranimejmal@gmail.com",
  instagram: "https://www.instagram.com/ranimejemalagency/"
};

var DELIVERY = {
  download: "Download",
  guided: "Guided setup",
  hosted: "Hosted automation",
  custom: "Custom implementation"
};

var PRODUCTS = [
  {
    slug: "ai-lead-management-assistant",
    name: "AI Lead Management Assistant",
    category: "Sales and lead generation",
    summary: "Receives customer enquiries, categorizes leads, drafts follow-up messages, and records information in a CRM.",
    problem: "Customer enquiries arrive from several channels and need to be sorted, answered, and recorded before leads go cold.",
    useCases: ["lead management", "enquiries", "follow-up", "crm"],
    integrations: ["Email", "Website forms", "Google Sheets", "HubSpot"],
    flow: ["Enquiry", "Categorize", "Draft reply", "CRM"],
    does: ["Categorizes enquiries", "Summarizes customer messages", "Drafts responses", "Creates CRM records", "Notifies team members"],
    doesNot: ["Send replies without the approval rules you configure", "Support CRMs other than those listed"],
    input: "A website form enquiry asking for a quote.",
    output: "A lead tagged “high priority — quote request”, a drafted reply in your brand voice, and a new CRM contact.",
    accounts: ["Email account (Gmail or IMAP/SMTP)", "HubSpot or Google Sheets", "OpenAI API key"],
    customization: ["Business name", "Response language", "Brand voice", "CRM integration", "Lead qualification threshold"],
    difficulty: "Intermediate",
    prices: { download: 149, guided: 299, hosted: 49, custom: 600 },
    featured: true
  },
  {
    slug: "lead-enrichment-qualification",
    name: "Lead Enrichment & Qualification",
    category: "Sales and lead generation",
    summary: "Enriches new leads with company details, scores them against your criteria, and routes qualified leads to the right salesperson.",
    problem: "Sales teams waste time researching and qualifying leads by hand.",
    useCases: ["lead scoring", "qualification", "enrichment", "routing"],
    integrations: ["HubSpot", "Google Sheets", "Email", "Slack"],
    flow: ["New lead", "Enrich", "Score", "Route"],
    does: ["Adds company and role details", "Scores leads against your rules", "Assigns an owner", "Alerts the team in Slack"],
    doesNot: ["Buy or scrape contact lists", "Contact leads automatically"],
    input: "A new lead with a name and work email.",
    output: "The lead with company size, industry, a score from 0–100, and an assigned owner.",
    accounts: ["HubSpot or Google Sheets", "Slack workspace", "OpenAI API key"],
    customization: ["Scoring criteria", "Qualification threshold", "Owner assignment rules", "Notification channel"],
    difficulty: "Intermediate",
    prices: { download: 189, guided: 349, hosted: 49, custom: 700 }
  },
  {
    slug: "social-media-content-scheduler",
    name: "Social Media Content Scheduler",
    category: "Marketing and social media",
    summary: "Turns a content calendar into ready-to-post captions and publishes them on schedule across your social accounts.",
    problem: "Posting consistently across platforms takes hours every week.",
    useCases: ["social media", "content calendar", "captions", "publishing"],
    integrations: ["Google Sheets", "Instagram", "Facebook", "LinkedIn"],
    flow: ["Calendar", "Write captions", "Approve", "Publish"],
    does: ["Reads your content calendar", "Drafts captions and hashtags in your brand voice", "Sends posts for approval", "Publishes at the scheduled time"],
    doesNot: ["Create images or videos", "Reply to comments or messages"],
    input: "A calendar row: topic, platform, date, image link.",
    output: "An approved caption with hashtags, published at the scheduled time.",
    accounts: ["Google account", "Meta Business account", "LinkedIn page", "OpenAI API key"],
    customization: ["Brand voice", "Posting language", "Hashtag rules", "Approval required (yes/no)"],
    difficulty: "Beginner",
    prices: { download: 129, guided: 259, hosted: 39, custom: 500 },
    featured: true
  },
  {
    slug: "review-reputation-monitor",
    name: "Review & Reputation Monitor",
    category: "Marketing and social media",
    summary: "Collects new customer reviews, flags negative ones, and drafts polite responses for your approval.",
    problem: "Unanswered reviews hurt your reputation, and checking every platform is tedious.",
    useCases: ["reviews", "reputation", "customer feedback"],
    integrations: ["Google Business Profile", "Email", "Slack"],
    flow: ["New review", "Sentiment", "Draft reply", "Alert"],
    does: ["Detects new reviews", "Classifies sentiment", "Drafts responses", "Alerts you about negative reviews"],
    doesNot: ["Post replies without approval", "Remove or hide reviews"],
    input: "A new 2-star Google review.",
    output: "A Slack alert with the review, its sentiment, and a suggested reply.",
    accounts: ["Google Business Profile", "Slack or email", "OpenAI API key"],
    customization: ["Business name", "Reply tone", "Alert threshold (stars)", "Notification channel"],
    difficulty: "Beginner",
    prices: { download: 109, guided: 219, hosted: 29, custom: 450 }
  },
  {
    slug: "customer-support-ticket-triage",
    name: "Customer Support Ticket Triage",
    category: "Customer support",
    summary: "Reads incoming support emails, categorizes and prioritizes them, suggests answers from your FAQ, and assigns them to your team.",
    problem: "Support inboxes fill up and urgent requests get lost among routine questions.",
    useCases: ["support", "tickets", "helpdesk", "faq"],
    integrations: ["Email", "Slack", "Google Sheets"],
    flow: ["Email", "Classify", "Suggest answer", "Assign"],
    does: ["Categorizes and prioritizes tickets", "Suggests answers from your FAQ", "Assigns tickets to team members", "Logs every ticket"],
    doesNot: ["Send answers without human approval", "Process refunds or account changes"],
    input: "A customer email: “My order arrived damaged.”",
    output: "Ticket tagged “Order issue — high priority”, assigned to support, with a suggested reply.",
    accounts: ["Email account", "Slack workspace", "Google account", "OpenAI API key"],
    customization: ["Ticket categories", "Priority rules", "FAQ source", "Team assignment"],
    difficulty: "Intermediate",
    prices: { download: 179, guided: 329, hosted: 49, custom: 650 },
    featured: true
  },
  {
    slug: "ecommerce-order-inventory-sync",
    name: "E-commerce Order & Inventory Sync",
    category: "E-commerce",
    summary: "Syncs new orders and stock levels to a spreadsheet, alerts you on low stock, and sends order confirmations.",
    problem: "Manually tracking orders and stock leads to overselling and missed restocks.",
    useCases: ["orders", "inventory", "stock", "shopify"],
    integrations: ["Shopify", "Google Sheets", "Email"],
    flow: ["Order", "Update stock", "Low-stock check", "Notify"],
    does: ["Records every order", "Updates stock levels", "Sends low-stock alerts", "Sends daily sales summaries"],
    doesNot: ["Reorder stock from suppliers", "Change prices in your store"],
    input: "A new Shopify order for 3 items.",
    output: "An order row in Google Sheets, updated stock counts, and an alert if any item is below threshold.",
    accounts: ["Shopify store", "Google account", "Email account"],
    customization: ["Low-stock threshold", "Summary schedule", "Notification email"],
    difficulty: "Intermediate",
    prices: { download: 199, guided: 379, hosted: 49, custom: 750 }
  },
  {
    slug: "abandoned-cart-recovery",
    name: "Abandoned Cart Recovery",
    category: "E-commerce",
    summary: "Sends personalized reminder emails to shoppers who left items in their cart.",
    problem: "Most online carts are abandoned before checkout.",
    useCases: ["abandoned cart", "recovery", "email marketing"],
    integrations: ["Shopify", "Email"],
    flow: ["Abandoned cart", "Wait", "Personalize", "Send"],
    does: ["Detects abandoned checkouts", "Waits a delay you choose", "Sends a personalized reminder", "Stops once the order is completed"],
    doesNot: ["Create discount codes automatically", "Email shoppers who did not consent to marketing"],
    input: "A checkout abandoned with 2 items.",
    output: "A reminder email listing the items with a link back to the cart.",
    accounts: ["Shopify store", "Email account"],
    customization: ["Reminder delay", "Email tone", "Number of reminders", "Store name"],
    difficulty: "Beginner",
    prices: { download: 139, guided: 269, hosted: 39, custom: 500 }
  },
  {
    slug: "meeting-notes-task-assistant",
    name: "Meeting Notes & Task Assistant",
    category: "Productivity and administration",
    summary: "Summarizes meeting transcripts, extracts action items, and creates tasks for each owner.",
    problem: "Decisions and action items from meetings get forgotten.",
    useCases: ["meetings", "notes", "tasks", "summary"],
    integrations: ["Google Drive", "Notion", "Slack"],
    flow: ["Transcript", "Summarize", "Extract tasks", "Share"],
    does: ["Summarizes transcripts", "Extracts decisions and action items", "Creates tasks in Notion", "Shares the summary in Slack"],
    doesNot: ["Record or transcribe meetings", "Join calls"],
    input: "A meeting transcript saved to Google Drive.",
    output: "A summary page in Notion, a task for each action item, and a Slack message to attendees.",
    accounts: ["Google account", "Notion workspace", "Slack workspace", "OpenAI API key"],
    customization: ["Summary length", "Language", "Task database", "Slack channel"],
    difficulty: "Beginner",
    prices: { download: 119, guided: 239, hosted: 29, custom: 450 }
  },
  {
    slug: "invoice-receipt-data-extraction",
    name: "Invoice & Receipt Data Extraction",
    category: "Finance and document processing",
    summary: "Extracts supplier, amounts, dates, and tax from invoices and receipts and records them in a spreadsheet.",
    problem: "Typing invoice data by hand is slow and error-prone.",
    useCases: ["invoices", "receipts", "accounting", "documents", "ocr"],
    integrations: ["Email", "Google Drive", "Google Sheets"],
    flow: ["Invoice", "Extract", "Validate", "Record"],
    does: ["Reads PDF and image invoices", "Extracts key fields", "Flags missing or suspicious values", "Records data in Google Sheets"],
    doesNot: ["Pay invoices", "Replace your accountant or file taxes"],
    input: "A PDF invoice emailed to your accounts inbox.",
    output: "A spreadsheet row with supplier, invoice number, date, subtotal, tax, and total.",
    accounts: ["Email account", "Google account", "OpenAI API key"],
    customization: ["Fields to extract", "Currency", "Validation rules", "Destination sheet"],
    difficulty: "Intermediate",
    prices: { download: 229, guided: 399, hosted: 59, custom: 800 },
    featured: true
  },
  {
    slug: "security-alert-triage-reporting",
    name: "Security Alert Triage & Reporting",
    category: "Cybersecurity and IT operations",
    summary: "Collects security alerts, removes duplicates, rates severity, and sends a clear summary to your IT team.",
    problem: "Alert fatigue makes it hard to spot the incidents that matter.",
    useCases: ["security", "alerts", "incident", "soc", "it"],
    integrations: ["Webhook", "Email", "Slack"],
    flow: ["Alert", "Deduplicate", "Rate severity", "Report"],
    does: ["Receives alerts by webhook or email", "Groups duplicates", "Rates severity with your rules", "Sends summaries and urgent alerts"],
    doesNot: ["Block traffic or change systems", "Replace a security team"],
    input: "Several alerts from your monitoring tool for the same host.",
    output: "One grouped incident rated “High”, posted to the IT Slack channel.",
    accounts: ["Monitoring tool with webhooks", "Slack workspace", "Email account"],
    customization: ["Severity rules", "Escalation contacts", "Summary schedule"],
    difficulty: "Advanced",
    prices: { download: 349, guided: 599, hosted: 79, custom: 1200 }
  },
  {
    slug: "website-uptime-incident-notifier",
    name: "Website Uptime & Incident Notifier",
    category: "Cybersecurity and IT operations",
    summary: "Checks your websites on a schedule and notifies your team when a site goes down or recovers.",
    problem: "Downtime often goes unnoticed until customers complain.",
    useCases: ["uptime", "monitoring", "downtime", "it"],
    integrations: ["Webhook", "Email", "Slack", "Telegram"],
    flow: ["Check", "Detect", "Notify", "Log"],
    does: ["Checks URLs on a schedule", "Detects downtime and slow responses", "Notifies your team", "Logs incidents"],
    doesNot: ["Fix the outage", "Monitor servers that aren't reachable from the internet"],
    input: "A list of website URLs.",
    output: "A Telegram message when a site is down, and another when it recovers.",
    accounts: ["Slack, Telegram, or email"],
    customization: ["URLs to check", "Check interval", "Response time limit", "Notification channel"],
    difficulty: "Beginner",
    prices: { download: 100, guided: 199, hosted: 19, custom: 400 }
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

function formatPrice(n) { return "$" + n.toLocaleString("en-US"); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function productCard(p) {
  var a = document.createElement("a");
  a.className = "product-card";
  a.href = "product.html?p=" + p.slug;
  a.innerHTML =
    '<div class="product-card__visual"><div class="flow">' +
    p.flow.slice(0, 3).map(function (n) { return '<span class="flow__node">' + escapeHtml(n) + "</span>"; }).join('<span class="flow__arrow">→</span>') +
    "</div></div>" +
    '<div class="product-card__body">' +
    '<div class="tags"><span class="tag">' + escapeHtml(p.category) + '</span><span class="tag">' + escapeHtml(p.difficulty) + "</span></div>" +
    '<h3 class="h-s">' + escapeHtml(p.name) + "</h3>" +
    '<p class="p-small muted">' + escapeHtml(p.summary) + "</p>" +
    '<div class="tags">' + p.integrations.map(function (i) { return '<span class="tag">' + escapeHtml(i) + "</span>"; }).join("") + "</div>" +
    '<div class="product-card__price"><span class="mono muted">From</span> <strong>' + formatPrice(p.prices.download) + "</strong></div>" +
    "</div>";
  return a;
}

// Homepage listings
(function () {
  var popular = document.querySelector("[data-popular]");
  if (popular) PRODUCTS.filter(function (p) { return p.featured; }).slice(0, 3).forEach(function (p) { popular.appendChild(productCard(p)); });
  var recent = document.querySelector("[data-recent]");
  if (recent) PRODUCTS.slice(-3).reverse().forEach(function (p) { recent.appendChild(productCard(p)); });
  document.querySelectorAll("[data-category-count]").forEach(function (el) {
    var cat = el.getAttribute("data-category-count");
    var n = PRODUCTS.filter(function (p) { return p.category === cat; }).length;
    el.textContent = n + (n === 1 ? " automation" : " automations") + " →";
  });
  document.querySelectorAll("[data-product-count]").forEach(function (el) { el.textContent = PRODUCTS.length; });
})();

// Product detail page
(function () {
  var root = document.querySelector("[data-product]");
  if (!root) return;
  var slug = new URLSearchParams(window.location.search).get("p");
  var p = PRODUCTS.filter(function (x) { return x.slug === slug; })[0] || PRODUCTS[0];

  document.title = p.name + " | Ranime Jemal Agency";
  var set = function (key, value) {
    root.querySelectorAll('[data-field="' + key + '"]').forEach(function (el) { el.textContent = value; });
  };
  var list = function (key, items) {
    var el = root.querySelector('[data-list="' + key + '"]');
    if (el) el.innerHTML = items.map(function (i) { return "<li>" + escapeHtml(i) + "</li>"; }).join("");
  };
  var tags = function (key, items) {
    var el = root.querySelector('[data-tags="' + key + '"]');
    if (el) el.innerHTML = items.map(function (i) { return '<span class="tag">' + escapeHtml(i) + "</span>"; }).join("");
  };

  set("name", p.name);
  set("category", p.category);
  set("summary", p.summary);
  set("problem", p.problem);
  set("input", p.input);
  set("output", p.output);
  set("workflow", p.flow.join(" → "));
  set("customization", p.customization.join(", "));
  set("accounts", p.accounts.join(", "));
  set("difficulty", p.difficulty);
  list("does", p.does);
  list("doesNot", p.doesNot);
  tags("integrations", p.integrations);

  var crumb = root.querySelector("[data-category-link]");
  if (crumb) crumb.href = "explore.html?category=" + encodeURIComponent(p.category);

  var flow = root.querySelector("[data-flow]");
  if (flow) flow.innerHTML = p.flow.map(function (n) { return '<span class="flow__node">' + escapeHtml(n) + "</span>"; }).join('<span class="flow__arrow">→</span>');

  var priceLabels = {
    download: formatPrice(p.prices.download) + " one-time",
    guided: formatPrice(p.prices.guided) + " one-time",
    hosted: formatPrice(p.prices.download) + " + " + formatPrice(p.prices.hosted) + "/month",
    custom: "From " + formatPrice(p.prices.custom)
  };
  Object.keys(priceLabels).forEach(function (k) { set("price-" + k, priceLabels[k]); });

  var total = root.querySelector("[data-total]");
  var contact = root.querySelector("[data-buy]");
  var update = function () {
    var checked = root.querySelector('input[name="delivery"]:checked');
    var k = checked ? checked.value : "download";
    total.textContent = priceLabels[k];
    var subject = "Order: " + p.name + " (" + DELIVERY[k] + ")";
    contact.href = "mailto:" + SELLER.email + "?subject=" + encodeURIComponent(subject);
  };
  root.querySelectorAll('input[name="delivery"]').forEach(function (r) { r.addEventListener("change", update); });
  update();
})();

// Explore page
(function () {
  var root = document.querySelector("[data-explore]");
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var state = { q: params.get("q") || "", category: params.get("category") || "", apps: [], difficulty: "", price: "" };

  var input = root.querySelector("[data-search-input]");
  var chipRow = root.querySelector("[data-category-chips]");
  var appsBox = root.querySelector("[data-apps]");
  var list = root.querySelector("[data-results]");
  var count = root.querySelector("[data-results-count]");
  input.value = state.q;

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

  // Supported apps come from the catalog itself
  var apps = [];
  PRODUCTS.forEach(function (p) { p.integrations.forEach(function (i) { if (apps.indexOf(i) === -1) apps.push(i); }); });
  apps.sort().forEach(function (app) {
    var label = document.createElement("label");
    label.className = "check";
    label.innerHTML = '<input type="checkbox" data-filter="apps"> ';
    label.querySelector("input").value = app;
    label.appendChild(document.createTextNode(app));
    appsBox.appendChild(label);
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

  function priceMatch(price, band) {
    if (band === "100-150") return price >= 100 && price <= 150;
    if (band === "150-250") return price > 150 && price <= 250;
    if (band === "over-250") return price > 250;
    return true;
  }

  function matches(p) {
    var q = state.q.trim().toLowerCase();
    if (q) {
      // Search covers product names, categories, use cases and supported integrations.
      var hay = [p.name, p.summary, p.category].concat(p.useCases, p.integrations).join(" ").toLowerCase();
      if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) === -1; })) return false;
    }
    if (state.category && p.category !== state.category) return false;
    if (state.apps.length && !state.apps.some(function (a) { return p.integrations.indexOf(a) !== -1; })) return false;
    if (state.difficulty && p.difficulty !== state.difficulty) return false;
    if (state.price && !priceMatch(p.prices.download, state.price)) return false;
    return true;
  }

  function render() {
    var results = PRODUCTS.filter(matches);
    list.innerHTML = "";
    count.textContent = results.length + (results.length === 1 ? " automation" : " automations");
    if (!results.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.gridColumn = "1 / -1";
      empty.innerHTML = '<span class="heading-tag">(No results)</span><p>No automation matches these filters. Need something custom?</p>' +
        '<a class="button is--outline" href="mailto:' + SELLER.email + '?subject=Custom%20automation%20request">Request a custom automation</a>';
      list.appendChild(empty);
      return;
    }
    results.forEach(function (p) { list.appendChild(productCard(p)); });
  }

  render();
})();

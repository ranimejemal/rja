// Business discovery: the questions a new customer answers about their business, in plain language.
//
// The script adapts to earlier answers (a shop is asked about its online shop, examples follow the industry,
// apps already mentioned are pre-ticked), skips what does not apply, and never asks for passwords or keys:
// answers that look like a secret are refused. Pure code with no AI, so it is predictable, free and testable.
// Phase 3 (the AI Business Architect) reads the Business Profile built at the end (buildProfile).

export type Option = { value: string; label: string };
export type Answers = Record<string, unknown>;

type Base = {
  id: string;
  title: (a: Answers) => string;
  help?: (a: Answers) => string;
  optional?: boolean;
  showIf?: (a: Answers) => boolean;
};
export type Question =
  | (Base & { kind: "text" | "long"; placeholder?: (a: Answers) => string; max: number })
  | (Base & { kind: "choice"; options: (a: Answers) => Option[] })
  | (Base & { kind: "multi"; options: (a: Answers) => Option[]; prefill?: (a: Answers) => string[]; maxPicks?: number });

const opt = (value: string, label: string): Option => ({ value, label });

export const INDUSTRIES: Option[] = [
  opt("ecommerce", "Online or physical shop"),
  opt("restaurant", "Restaurant, café or catering"),
  opt("health_beauty", "Health, beauty or wellness"),
  opt("services", "Services (agency, consulting, freelance)"),
  opt("real_estate", "Real estate"),
  opt("education", "Training or education"),
  opt("trades", "Trades and repairs"),
  opt("other", "Something else"),
];

export const APPS: Option[] = [
  opt("gmail", "Gmail"), opt("google_sheets", "Google Sheets"), opt("google_calendar", "Google Calendar"),
  opt("outlook", "Outlook / Microsoft 365"), opt("excel", "Excel"), opt("shopify", "Shopify"),
  opt("woocommerce", "WooCommerce"), opt("hubspot", "HubSpot"), opt("slack", "Slack"),
  opt("whatsapp", "WhatsApp Business"), opt("instagram_facebook", "Instagram / Facebook"), opt("telegram", "Telegram"),
  opt("notion", "Notion"), opt("other", "Other"),
];

// Words that reveal an app the customer already uses, so it is ticked for them on the apps question.
const APP_WORDS: [RegExp, string][] = [
  [/\bgmail\b/i, "gmail"], [/google ?sheets?|spreadsheet/i, "google_sheets"], [/google ?calendar/i, "google_calendar"],
  [/outlook|microsoft 365|office 365/i, "outlook"], [/\bexcel\b/i, "excel"], [/shopify/i, "shopify"],
  [/woo ?commerce|wordpress shop/i, "woocommerce"], [/hubspot/i, "hubspot"], [/\bslack\b/i, "slack"],
  [/whats ?app/i, "whatsapp"], [/instagram|facebook|\bmeta\b/i, "instagram_facebook"], [/telegram/i, "telegram"], [/notion/i, "notion"],
];

export function detectApps(text: string): string[] {
  return [...new Set(APP_WORDS.filter(([re]) => re.test(text)).map(([, id]) => id))];
}

const str = (a: Answers, k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
const list = (a: Answers, k: string) => (Array.isArray(a[k]) ? (a[k] as string[]) : []);
const industry = (a: Answers) => str(a, "industry");
const allText = (a: Answers) => ["offer", "problem", "apps_other"].map((k) => str(a, k)).join(" ");
const sellsOnline = (a: Answers) => industry(a) === "ecommerce" || str(a, "sells_online") === "yes";

const OFFER_EXAMPLES: Record<string, string> = {
  ecommerce: "e.g. “Handmade leather bags, sold on our website and in our shop in Tunis.”",
  restaurant: "e.g. “A family pizzeria with dine-in, takeaway and delivery.”",
  health_beauty: "e.g. “A beauty salon: haircuts, nails and skin care, by appointment.”",
  services: "e.g. “We build websites and run social media for small businesses.”",
  real_estate: "e.g. “We rent and sell apartments in Sousse.”",
  education: "e.g. “English courses for adults, online and in class.”",
  trades: "e.g. “Plumbing and heating repairs for homes.”",
};

const TASKS: Option[] = [
  opt("answer_messages", "Answering the same customer questions"),
  opt("follow_up_leads", "Following up with people who showed interest"),
  opt("bookings", "Booking and confirming appointments"),
  opt("orders_stock", "Handling orders and checking stock"),
  opt("abandoned_carts", "Customers who leave without paying"),
  opt("invoices", "Invoices, receipts and bookkeeping"),
  opt("social_posts", "Writing and posting on social media"),
  opt("reviews", "Watching and answering reviews"),
  opt("support_tickets", "Sorting support requests"),
  opt("meeting_notes", "Meeting notes and to-do lists"),
  opt("data_entry", "Copying information between apps"),
  opt("security", "Website security and suspicious emails"),
];
// Most relevant tasks first for each kind of business.
const TASK_ORDER: Record<string, string[]> = {
  ecommerce: ["orders_stock", "abandoned_carts", "answer_messages", "reviews", "social_posts"],
  restaurant: ["bookings", "reviews", "answer_messages", "social_posts"],
  health_beauty: ["bookings", "answer_messages", "reviews", "social_posts"],
  services: ["follow_up_leads", "answer_messages", "invoices", "meeting_notes"],
  real_estate: ["follow_up_leads", "answer_messages", "bookings"],
  education: ["answer_messages", "bookings", "follow_up_leads"],
  trades: ["bookings", "answer_messages", "invoices", "reviews"],
};

export const QUESTIONS: Question[] = [
  {
    id: "business_name", kind: "text", max: 120,
    title: () => "Let’s start simple: what is your business called?",
    placeholder: () => "e.g. Maison Lina",
  },
  {
    id: "industry", kind: "choice",
    title: (a) => `Which of these is closest to ${str(a, "business_name") || "your business"}?`,
    options: () => INDUSTRIES,
  },
  {
    id: "offer", kind: "long", max: 600,
    title: () => "In a sentence or two, what do you sell?",
    help: (a) => OFFER_EXAMPLES[industry(a)] ?? "e.g. “Accounting services for small shops and restaurants.”",
  },
  {
    id: "size", kind: "choice",
    title: () => "How many people work in the business, including you?",
    options: () => [opt("1", "Just me"), opt("2-5", "2 to 5"), opt("6-20", "6 to 20"), opt("21-100", "21 to 100"), opt("100+", "More than 100")],
  },
  {
    id: "channels", kind: "multi",
    title: () => "How do customers usually reach you?",
    help: () => "Tick all that apply.",
    options: () => [
      opt("email", "Email"), opt("phone", "Phone calls"), opt("whatsapp", "WhatsApp"), opt("social", "Instagram or Facebook"),
      opt("website", "A form or chat on my website"), opt("in_person", "In person"),
    ],
  },
  {
    id: "sells_online", kind: "choice",
    title: () => "Do customers buy or book online?",
    options: () => [opt("yes", "Yes"), opt("no", "No, not yet")],
    showIf: (a) => industry(a) !== "ecommerce" && industry(a) !== "",
  },
  {
    id: "shop_platform", kind: "choice",
    title: () => "Which tool runs your online shop or bookings?",
    options: () => [opt("shopify", "Shopify"), opt("woocommerce", "WooCommerce (WordPress)"), opt("other", "Another tool"), opt("none", "I don’t have one yet")],
    showIf: sellsOnline,
  },
  {
    id: "apps", kind: "multi",
    title: () => "Which apps do you already use every day?",
    help: () => "We ticked the ones you mentioned. Change anything that isn’t right.",
    options: () => APPS,
    prefill: (a) => {
      const shop = str(a, "shop_platform");
      const fromShop = shop === "shopify" || shop === "woocommerce" ? [shop] : [];
      const fromChannels = list(a, "channels").includes("whatsapp") ? ["whatsapp"] : [];
      return [...new Set([...detectApps(allText(a)), ...fromShop, ...fromChannels])];
    },
  },
  {
    id: "apps_other", kind: "text", max: 200, optional: true,
    title: () => "Which other apps?",
    placeholder: () => "e.g. Odoo, Calendly, Canva",
    showIf: (a) => list(a, "apps").includes("other"),
  },
  {
    id: "time_sinks", kind: "multi", maxPicks: 5,
    title: () => "Which tasks take most of your time?",
    help: () => "Pick up to five. These are the first things we look at.",
    options: (a) => {
      const first = TASK_ORDER[industry(a)] ?? [];
      return [...TASKS].sort((x, y) => rank(first, x.value) - rank(first, y.value));
    },
  },
  {
    id: "hours", kind: "choice",
    title: () => "Roughly how many hours a week go into those tasks?",
    help: () => "A guess is fine. It helps us suggest what is worth automating first.",
    options: () => [opt("<2", "Less than 2"), opt("2-5", "2 to 5"), opt("5-10", "5 to 10"), opt("10-20", "10 to 20"), opt("20+", "More than 20")],
  },
  {
    id: "problem", kind: "long", max: 1000,
    title: () => "What would you most like to fix first?",
    help: (a) => problemExample(list(a, "time_sinks")[0]),
  },
  {
    id: "goal", kind: "choice",
    title: () => "What matters most for the next six months?",
    options: () => [
      opt("more_customers", "Win more customers"), opt("faster_answers", "Answer customers faster"), opt("save_time", "Save my team’s time"),
      opt("fewer_mistakes", "Make fewer mistakes"), opt("security", "Protect the business and its data"),
    ],
  },
  {
    id: "involvement", kind: "choice",
    title: () => "How much should automations do on their own?",
    help: () => "You can change this later, for each automation.",
    options: () => [
      opt("approve_all", "Prepare everything, but ask me before anything is sent or changed"),
      opt("approve_important", "Handle routine work, and ask me before important actions"),
      opt("autonomous", "Do the work and tell me afterwards"),
    ],
  },
  {
    id: "never_automate", kind: "long", max: 600, optional: true,
    title: () => "Is there anything an automation must never do?",
    help: () => "Optional. e.g. “Never give refunds” or “Never answer complaints without me”.",
  },
];

const rank = (order: string[], v: string) => (order.includes(v) ? order.indexOf(v) : 99);

function problemExample(task: string | undefined) {
  const ex: Record<string, string> = {
    answer_messages: "e.g. “I answer the same 10 questions on WhatsApp every day.”",
    follow_up_leads: "e.g. “People ask for a price and I forget to follow up.”",
    bookings: "e.g. “Clients book by phone and I write everything in a notebook.”",
    orders_stock: "e.g. “I find out too late that a product is out of stock.”",
    abandoned_carts: "e.g. “Many people add to cart and never pay.”",
    invoices: "e.g. “I type every supplier invoice into a spreadsheet by hand.”",
    social_posts: "e.g. “I never find time to post regularly.”",
  };
  return (task && ex[task]) || "e.g. “We lose track of customer requests between email and WhatsApp.”";
}

// ---------------------------------------------------------------- flow

export const visibleQuestions = (a: Answers) => QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
export const isAnswered = (a: Answers, q: Question) => a[q.id] !== undefined;

/** The next question to ask, or null when everything that applies is answered. */
export function nextQuestion(a: Answers): Question | null {
  return visibleQuestions(a).find((q) => !isAnswered(a, q)) ?? null;
}

export function progress(a: Answers) {
  const v = visibleQuestions(a);
  return { done: v.filter((q) => isAnswered(a, q)).length, total: v.length };
}

export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id) ?? null;

/** The options of a choice question ([] for text questions). */
export function optionsOf(q: Question, a: Answers): Option[] {
  return q.kind === "choice" || q.kind === "multi" ? q.options(a) : [];
}

// ---------------------------------------------------------------- answers

// Passwords, API keys, tokens and card numbers must never be typed into the profile.
const SECRET_PATTERNS = [
  /\b(sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{30,}|xox[abp]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{20,}|shpat_[a-f0-9]{20,}|n8n_api_[A-Za-z0-9]{16,})\b/,
  /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/,
  /\b(password|passwd|mot de passe|mdp|pwd)\s*[:=]\s*\S+/i,
];
export function looksSecret(text: string) {
  if (SECRET_PATTERNS.some((r) => r.test(text))) return true;
  // A card number: 13 to 19 digits (spaces or dashes allowed) that pass the Luhn check.
  for (const m of text.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) if (luhn(m[0].replace(/\D/g, ""))) return true;
  return false;
}
function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

export const SECRET_REFUSED = "Please don’t share passwords, keys or card numbers here. We never need them: apps are connected later with a secure sign-in.";

/** Checks one answer against its question. Text is trimmed and capped; choices must be offered options. */
export function validateAnswer(q: Question, raw: unknown, a: Answers): { ok: true; value: unknown } | { ok: false; error: string } {
  if (q.kind === "text" || q.kind === "long") {
    const v = typeof raw === "string" ? raw.replace(/\s+\n/g, "\n").trim() : "";
    if (!v && !q.optional) return { ok: false, error: "Please write a short answer (a few words is enough)." };
    if (v.length > q.max) return { ok: false, error: `Please keep it under ${q.max} characters.` };
    if (looksSecret(v)) return { ok: false, error: SECRET_REFUSED };
    return { ok: true, value: v };
  }
  const allowed = new Set(optionsOf(q, a).map((o) => o.value));
  if (q.kind === "choice") {
    if (typeof raw !== "string" || !allowed.has(raw)) return { ok: false, error: "Please pick one of the options." };
    return { ok: true, value: raw };
  }
  const values = Array.isArray(raw) ? [...new Set(raw.filter((v): v is string => typeof v === "string"))] : [];
  if (values.some((v) => !allowed.has(v))) return { ok: false, error: "Please pick from the options." };
  if (!values.length && !q.optional) return { ok: false, error: "Please pick at least one." };
  const maxPicks = q.kind === "multi" ? q.maxPicks : undefined;
  if (maxPicks && values.length > maxPicks) return { ok: false, error: `Pick up to ${maxPicks}, the ones that matter most.` };
  return { ok: true, value: values };
}

/** How an answer reads back in the conversation. */
export function displayAnswer(q: Question, value: unknown, a: Answers): string {
  if (q.kind === "text" || q.kind === "long") return (value as string) || "(skipped)";
  const labels = new Map(optionsOf(q, a).map((o) => [o.value, o.label]));
  if (q.kind === "choice") return labels.get(value as string) ?? String(value);
  const vs = (value as string[]) ?? [];
  return vs.length ? vs.map((v) => labels.get(v) ?? v).join(", ") : "(none)";
}

// ---------------------------------------------------------------- profile

export type BusinessProfile = {
  name: string;
  industry: string;
  size: string;
  offer: string;
  channels: string[];
  sellsOnline: boolean;
  shopPlatform: string | null;
  apps: string[];
  otherApps: string;
  timeSinks: string[];
  hoursPerWeek: string;
  mainProblem: string;
  goal: string;
  involvement: string;
  neverAutomate: string;
};

/** The structured Business Profile, from the answers to the questions that apply (others are ignored). */
export function buildProfile(a: Answers): BusinessProfile {
  const shown = new Set(visibleQuestions(a).map((q) => q.id));
  const s = (k: string) => (shown.has(k) ? str(a, k) : "");
  const l = (k: string) => (shown.has(k) ? list(a, k) : []);
  return {
    name: s("business_name"), industry: s("industry"), size: s("size"), offer: s("offer"), channels: l("channels"),
    sellsOnline: sellsOnline(a), shopPlatform: s("shop_platform") || null, apps: l("apps"), otherApps: s("apps_other"),
    timeSinks: l("time_sinks"), hoursPerWeek: s("hours"), mainProblem: s("problem"), goal: s("goal"),
    involvement: s("involvement"), neverAutomate: s("never_automate"),
  };
}

// ---------------------------------------------------------------- first matches

// Ready-made automations that answer each task; shown when discovery is finished, before the AI architect exists.
const SOLUTIONS_BY_TASK: Record<string, string[]> = {
  answer_messages: ["ai-customer-service-chatbot", "customer-support-ticket-triage"],
  follow_up_leads: ["ai-lead-generation-follow-up", "ai-lead-management-assistant", "lead-enrichment-qualification"],
  bookings: ["ai-appointment-booking", "ai-voice-receptionist"],
  orders_stock: ["ecommerce-order-inventory-sync"],
  abandoned_carts: ["abandoned-cart-recovery"],
  invoices: ["invoice-receipt-data-extraction", "ai-document-processing"],
  social_posts: ["ai-social-media-automation", "social-media-content-scheduler"],
  reviews: ["review-reputation-monitor"],
  support_tickets: ["customer-support-ticket-triage"],
  meeting_notes: ["meeting-notes-task-assistant"],
  data_entry: ["ai-document-processing"],
  security: ["phishing-email-analyzer", "website-security-ssl-scanner", "website-uptime-incident-notifier"],
};

/** Automation slugs matching the tasks the customer picked, most relevant first, without duplicates. */
export function matchingSolutions(p: BusinessProfile, limit = 6): { slug: string; because: string }[] {
  const out: { slug: string; because: string }[] = [];
  for (const task of p.timeSinks) {
    for (const slug of SOLUTIONS_BY_TASK[task] ?? []) {
      if (!out.some((o) => o.slug === slug)) out.push({ slug, because: TASKS.find((t) => t.value === task)?.label ?? task });
    }
  }
  return out.slice(0, limit);
}

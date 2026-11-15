// RJA solutions: what the platform proposes to a business, described in business terms. Each solution says what
// it does, what data it reads, which permissions it needs, which actions always wait for the owner's approval,
// its limits and the costs outside RJA. Prices live in the database (`solutions`), so the agency can change them.
// The engine specification of each solution (its building blocks) is in lib/engine/specs.ts.

import type { BusinessProfile } from "@/lib/discovery";

export type SolutionId = "inventory_manager" | "cart_recovery" | "customer_assistant";

export type Solution = {
  id: SolutionId;
  name: string;
  tagline: string;
  does: string[];
  example: string;
  reads: string[];
  permissions: string[];
  needsApproval: string[];
  limits: string[];
  externalCosts: string;
  apps: string[]; // apps the customer must connect
  /** The tasks from discovery this solution answers. */
  tasks: string[];
  /** Milestone it ships in; until then customers can accept it and are told it is being built. */
  availability: "milestone_1" | "later";
};

export const SOLUTIONS: Solution[] = [
  {
    id: "inventory_manager",
    name: "Smart Inventory Manager",
    tagline: "Know when a product is running low, before you lose a sale.",
    does: [
      "Watches your Shopify stock as it changes",
      "Spots products that reach your minimum level",
      "Sends you one alert per product (no repeats until stock goes back up)",
      "Can also alert someone in your team",
    ],
    example: "“Your brown leather handbag is down to 2 units. Time to reorder?”",
    reads: ["Product names and stock levels in Shopify"],
    permissions: ["Shopify: read products and inventory"],
    needsApproval: ["Nothing: it only sends alerts to you and your team"],
    limits: ["Shopify only for now", "Alerts by email; WhatsApp alerts once WhatsApp is connected"],
    externalCosts: "None beyond your Shopify plan.",
    apps: ["shopify"],
    tasks: ["orders_stock"],
    availability: "milestone_1",
  },
  {
    id: "cart_recovery",
    name: "Smart Cart Recovery",
    tagline: "Give interested customers a second chance to finish their order.",
    does: [
      "Notices carts left without payment",
      "Waits the delay you choose (for example 1 hour)",
      "Checks the customer has not bought in the meantime and agreed to receive emails",
      "Sends the reminder you approved, once",
      "Counts the orders that come back",
    ],
    example: "“Sarah left the brown bag in her cart. After 1 hour she gets your reminder, in French.”",
    reads: ["Abandoned checkouts and orders in Shopify", "Whether the customer accepted marketing emails"],
    permissions: ["Shopify: read checkouts and orders"],
    needsApproval: ["The reminder text, before the first one is sent", "Any discount code"],
    limits: ["Only customers who accepted marketing emails are contacted", "One reminder per cart"],
    externalCosts: "None beyond your Shopify plan (reminders are sent by email).",
    apps: ["shopify"],
    tasks: ["abandoned_carts"],
    availability: "milestone_1",
  },
  {
    id: "customer_assistant",
    name: "AI Customer Assistant",
    tagline: "Answer the questions you get every day, even when you are busy.",
    does: [
      "Answers questions about products, stock and delivery from the information you approve",
      "Checks order status when the customer gives their order number",
      "Hands complicated or sensitive requests to you, with the conversation",
    ],
    example: "“Is the brown bag available?” → “Yes, 4 in stock. Delivery in Tunis takes 2 days.”",
    reads: ["Your products and stock", "Your delivery and payment policy text", "Order status, when asked"],
    permissions: ["Shopify: read products, inventory and orders", "WhatsApp Business: send and receive messages"],
    needsApproval: ["Its answers policy before it goes live", "Refunds, discounts and complaints always go to you"],
    limits: ["Answers only from your approved information; it says when it does not know"],
    externalCosts: "WhatsApp: Meta charges per conversation (see Meta’s current prices). AI usage is included up to your plan’s limit.",
    apps: ["shopify", "whatsapp"],
    tasks: ["answer_messages", "support_tickets"],
    availability: "later",
  },
];

export const solutionById = (id: string) => SOLUTIONS.find((s) => s.id === id) ?? null;

export type Candidate = { id: SolutionId; reasons: string[]; blockers: string[] };

const TASK_LABEL: Record<string, string> = {
  orders_stock: "handling orders and stock", abandoned_carts: "customers who leave without paying",
  answer_messages: "answering the same questions", support_tickets: "sorting support requests",
};

/**
 * The solutions that fit a business profile, most relevant first, with the evidence (what the customer said)
 * and what is missing before it can run. Deterministic: the AI only explains these, it cannot add others.
 */
export function candidatesFor(p: BusinessProfile): Candidate[] {
  const out: (Candidate & { score: number })[] = [];
  const text = `${p.mainProblem} ${p.offer}`.toLowerCase();
  for (const s of SOLUTIONS) {
    const reasons: string[] = [];
    let score = 0;
    for (const t of s.tasks) {
      const i = p.timeSinks.indexOf(t);
      if (i >= 0) { reasons.push(`You said ${TASK_LABEL[t] ?? t} takes a lot of your time.`); score += 10 - i; }
    }
    if (s.id === "inventory_manager" && /stock|inventory|sold out|out of stock|rupture/.test(text)) { reasons.push("You want to fix stock problems first."); score += 8; }
    if (s.id === "cart_recovery" && /cart|panier|checkout|abandon/.test(text)) { reasons.push("You mentioned abandoned carts."); score += 8; }
    if (s.id === "customer_assistant" && /question|whatsapp|message|answer|reply/.test(text)) { reasons.push("You want to answer customers faster."); score += 5; }
    if (s.id === "customer_assistant" && p.goal === "faster_answers") { reasons.push("Answering customers faster is your main goal."); score += 4; }
    if (!reasons.length) continue;
    const blockers: string[] = [];
    if (s.apps.includes("shopify") && p.shopPlatform !== "shopify") {
      blockers.push(p.shopPlatform === "woocommerce" ? "Works with Shopify first; WooCommerce comes later." : "Needs a Shopify shop.");
    }
    out.push({ id: s.id, reasons, blockers, score });
  }
  return out.sort((a, b) => b.score - a.score).map(({ score: _score, ...c }) => c);
}

/** The overview shown when no AI is available: built only from what the customer said. */
export function ruleOverview(p: BusinessProfile, c: Candidate[]): string {
  const name = p.name || "Your business";
  if (!c.length) return `${name}: none of our solutions matches what you told us yet. Tell us what you need and we’ll design it with you.`;
  const names = c.map((x) => solutionById(x.id)!.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${name} spends a lot of time on work that follows the same steps every day. Based on your answers, the best places to start are: ${list}.`;
}

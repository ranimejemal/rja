import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  QUESTIONS, buildProfile, detectApps, looksSecret, matchingSolutions, nextQuestion, progress, questionById, validateAnswer,
  visibleQuestions, type Answers,
} from "@/lib/discovery";

const q = (id: string) => questionById(id)!;

describe("discovery flow", () => {
  it("starts with the business name and asks one question at a time", () => {
    expect(nextQuestion({})!.id).toBe("business_name");
    expect(nextQuestion({ business_name: "Maison Lina" })!.id).toBe("industry");
  });

  it("adapts to the business: shops are asked about their shop, others first whether they sell online", () => {
    const shop: Answers = { industry: "ecommerce" };
    expect(visibleQuestions(shop).map((x) => x.id)).toContain("shop_platform");
    expect(visibleQuestions(shop).map((x) => x.id)).not.toContain("sells_online");
    const salon: Answers = { industry: "health_beauty" };
    expect(visibleQuestions(salon).map((x) => x.id)).toContain("sells_online");
    expect(visibleQuestions(salon).map((x) => x.id)).not.toContain("shop_platform");
    expect(visibleQuestions({ ...salon, sells_online: "yes" }).map((x) => x.id)).toContain("shop_platform");
  });

  it("does not ask again what the customer already said: apps they mentioned are pre-ticked", () => {
    const a: Answers = { offer: "We sell bags on Shopify and answer on WhatsApp", industry: "ecommerce", shop_platform: "shopify", channels: ["email"] };
    const apps = q("apps");
    expect(apps.kind === "multi" && apps.prefill!(a)).toEqual(expect.arrayContaining(["shopify", "whatsapp"]));
    expect(detectApps("our orders are in a google sheet and we use Outlook")).toEqual(["google_sheets", "outlook"]);
  });

  it("puts the tasks that matter for the business first", () => {
    const tasks = q("time_sinks");
    const first = (industry: string) => (tasks.kind === "multi" ? tasks.options({ industry })[0].value : "");
    expect(first("restaurant")).toBe("bookings");
    expect(first("ecommerce")).toBe("orders_stock");
  });

  it("counts progress over the questions that apply and finishes when all are answered", () => {
    const a: Answers = {};
    for (let next = nextQuestion(a); next; next = nextQuestion(a)) {
      a[next.id] = next.kind === "multi" ? [next.options(a)[0].value] : next.kind === "choice" ? next.options(a)[0].value : "x";
    }
    const p = progress(a);
    expect(p.done).toBe(p.total);
    expect(p.total).toBeLessThanOrEqual(QUESTIONS.length);
  });
});

describe("answers", () => {
  it("are trimmed, required unless optional, and capped", () => {
    expect(validateAnswer(q("business_name"), "  Maison Lina  ", {})).toEqual({ ok: true, value: "Maison Lina" });
    expect(validateAnswer(q("business_name"), "   ", {}).ok).toBe(false);
    expect(validateAnswer(q("never_automate"), "", {})).toEqual({ ok: true, value: "" });
    expect(validateAnswer(q("business_name"), "x".repeat(200), {}).ok).toBe(false);
  });

  it("must be one of the offered options", () => {
    expect(validateAnswer(q("industry"), "ecommerce", {}).ok).toBe(true);
    expect(validateAnswer(q("industry"), "<script>", {}).ok).toBe(false);
    expect(validateAnswer(q("channels"), ["email", "hacker"], {}).ok).toBe(false);
    expect(validateAnswer(q("time_sinks"), ["answer_messages", "bookings", "invoices", "reviews", "social_posts", "security"], {}).ok).toBe(false);
  });

  it("never take passwords, keys or card numbers", () => {
    for (const secret of ["my password: hunter22", "key sk-abcdefghijklmnopqrstuvwx", "AIzaSyA1234567890abcdefghijklmnopqrstu",
      "card 4242 4242 4242 4242", "mot de passe = azerty123"]) {
      expect(looksSecret(secret), secret).toBe(true);
      expect(validateAnswer(q("problem"), secret, {}).ok).toBe(false);
    }
    expect(looksSecret("We get about 40 orders a day, call 216 97 017 061")).toBe(false);
  });
});

describe("business profile", () => {
  it("is built only from the questions that apply", () => {
    const p = buildProfile({ business_name: "Salon Rose", industry: "health_beauty", sells_online: "no", shop_platform: "shopify", time_sinks: ["bookings"] });
    expect(p).toMatchObject({ name: "Salon Rose", industry: "health_beauty", sellsOnline: false, shopPlatform: null, timeSinks: ["bookings"] });
  });

  it("suggests existing automations for the chosen tasks", () => {
    const slugs = new Set(readdirSync(join(process.cwd(), "automations")).filter((d) => /^\d\d-/.test(d)).map((d) => d.slice(3)));
    const all = matchingSolutions(buildProfile({ time_sinks: QUESTIONS.find((x) => x.id === "time_sinks")!.kind === "multi"
      ? (QUESTIONS.find((x) => x.id === "time_sinks") as { options: (a: Answers) => { value: string }[] }).options({}).map((o) => o.value) : [] }), 100);
    for (const m of all) expect(slugs.has(m.slug), m.slug).toBe(true);
    expect(matchingSolutions(buildProfile({ time_sinks: ["bookings"] }))[0].slug).toBe("ai-appointment-booking");
  });
});
